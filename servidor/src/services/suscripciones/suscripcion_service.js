import { QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { env } from "../../configuracion_servidor/env.js";
import { Suscripcion, PagoSuscripcion, Rol, UsuarioRol, Usuario } from "../../models/index.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";
import { avisarSinEsperar, contactoDeUsuario } from "../common/avisos_service.js";
import { crearPreferencia, verificarPago } from "./mercadopago_service.js";
import { subirArchivoPrivado, eliminarArchivoPrivado, enlaceArchivoPrivado } from "../common/upload_service.js";
import { cobroConfig, transferenciaLista } from "../../../../cobro_config.js";
import { tienePermiso } from "../../../../permisos_config.js";
import {
  DIAS_PRUEBA, DIAS_POR_PAGO, DIAS_AVISO, hoyArgentina, sumarDias, vencimientoDePrueba,
  nuevoVencimiento, calcularEstado, evaluarPagoMercadoPago, validarAvisoTransferencia,
} from "./suscripcion_reglas.js";

const error = (mensaje, status, codigo) => Object.assign(new Error(mensaje), { status, codigo });

const mercadoPagoActivo = () => cobroConfig.mercadoPagoHabilitado && env.PRECIO_SUSCRIPCION_MENSUAL > 0 && Boolean(env.MP_ACCESS_TOKEN);

/** Cómo puede pagar hoy un organizador: transferencia null = datos bancarios sin cargar. */
const mediosDePago = () => ({
  mercadopago: mercadoPagoActivo(),
  transferencia: transferenciaLista() ? cobroConfig.transferencia : null,
});

function formatear(suscripcion, hoy = hoyArgentina()) {
  const { fecha_inicio, fecha_vencimiento, en_prueba } = suscripcion;
  return {
    es_organizador: true,
    fecha_inicio, fecha_vencimiento, en_prueba,
    ...calcularEstado({ fecha_vencimiento, en_prueba }, hoy),
    precio_mensual: env.PRECIO_SUSCRIPCION_MENSUAL,
    dias_por_pago: DIAS_POR_PAGO,
    medios_pago: mediosDePago(),
  };
}

export async function obtenerMiSuscripcion(usuarioId) {
  const suscripcion = await Suscripcion.findOne({ where: { usuario_id: usuarioId } });
  if (!suscripcion) {
    return { es_organizador: false, dias_prueba: DIAS_PRUEBA, precio_mensual: env.PRECIO_SUSCRIPCION_MENSUAL, dias_por_pago: DIAS_POR_PAGO };
  }
  // La última transferencia dice si hay una en revisión o si la rechazaron (y por qué).
  const ultimaTransferencia = await PagoSuscripcion.findOne({
    where: { usuario_id: usuarioId, origen: "transferencia" },
    attributes: ["id", "estado", "motivo_rechazo", "creado_en", "revisado_en"],
    order: [["creado_en", "DESC"], ["id", "DESC"]],
  });
  return { ...formatear(suscripcion), ultima_transferencia: ultimaTransferencia };
}

/** Lo usa requireSuscripcionVigente: null si no es organizador. */
export async function vigenciaDeUsuario(usuarioId) {
  const suscripcion = await Suscripcion.findOne({ where: { usuario_id: usuarioId }, attributes: ["fecha_vencimiento", "en_prueba"] });
  return suscripcion ? calcularEstado(suscripcion, hoyArgentina()) : null;
}

/**
 * Suma el rol organizador y arranca la prueba gratis. La prueba es una sola vez por
 * cuenta: si ya tenía plan (aunque esté vencido) se devuelve el que tiene.
 */
export async function empezarAOrganizar(usuarioId) {
  const resultado = await sequelize.transaction(async (t) => {
    const rol = await Rol.findOne({ where: { codigo: "organizador" }, transaction: t });
    if (!rol) throw new Error("Falta configurar el rol organizador");
    await UsuarioRol.findOrCreate({ where: { usuario_id: usuarioId, rol_id: rol.id }, transaction: t });

    const hoy = hoyArgentina();
    const [suscripcion, creada] = await Suscripcion.findOrCreate({
      where: { usuario_id: usuarioId },
      defaults: { usuario_id: usuarioId, fecha_inicio: hoy, fecha_vencimiento: vencimientoDePrueba(hoy), en_prueba: true },
      transaction: t,
    });
    return { creada, suscripcion: formatear(suscripcion, hoy) };
  });
  // Solo la primera vez: al equipo le interesa cada organizador nuevo.
  if (resultado.creada) {
    avisarSinEsperar("nuevo_organizador", async () => {
      const contacto = await contactoDeUsuario(usuarioId);
      return contacto && { para: env.SUPERADMIN_EMAIL, datos: contacto };
    });
  }
  return resultado;
}

export async function historialPagos(usuarioId, limite = 24) {
  return PagoSuscripcion.findAll({
    where: { usuario_id: usuarioId },
    attributes: ["id", "origen", "estado", "monto", "dias", "vencimiento_anterior", "vencimiento_nuevo", "nota", "motivo_rechazo", "comprobante_formato", "creado_en"],
    order: [["creado_en", "DESC"], ["id", "DESC"]],
    limit: limite,
  });
}

export async function crearPagoMercadoPago(usuarioId) {
  const suscripcion = await Suscripcion.findOne({ where: { usuario_id: usuarioId } });
  if (!suscripcion) throw error("Primero activá tu cuenta de organizador.", 403, "NO_ES_ORGANIZADOR");
  if (!mercadoPagoActivo()) {
    throw error("Los pagos con MercadoPago todavía no están habilitados. Escribinos para renovar.", 503, "PAGOS_NO_CONFIGURADOS");
  }
  return crearPreferencia({ usuarioId, monto: env.PRECIO_SUSCRIPCION_MENSUAL, dias: DIAS_POR_PAGO });
}

/** Suma días al plan (bloqueado por la transacción) y deja el registro del movimiento. */
async function aplicarDias(suscripcion, dias, hoy, t) {
  const anterior = suscripcion.fecha_vencimiento;
  const nuevo = nuevoVencimiento(anterior, hoy, dias);
  await suscripcion.update({ fecha_vencimiento: nuevo, en_prueba: false, actualizado_en: new Date() }, { transaction: t });
  return { vencimiento_anterior: anterior, vencimiento_nuevo: nuevo, dias };
}

/**
 * Aviso de MercadoPago. Idempotente: el mismo pago puede llegar varias veces (y primero
 * como pendiente); los días se suman una sola vez. El estado se consulta a MercadoPago,
 * nunca se toma del cuerpo del aviso, así que un aviso falso no habilita nada.
 */
export async function procesarPagoMercadoPago(paymentId, { consultar = verificarPago } = {}) {
  const pago = await consultar(paymentId);
  const evaluacion = evaluarPagoMercadoPago(pago, env.PRECIO_SUSCRIPCION_MENSUAL);
  if (!evaluacion.usuarioId) return { resultado: "ignorado", motivo: evaluacion.estado };
  if (!await Usuario.findByPk(evaluacion.usuarioId, { attributes: ["id"] })) return { resultado: "ignorado", motivo: "usuario_inexistente" };

  return sequelize.transaction(async (t) => {
    const registro = await PagoSuscripcion.findOne({ where: { mp_payment_id: String(pago.id) }, transaction: t, lock: t.LOCK.UPDATE });
    if (registro?.dias > 0) return { resultado: "ya_aplicado" };

    const suscripcion = await Suscripcion.findOne({ where: { usuario_id: evaluacion.usuarioId }, transaction: t, lock: t.LOCK.UPDATE });
    let movimiento = { dias: 0 };
    let estado = evaluacion.estado;
    if (evaluacion.aplicar && suscripcion) movimiento = await aplicarDias(suscripcion, DIAS_POR_PAGO, hoyArgentina(), t);
    else if (evaluacion.aplicar) estado = "sin_plan";

    const datos = { estado, monto: pago.monto ?? null, detalle: pago.detalle ?? null, ...movimiento, actualizado_en: new Date() };
    if (registro) await registro.update(datos, { transaction: t });
    else await PagoSuscripcion.create({ ...datos, usuario_id: evaluacion.usuarioId, origen: "mercadopago", mp_payment_id: String(pago.id) }, { transaction: t });
    return { resultado: movimiento.dias > 0 ? "aplicado" : "registrado", estado };
  });
}

async function moverPlan(usuarioId, adminId, nota, origen, calcular) {
  return sequelize.transaction(async (t) => {
    const suscripcion = await Suscripcion.findOne({ where: { usuario_id: usuarioId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!suscripcion) throw error("Esa persona no tiene plan de organizador.", 404, "SIN_PLAN");
    const hoy = hoyArgentina();
    const movimiento = await calcular(suscripcion, hoy, t);
    await PagoSuscripcion.create({ usuario_id: usuarioId, origen, estado: "aprobado", ...movimiento, registrado_por: adminId, nota }, { transaction: t });
    return formatear(suscripcion, hoy);
  });
}

export function extenderManual(usuarioId, { dias, nota }, adminId) {
  return moverPlan(usuarioId, adminId, nota, "manual", (s, hoy, t) => aplicarDias(s, dias, hoy, t));
}

/** Fija la fecha exacta (correcciones, cortesías puntuales o cortar un plan). */
export function fijarVencimiento(usuarioId, { fecha, nota }, adminId) {
  return moverPlan(usuarioId, adminId, nota, "ajuste", async (s, _hoy, t) => {
    const anterior = s.fecha_vencimiento;
    await s.update({ fecha_vencimiento: fecha, en_prueba: false, actualizado_en: new Date() }, { transaction: t });
    return { vencimiento_anterior: anterior, vencimiento_nuevo: fecha, dias: 0 };
  });
}

// ── Transferencias ──────────────────────────────────────────────────────────

const PENDIENTE = { origen: "transferencia", estado: "pendiente" };
const YA_PENDIENTE = "Ya tenés una transferencia en revisión. Te avisamos apenas la confirmemos.";

/**
 * El organizador avisa que transfirió y adjunta el comprobante. Queda pendiente hasta que
 * el equipo lo revisa; una sola pendiente a la vez para no duplicar meses.
 */
export async function avisarTransferencia(usuarioId, { archivo, nota }, { subir = subirArchivoPrivado, borrar = eliminarArchivoPrivado } = {}) {
  if (!transferenciaLista()) throw error("Los datos para transferir todavía no están cargados. Escribinos para renovar.", 503, "TRANSFERENCIA_NO_CONFIGURADA");
  const { datos, error: invalido } = validarAvisoTransferencia({ archivo, nota }, cobroConfig.comprobante);
  if (invalido) throw error(invalido, 400, "COMPROBANTE_INVALIDO");
  if (!await Suscripcion.count({ where: { usuario_id: usuarioId } })) throw error("Primero activá tu cuenta de organizador.", 403, "NO_ES_ORGANIZADOR");
  if (await PagoSuscripcion.count({ where: { usuario_id: usuarioId, ...PENDIENTE } })) throw error(YA_PENDIENTE, 409, "TRANSFERENCIA_PENDIENTE");

  let subido;
  try {
    subido = await subir(archivo.buffer, { folder: "mipadel/comprobantes", public_id: `usuario_${usuarioId}_${Date.now()}` });
  } catch (e) {
    console.error("No se pudo guardar el comprobante:", e.message);
    throw error("No pudimos guardar el comprobante. Probá de nuevo en unos minutos.", 503, "COMPROBANTE_NO_GUARDADO");
  }
  try {
    const pago = await sequelize.transaction(async (t) => {
      // Bloquear el plan serializa dos avisos simultáneos del mismo organizador.
      await Suscripcion.findOne({ where: { usuario_id: usuarioId }, transaction: t, lock: t.LOCK.UPDATE });
      if (await PagoSuscripcion.count({ where: { usuario_id: usuarioId, ...PENDIENTE }, transaction: t })) throw error(YA_PENDIENTE, 409, "TRANSFERENCIA_PENDIENTE");
      return PagoSuscripcion.create({
        usuario_id: usuarioId, ...PENDIENTE, monto: env.PRECIO_SUSCRIPCION_MENSUAL || null, nota: datos.nota,
        comprobante_id: subido.public_id, comprobante_formato: datos.formato,
      }, { transaction: t });
    });
    avisarSinEsperar("transferencia_plan", async () => {
      const contacto = await contactoDeUsuario(usuarioId);
      return contacto && { para: env.SUPERADMIN_EMAIL, datos: contacto };
    });
    return pago;
  } catch (e) {
    // Sin registro en la base, el archivo quedaría huérfano en Cloudinary.
    await borrar(subido.public_id).catch(() => {});
    throw e;
  }
}

const ESTADOS_TRANSFERENCIA = ["pendiente", "aprobado", "rechazado"];

/** Transferencias para el panel: pendientes (las más viejas primero) o ya revisadas. */
export async function listarTransferencias({ estado = "pendiente", page, limit } = {}) {
  const pag = normalizarPaginacion({ page, limit, maxLimit: 50, defaultLimit: 20 });
  const filtro = ESTADOS_TRANSFERENCIA.includes(estado) ? estado : "pendiente";
  const orden = filtro === "pendiente" ? "ASC" : "DESC"; // de una lista fija, no del usuario
  const filas = await sequelize.query(`
    SELECT ps.id, ps.usuario_id, ps.estado, ps.monto, ps.nota, ps.motivo_rechazo, ps.comprobante_formato,
           ps.dias, ps.vencimiento_nuevo, ps.creado_en, ps.revisado_en,
           p.nombre, p.apellido, p.email, s.fecha_vencimiento, COUNT(*) OVER() AS total
    FROM pago_suscripcion ps
    JOIN usuario u ON u.id = ps.usuario_id
    JOIN persona p ON p.id = u.persona_id
    LEFT JOIN suscripcion s ON s.usuario_id = ps.usuario_id
    WHERE ps.origen = 'transferencia' AND ps.estado = :estado
    ORDER BY ps.creado_en ${orden}, ps.id
    LIMIT :limite OFFSET :offset`, { replacements: { estado: filtro, limite: pag.limit, offset: pag.offset }, type: QueryTypes.SELECT });
  const [{ pendientes }] = await sequelize.query(
    "SELECT COUNT(*)::int AS pendientes FROM pago_suscripcion WHERE origen = 'transferencia' AND estado = 'pendiente'", { type: QueryTypes.SELECT });
  const total = Number(filas[0]?.total ?? 0);
  return { data: filas.map(({ total: _total, ...f }) => f), pendientes, ...armarPaginacion({ page: pag.page, limit: pag.limit, total }) };
}

async function revisarTransferencia(pagoId, adminId, resolver) {
  return sequelize.transaction(async (t) => {
    const pago = await PagoSuscripcion.findOne({ where: { id: pagoId, origen: "transferencia" }, transaction: t, lock: t.LOCK.UPDATE });
    if (!pago) throw error("No encontramos esa transferencia.", 404, "TRANSFERENCIA_INEXISTENTE");
    if (pago.estado !== "pendiente") throw error("Esa transferencia ya fue revisada.", 409, "TRANSFERENCIA_REVISADA");
    const cambios = await resolver(pago, t);
    await pago.update({ ...cambios, registrado_por: adminId, revisado_en: new Date(), actualizado_en: new Date() }, { transaction: t });
    return pago;
  });
}

export function aprobarTransferencia(pagoId, adminId) {
  return revisarTransferencia(pagoId, adminId, async (pago, t) => {
    const suscripcion = await Suscripcion.findOne({ where: { usuario_id: pago.usuario_id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!suscripcion) throw error("Esa persona no tiene plan de organizador.", 404, "SIN_PLAN");
    return { estado: "aprobado", ...await aplicarDias(suscripcion, DIAS_POR_PAGO, hoyArgentina(), t) };
  });
}

export function rechazarTransferencia(pagoId, { motivo }, adminId) {
  return revisarTransferencia(pagoId, adminId, async () => ({ estado: "rechazado", motivo_rechazo: motivo }));
}

/** Enlace que vence a los 5 minutos; solo para el dueño o el equipo con suscripciones.ver. */
export async function enlaceComprobante(pagoId, usuario, { enlazar = enlaceArchivoPrivado } = {}) {
  const pago = await PagoSuscripcion.findByPk(pagoId, { attributes: ["usuario_id", "comprobante_id", "comprobante_formato"] });
  const autorizado = pago && (pago.usuario_id === usuario.usuario_id || tienePermiso(usuario, "suscripciones.ver"));
  // Mismo 404 exista o no: no revela comprobantes ajenos.
  if (!autorizado || !pago.comprobante_id) throw error("No encontramos ese comprobante.", 404, "COMPROBANTE_INEXISTENTE");
  return { url: enlazar(pago.comprobante_id, pago.comprobante_formato), formato: pago.comprobante_formato };
}

// Estados como condiciones SQL fijas (allowlist): el filtro elige una clave, nunca escribe SQL.
const FILTROS_ESTADO = {
  vencido: "s.fecha_vencimiento < :hoy",
  prueba: "s.en_prueba AND s.fecha_vencimiento >= :hoy",
  por_vencer: "NOT s.en_prueba AND s.fecha_vencimiento BETWEEN :hoy AND :limite_aviso",
  activo: "NOT s.en_prueba AND s.fecha_vencimiento > :limite_aviso",
};
export const ESTADOS_FILTRABLES = Object.keys(FILTROS_ESTADO);

/** Organizadores con su plan, para el panel. Incluye cuántos hay en cada estado. */
export async function listarSuscripciones({ busqueda = "", estado = "", page, limit } = {}) {
  const pag = normalizarPaginacion({ page, limit, maxLimit: 50, defaultLimit: 20 });
  const hoy = hoyArgentina();
  const texto = String(busqueda ?? "").trim().slice(0, 80);
  const replacements = {
    hoy, limite_aviso: sumarDias(hoy, DIAS_AVISO - 1),
    patron: `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
    limite: pag.limit, offset: pag.offset,
  };
  const condiciones = [];
  if (texto) condiciones.push("(p.nombre ILIKE :patron OR p.apellido ILIKE :patron OR p.email ILIKE :patron)");
  if (FILTROS_ESTADO[estado]) condiciones.push(FILTROS_ESTADO[estado]);
  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  const filas = await sequelize.query(`
    SELECT s.usuario_id, s.fecha_inicio, s.fecha_vencimiento, s.en_prueba,
           p.nombre, p.apellido, p.email, COUNT(*) OVER() AS total
    FROM suscripcion s
    JOIN usuario u ON u.id = s.usuario_id
    JOIN persona p ON p.id = u.persona_id
    ${where}
    ORDER BY s.fecha_vencimiento ASC, s.usuario_id ASC
    LIMIT :limite OFFSET :offset`, { replacements, type: QueryTypes.SELECT });

  const [conteo] = await sequelize.query(`
    SELECT ${ESTADOS_FILTRABLES.map((e) => `COUNT(*) FILTER (WHERE ${FILTROS_ESTADO[e]}) AS ${e}`).join(", ")}
    FROM suscripcion s`, { replacements, type: QueryTypes.SELECT });

  const total = Number(filas[0]?.total ?? 0);
  return {
    data: filas.map(({ total: _total, ...f }) => ({ ...f, ...calcularEstado(f, hoy) })),
    resumen: Object.fromEntries(ESTADOS_FILTRABLES.map((e) => [e, Number(conteo?.[e] ?? 0)])),
    ...armarPaginacion({ page: pag.page, limit: pag.limit, total }),
  };
}
