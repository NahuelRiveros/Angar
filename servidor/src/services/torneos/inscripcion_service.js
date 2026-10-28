import { Op, UniqueConstraintError } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { Torneo, TorneoCategoria, Inscripcion, Persona } from "../../models/index.js";
import { PERMITIDO, ESTADOS_TORNEO, nombreCategoria } from "../../../../torneo_config.js";
import { torneoPropio, error } from "./torneo_service.js";
import { validarInscripcionOnline, validarParejaOrganizador, motivoParaNoSubirComprobante } from "./inscripcion_reglas.js";
import { validarRechazo, validarAvisoTransferencia } from "../suscripciones/suscripcion_reglas.js";
import { subirArchivoPrivado, eliminarArchivoPrivado, enlaceArchivoPrivado } from "../common/upload_service.js";
import { cobroConfig } from "../../../../cobro_config.js";
import { avisarSinEsperar, contactoDeUsuario } from "../common/avisos_service.js";
import { usuarioPorCodigo } from "../jugadores/jugador_service.js";

// Del pago se manda el estado y si hay comprobante (para el botón "Ver"), nunca el id del archivo.
const PAGO = ["pago_estado", "pago_comprobante_formato", "pago_subido_en", "pago_motivo_rechazo"];
const ATRIBUTOS = ["id", "categoria_id", "usuario2_id", "jugador1_nombre", "jugador2_nombre", "telefono", "nota", "origen", "estado", "motivo_rechazo", "cabeza_de_serie", "zona_id", "creado_en", ...PAGO];
// Vivas: ocupan al jugador en la categoría (incluye la invitación sin responder).
const ACTIVAS = ["esperando", "pendiente", "confirmada"];

function exigir(torneo, accion, mensaje) {
  if (!PERMITIDO[accion].includes(torneo.estado)) {
    throw error(`${mensaje} (el torneo está en "${ESTADOS_TORNEO[torneo.estado]?.etiqueta ?? torneo.estado}").`, 409, "ESTADO_NO_PERMITE");
  }
}

/** Categoría del torneo, bloqueada: serializa todo lo que cuenta el cupo. */
async function categoriaBloqueada(torneoId, categoriaId, t) {
  const categoria = await TorneoCategoria.findOne({ where: { id: categoriaId, torneo_id: torneoId }, transaction: t, lock: t.LOCK.UPDATE });
  if (!categoria) throw error("No encontramos esa categoría en el torneo.", 404, "CATEGORIA_INEXISTENTE");
  return categoria;
}

/** ¿Ese jugador ya está en otra inscripción viva de la categoría (como el que anota o como compañero)? */
async function yaAnotado(categoriaId, usuarioId, t, exceptoId = null) {
  const where = { categoria_id: categoriaId, estado: ACTIVAS, [Op.or]: [{ usuario_id: usuarioId }, { usuario2_id: usuarioId }] };
  if (exceptoId) where.id = { [Op.ne]: exceptoId };
  return (await Inscripcion.count({ where, transaction: t })) > 0;
}

async function exigirCupo(categoria, t) {
  if (!categoria.cupo_parejas) return;
  const confirmadas = await Inscripcion.count({ where: { categoria_id: categoria.id, estado: "confirmada" }, transaction: t });
  if (confirmadas >= categoria.cupo_parejas) throw error(`La categoría ${nombreCategoria(categoria)} ya completó su cupo de ${categoria.cupo_parejas} parejas.`, 409, "CUPO_COMPLETO");
}

// ── El jugador ──────────────────────────────────────────────────────────────

/**
 * El jugador logueado se anota con su compañero. Por nombre: queda pendiente hasta que confirme el
 * organizador. Por código: queda "esperando" hasta que el compañero acepte la invitación.
 */
export async function anotarseOnline(usuario, torneoId, body) {
  const { datos, error: invalido } = validarInscripcionOnline(body);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  const persona = await Persona.findByPk(usuario.persona_id, { attributes: ["nombre", "apellido"] });
  const jugador1 = `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim().slice(0, 80);
  let inscripcion;
  try {
    inscripcion = await sequelize.transaction(async (t) => {
      const torneo = await Torneo.findByPk(torneoId, { transaction: t });
      if (!torneo || torneo.estado === "borrador") throw error("No encontramos ese torneo.", 404, "TORNEO_INEXISTENTE");
      exigir(torneo, "anotarseOnline", "La inscripción no está abierta");
      const categoria = await categoriaBloqueada(torneo.id, datos.categoria_id, t);
      await exigirCupo(categoria, t);
      if (await yaAnotado(categoria.id, usuario.usuario_id, t)) throw error("Ya estás anotado en esa categoría.", 409, "YA_ANOTADO");
      const { codigo_companiero: codigo, ...resto } = datos;
      let companiero = null;
      if (codigo) {
        companiero = await usuarioPorCodigo(codigo, t);
        if (!companiero) throw error("No encontramos un jugador con ese código. Pedile que lo copie de su perfil.", 404, "CODIGO_INEXISTENTE");
        if (companiero.id === usuario.usuario_id) throw error("Ese es tu propio código: poné el de tu compañero.", 400, "CODIGO_PROPIO");
        if (await yaAnotado(categoria.id, companiero.id, t)) throw error("Tu compañero ya está anotado en esa categoría.", 409, "COMPANIERO_ANOTADO");
      }
      return Inscripcion.create({
        ...resto, torneo_id: torneo.id, usuario_id: usuario.usuario_id, jugador1_nombre: jugador1 || "Jugador",
        ...(companiero ? { usuario2_id: companiero.id, jugador2_nombre: companiero.nombre.slice(0, 80) || codigo } : {}),
        origen: "online", estado: companiero ? "esperando" : "pendiente",
      }, { transaction: t });
    });
  } catch (e) {
    // El índice único de la base frena dos inscripciones vivas del mismo jugador en la categoría.
    if (e instanceof UniqueConstraintError) throw error("Ya estás anotado en esa categoría.", 409, "YA_ANOTADO");
    throw e;
  }
  avisarAlOrganizador("nueva_inscripcion", inscripcion);
  return inscripcion;
}

/** Aviso al organizador del torneo sobre una inscripción (nueva o con comprobante). */
function avisarAlOrganizador(tipo, inscripcion) {
  avisarSinEsperar(tipo, async () => {
    const [torneo, categoria] = await Promise.all([
      Torneo.findByPk(inscripcion.torneo_id, { attributes: ["id", "nombre", "organizador_id"] }),
      TorneoCategoria.findByPk(inscripcion.categoria_id, { attributes: ["nivel", "rama", "nombre_personalizado"] }),
    ]);
    const organizador = torneo && await contactoDeUsuario(torneo.organizador_id);
    if (!organizador) return null;
    return {
      para: organizador.email,
      datos: { torneo: torneo.nombre, torneoId: torneo.id, categoria: nombreCategoria(categoria), pareja: `${inscripcion.jugador1_nombre} / ${inscripcion.jugador2_nombre}`, estado: inscripcion.estado },
    };
  });
}

/** Las que anoté yo y las invitaciones que me hicieron (rol "invitado"). */
export async function misInscripciones(usuario) {
  const filas = await Inscripcion.findAll({
    where: { [Op.or]: [{ usuario_id: usuario.usuario_id }, { usuario2_id: usuario.usuario_id }] },
    attributes: ["id", "torneo_id", "usuario_id", "jugador1_nombre", "jugador2_nombre", "estado", "motivo_rechazo", "zona_id", "creado_en", ...PAGO],
    include: [
      { model: Torneo, as: "torneo", attributes: ["id", "nombre", "estado", "fecha_inicio", "sede", "cobro_titular", "cobro_banco", "cobro_cbu", "cobro_alias"] },
      { model: TorneoCategoria, as: "categoria", attributes: ["nivel", "rama", "nombre_personalizado", "monto_inscripcion"] },
    ],
    order: [["creado_en", "DESC"], ["id", "DESC"]],
    limit: 50,
  });
  return filas.map((f) => {
    const { categoria, usuario_id: anoto, ...resto } = f.get({ plain: true });
    return {
      ...resto, categoria: nombreCategoria(categoria), rol: anoto === usuario.usuario_id ? "anoto" : "invitado",
      monto_inscripcion: categoria.monto_inscripcion === null ? null : Number(categoria.monto_inscripcion),
    };
  });
}

/** El compañero invitado acepta (pasa a pendiente, la confirma el organizador) o rechaza (se cancela). */
export async function responderInvitacion(usuario, inscripcionId, acepta) {
  return sequelize.transaction(async (t) => {
    const inscripcion = await Inscripcion.findOne({ where: { id: inscripcionId, usuario2_id: usuario.usuario_id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!inscripcion) throw error("No encontramos esa invitación.", 404, "INVITACION_INEXISTENTE");
    if (inscripcion.estado !== "esperando") throw error("Esa invitación ya fue respondida o cancelada.", 409, "INVITACION_RESPONDIDA");
    const torneo = await Torneo.findByPk(inscripcion.torneo_id, { transaction: t });
    exigir(torneo, "anotarseOnline", "La inscripción ya cerró");
    if (acepta) {
      await categoriaBloqueada(torneo.id, inscripcion.categoria_id, t);
      if (await yaAnotado(inscripcion.categoria_id, usuario.usuario_id, t, inscripcion.id)) {
        throw error("Ya estás anotado en esa categoría con otra pareja.", 409, "YA_ANOTADO");
      }
    }
    await inscripcion.update(acepta
      ? { estado: "pendiente", actualizado_en: new Date() }
      : { estado: "cancelada", motivo_rechazo: "El compañero rechazó la invitación.", actualizado_en: new Date() }, { transaction: t });
    return inscripcion;
  });
}

/** El jugador se baja mientras la inscripción esté abierta y todavía no lo ubicaron en una zona. */
export async function cancelarMia(usuario, inscripcionId) {
  return sequelize.transaction(async (t) => {
    // Se puede bajar cualquiera de los dos jugadores con cuenta.
    const inscripcion = await Inscripcion.findOne({ where: { id: inscripcionId, [Op.or]: [{ usuario_id: usuario.usuario_id }, { usuario2_id: usuario.usuario_id }] }, transaction: t, lock: t.LOCK.UPDATE });
    if (!inscripcion) throw error("No encontramos esa inscripción.", 404, "INSCRIPCION_INEXISTENTE");
    if (!ACTIVAS.includes(inscripcion.estado)) throw error("Esa inscripción ya no está activa.", 409, "INSCRIPCION_INACTIVA");
    const torneo = await Torneo.findByPk(inscripcion.torneo_id, { transaction: t });
    exigir(torneo, "anotarseOnline", "Ya no podés bajarte desde acá; escribile al organizador");
    if (inscripcion.zona_id) throw error("Ya te ubicaron en una zona: para bajarte, escribile al organizador.", 409, "YA_EN_ZONA");
    await inscripcion.update({ estado: "cancelada", actualizado_en: new Date() }, { transaction: t });
    return inscripcion;
  });
}

// ── El organizador ──────────────────────────────────────────────────────────

export async function listarInscripciones(torneoId, usuario, { categoria_id, estado } = {}) {
  const torneo = await torneoPropio(torneoId, usuario);
  const where = { torneo_id: torneo.id };
  if (Number.isInteger(Number(categoria_id)) && Number(categoria_id) > 0) where.categoria_id = Number(categoria_id);
  if (["esperando", "pendiente", "confirmada", "rechazada", "cancelada"].includes(estado)) where.estado = estado;
  return Inscripcion.findAll({ where, attributes: ATRIBUTOS, order: [["creado_en", "ASC"], ["id", "ASC"]] });
}

/** Pareja anotada por el organizador (por WhatsApp, en el club…): entra confirmada. */
export async function cargarPareja(torneoId, usuario, body) {
  const { datos, error: invalido } = validarParejaOrganizador(body);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigir(torneo, "cargarParejas", "Ya no se pueden sumar parejas");
    const categoria = await categoriaBloqueada(torneo.id, datos.categoria_id, t);
    await exigirCupo(categoria, t);
    return Inscripcion.create({ ...datos, torneo_id: torneo.id, origen: "organizador", estado: "confirmada" }, { transaction: t });
  });
}

async function inscripcionDelTorneo(torneo, inscripcionId, t) {
  const inscripcion = await Inscripcion.findOne({ where: { id: inscripcionId, torneo_id: torneo.id }, transaction: t, lock: t.LOCK.UPDATE });
  if (!inscripcion) throw error("No encontramos esa inscripción.", 404, "INSCRIPCION_INEXISTENTE");
  return inscripcion;
}

/** Corregir nombres, teléfono o marcar cabeza de serie. No cambia el estado. */
export async function editarPareja(torneoId, inscripcionId, usuario, body) {
  const { datos, error: invalido } = validarParejaOrganizador(body, { editar: true });
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    if (["finalizado", "cancelado"].includes(torneo.estado)) throw error("El torneo está cerrado.", 409, "TORNEO_CERRADO");
    const inscripcion = await inscripcionDelTorneo(torneo, inscripcionId, t);
    await inscripcion.update({ ...datos, actualizado_en: new Date() }, { transaction: t });
    return inscripcion;
  });
}

export async function confirmarInscripcion(torneoId, inscripcionId, usuario) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigir(torneo, "cargarParejas", "Ya no se pueden confirmar parejas");
    const inscripcion = await inscripcionDelTorneo(torneo, inscripcionId, t);
    if (inscripcion.estado !== "pendiente") throw error("Solo se confirman inscripciones pendientes.", 409, "INSCRIPCION_NO_PENDIENTE");
    await exigirCupo(await categoriaBloqueada(torneo.id, inscripcion.categoria_id, t), t);
    await inscripcion.update({ estado: "confirmada", actualizado_en: new Date() }, { transaction: t });
    return inscripcion;
  });
}

export async function rechazarInscripcion(torneoId, inscripcionId, usuario, body) {
  const { datos, error: invalido } = validarRechazo(body);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    const inscripcion = await inscripcionDelTorneo(torneo, inscripcionId, t);
    if (!["pendiente", "esperando"].includes(inscripcion.estado)) throw error("Solo se rechazan inscripciones pendientes.", 409, "INSCRIPCION_NO_PENDIENTE");
    await inscripcion.update({ estado: "rechazada", motivo_rechazo: datos.motivo, actualizado_en: new Date() }, { transaction: t });
    return inscripcion;
  });
}

// ── Pago de la inscripción con comprobante ─────────────────────────────────

const esSuperAdmin = (usuario) => (usuario?.roles ?? []).includes("super_admin");
const COMPROBANTE_INEXISTENTE = () => error("No encontramos ese comprobante.", 404, "COMPROBANTE_INEXISTENTE");

/** La inscripción (bloqueada si hay transacción) de la que el usuario es parte, con su torneo y categoría. */
async function inscripcionParaPagar(usuario, inscripcionId, t) {
  const inscripcion = await Inscripcion.findOne({
    where: { id: inscripcionId, [Op.or]: [{ usuario_id: usuario.usuario_id }, { usuario2_id: usuario.usuario_id }] },
    ...(t ? { transaction: t, lock: t.LOCK.UPDATE } : {}),
  });
  if (!inscripcion) throw error("No encontramos esa inscripción.", 404, "INSCRIPCION_INEXISTENTE");
  const [torneo, categoria] = await Promise.all([
    Torneo.findByPk(inscripcion.torneo_id, { attributes: ["id", "estado"], transaction: t }),
    TorneoCategoria.findByPk(inscripcion.categoria_id, { attributes: ["id", "monto_inscripcion"], transaction: t }),
  ]);
  return { inscripcion, torneo, categoria };
}

/**
 * Cualquiera de los dos de la pareja manda el comprobante: queda "en revisión" hasta que la
 * organización lo apruebe (y confirma) o lo rechace con motivo (y se puede mandar otro).
 */
export async function subirComprobanteInscripcion(usuario, inscripcionId, archivo, { subir = subirArchivoPrivado, borrar = eliminarArchivoPrivado } = {}) {
  const { datos, error: invalido } = validarAvisoTransferencia({ archivo, nota: null }, cobroConfig.comprobante);
  if (invalido) throw error(invalido, 400, "COMPROBANTE_INVALIDO");
  const motivo = motivoParaNoSubirComprobante(await inscripcionParaPagar(usuario, inscripcionId));
  if (motivo) throw error(motivo, 409, "PAGO_NO_PERMITIDO");

  let subido;
  try {
    subido = await subir(archivo.buffer, { folder: "mipadel/inscripciones", public_id: `inscripcion_${inscripcionId}_${Date.now()}` });
  } catch (e) {
    console.error("No se pudo guardar el comprobante de inscripción:", e.message);
    throw error("No pudimos guardar el comprobante. Probá de nuevo en unos minutos.", 503, "COMPROBANTE_NO_GUARDADO");
  }
  let anterior = null;
  try {
    const inscripcion = await sequelize.transaction(async (t) => {
      // Se vuelve a mirar con la fila bloqueada: dos envíos al mismo tiempo no dejan dos comprobantes.
      const actual = await inscripcionParaPagar(usuario, inscripcionId, t);
      const otra = motivoParaNoSubirComprobante(actual);
      if (otra) throw error(otra, 409, "PAGO_NO_PERMITIDO");
      anterior = actual.inscripcion.pago_comprobante_id;
      return actual.inscripcion.update({
        pago_estado: "en_revision", pago_comprobante_id: subido.public_id, pago_comprobante_formato: datos.formato,
        pago_subido_en: new Date(), pago_motivo_rechazo: null, actualizado_en: new Date(),
      }, { transaction: t });
    });
    // El comprobante rechazado que se reemplaza ya no hace falta.
    if (anterior) await borrar(anterior).catch(() => {});
    avisarAlOrganizador("comprobante_inscripcion", inscripcion);
    return inscripcion;
  } catch (e) {
    // Sin registro en la base, el archivo quedaría huérfano en Cloudinary.
    await borrar(subido.public_id).catch(() => {});
    throw e;
  }
}

/** Enlace que vence a los 5 minutos: para la pareja, el organizador del torneo o el super admin. */
export async function enlaceComprobanteInscripcion(usuario, inscripcionId, { enlazar = enlaceArchivoPrivado } = {}) {
  const inscripcion = await Inscripcion.findByPk(inscripcionId, { attributes: ["torneo_id", "usuario_id", "usuario2_id", "pago_comprobante_id", "pago_comprobante_formato"] });
  const torneo = inscripcion && await Torneo.findByPk(inscripcion.torneo_id, { attributes: ["organizador_id"] });
  const autorizado = torneo && ([inscripcion.usuario_id, inscripcion.usuario2_id, torneo.organizador_id].includes(usuario.usuario_id) || esSuperAdmin(usuario));
  // Mismo 404 exista o no: no revela comprobantes ajenos.
  if (!autorizado || !inscripcion.pago_comprobante_id) throw COMPROBANTE_INEXISTENTE();
  return { url: enlazar(inscripcion.pago_comprobante_id, inscripcion.pago_comprobante_formato), formato: inscripcion.pago_comprobante_formato };
}

/** Aprobar el comprobante confirma la inscripción (con el cupo controlado, como al confirmar a mano). */
export async function aprobarPagoInscripcion(torneoId, inscripcionId, usuario) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigir(torneo, "cargarParejas", "Ya no se pueden confirmar parejas");
    const inscripcion = await inscripcionDelTorneo(torneo, inscripcionId, t);
    if (inscripcion.pago_estado !== "en_revision") throw error("Esta inscripción no tiene un comprobante para revisar.", 409, "SIN_COMPROBANTE");
    if (inscripcion.estado === "esperando") throw error("Todavía falta que el compañero acepte la invitación: después aprobás el pago y queda confirmada.", 409, "ESPERANDO_COMPANIERO");
    if (inscripcion.estado !== "pendiente") throw error("Solo se aprueba el pago de una inscripción pendiente.", 409, "INSCRIPCION_NO_PENDIENTE");
    await exigirCupo(await categoriaBloqueada(torneo.id, inscripcion.categoria_id, t), t);
    await inscripcion.update({ estado: "confirmada", pago_estado: "aprobado", pago_motivo_rechazo: null, actualizado_en: new Date() }, { transaction: t });
    return inscripcion;
  });
}

/** Rechazar el comprobante no rechaza la inscripción: la pareja ve el motivo y manda otro. */
export async function rechazarPagoInscripcion(torneoId, inscripcionId, usuario, body) {
  const { datos, error: invalido } = validarRechazo(body);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    const inscripcion = await inscripcionDelTorneo(torneo, inscripcionId, t);
    if (inscripcion.pago_estado !== "en_revision") throw error("Esta inscripción no tiene un comprobante para revisar.", 409, "SIN_COMPROBANTE");
    await inscripcion.update({ pago_estado: "rechazado", pago_motivo_rechazo: datos.motivo, actualizado_en: new Date() }, { transaction: t });
    return inscripcion;
  });
}

/** Baja de una pareja confirmada o pendiente. Si ya está en una zona, primero hay que rearmarlas. */
export async function darDeBaja(torneoId, inscripcionId, usuario) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    if (["finalizado", "cancelado"].includes(torneo.estado)) throw error("El torneo está cerrado.", 409, "TORNEO_CERRADO");
    const inscripcion = await inscripcionDelTorneo(torneo, inscripcionId, t);
    if (!ACTIVAS.includes(inscripcion.estado)) throw error("Esa inscripción ya no está activa.", 409, "INSCRIPCION_INACTIVA");
    if (inscripcion.zona_id) throw error("La pareja ya está en una zona: rearmá las zonas antes de darla de baja.", 409, "YA_EN_ZONA");
    await inscripcion.update({ estado: "cancelada", actualizado_en: new Date() }, { transaction: t });
    return inscripcion;
  });
}
