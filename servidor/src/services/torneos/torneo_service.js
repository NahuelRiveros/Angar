import { sequelize } from "../../database/sequelize.js";
import { Torneo, TorneoCategoria, TorneoPremio, Inscripcion, Zona, Partido } from "../../models/index.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";
import { EDICION_POR_ESTADO, ESTADOS_TORNEO, TRANSICIONES, LIMITES, nombreCategoria } from "../../../../torneo_config.js";
import {
  validarDatosTorneo, fechasCoherentes, puedePasar, faltantesPara, validarCategoria, claveCategoria, validarPremios,
  copiaDeTorneo, copiaDeCategoria, copiaDePremio,
} from "./torneo_reglas.js";

export const error = (mensaje, status, codigo) => Object.assign(new Error(mensaje), { status, codigo });
const NO_ENCONTRADO = () => error("No encontramos ese torneo.", 404, "TORNEO_INEXISTENTE");
const esSuperAdmin = (usuario) => (usuario?.roles ?? []).includes("super_admin");

/**
 * Trae el torneo si es del usuario (el super admin entra a todos, para dar soporte).
 * Ajeno o inexistente dan el mismo 404: no se revela que existe.
 */
export async function torneoPropio(torneoId, usuario, t) {
  const torneo = await Torneo.findByPk(torneoId, t ? { transaction: t, lock: t.LOCK.UPDATE } : {});
  if (!torneo || (torneo.organizador_id !== usuario.usuario_id && !esSuperAdmin(usuario))) throw NO_ENCONTRADO();
  return torneo;
}

function exigirEdicion(torneo, parte) {
  if (!EDICION_POR_ESTADO[torneo.estado]?.[parte]) {
    const estado = ESTADOS_TORNEO[torneo.estado]?.etiqueta ?? torneo.estado;
    const que = { datos: "los datos", categorias: "las categorías", premios: "los premios" }[parte];
    throw error(`Con el torneo en "${estado}" ya no se pueden cambiar ${que}.`, 409, "TORNEO_CERRADO");
  }
}

// DECIMAL llega como texto desde PostgreSQL: el monto viaja como número.
const comoMonto = (valor) => (valor === null || valor === undefined ? null : Number(valor));

const formatearCategoria = (c) => ({
  id: c.id, nivel: c.nivel, rama: c.rama, nombre_personalizado: c.nombre_personalizado,
  nombre: nombreCategoria(c), cupo_parejas: c.cupo_parejas, orden: c.orden, monto_inscripcion: comoMonto(c.monto_inscripcion),
  parejas_por_zona: c.parejas_por_zona, clasifican_por_zona: c.clasifican_por_zona, formato_zona: c.formato_zona, formato_llave: c.formato_llave,
  premios: (c.premios ?? []).map(({ id, puesto, etiqueta, descripcion, orden }) => ({ id, puesto, etiqueta, descripcion, orden })),
});

function formatearTorneo(torneo, categorias) {
  const t = torneo.get({ plain: true });
  return {
    ...t,
    monto_inscripcion: comoMonto(t.monto_inscripcion),
    edicion: EDICION_POR_ESTADO[t.estado],
    transiciones: TRANSICIONES[t.estado] ?? [],
    categorias: categorias.map(formatearCategoria),
  };
}

async function cargarDetalle(torneo, t) {
  const categorias = await TorneoCategoria.findAll({
    where: { torneo_id: torneo.id },
    include: [{ model: TorneoPremio, as: "premios" }],
    order: [["orden", "ASC"], ["id", "ASC"], [{ model: TorneoPremio, as: "premios" }, "orden", "ASC"]],
    transaction: t,
  });
  return formatearTorneo(torneo, categorias);
}

export async function listarMisTorneos(usuario, { page, limit } = {}) {
  const pag = normalizarPaginacion({ page, limit, maxLimit: 50, defaultLimit: 20 });
  const { rows, count } = await Torneo.findAndCountAll({
    where: { organizador_id: usuario.usuario_id },
    attributes: [
      "id", "nombre", "sede", "localidad", "fecha_inicio", "fecha_fin", "estado", "creado_en",
      // Contado en la misma consulta: sin una consulta extra por torneo.
      [sequelize.literal(`(SELECT COUNT(*)::int FROM torneo_categoria c WHERE c.torneo_id = "Torneo"."id")`), "cantidad_categorias"],
    ],
    order: [["creado_en", "DESC"], ["id", "DESC"]],
    limit: pag.limit, offset: pag.offset,
  });
  return { data: rows.map((r) => r.get({ plain: true })), ...armarPaginacion({ page: pag.page, limit: pag.limit, total: count }) };
}

export async function obtenerTorneo(torneoId, usuario) {
  const torneo = await torneoPropio(torneoId, usuario);
  return cargarDetalle(torneo);
}

export async function crearTorneo(usuario, body) {
  const { datos, error: invalido } = validarDatosTorneo(body, { crear: true });
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  if (!fechasCoherentes(datos)) throw error("La fecha de fin no puede ser anterior a la de inicio.", 400, "FECHAS_INVALIDAS");
  const torneo = await Torneo.create({ ...datos, organizador_id: usuario.usuario_id, estado: "borrador" });
  return cargarDetalle(torneo);
}

/**
 * Copia un torneo propio (en cualquier estado) a uno nuevo en borrador, para no cargar todo otra vez:
 * datos, reglamento, cobro, categorías con su formato y premios. No copia fechas, parejas ni juego.
 */
export async function duplicarTorneo(torneoId, usuario) {
  return sequelize.transaction(async (t) => {
    const origen = await torneoPropio(torneoId, usuario, t);
    const categorias = await TorneoCategoria.findAll({
      where: { torneo_id: origen.id }, include: [{ model: TorneoPremio, as: "premios" }],
      order: [["orden", "ASC"], ["id", "ASC"]], transaction: t,
    });
    const nuevo = await Torneo.create({ ...copiaDeTorneo(origen.get({ plain: true })), organizador_id: usuario.usuario_id }, { transaction: t });
    for (const categoria of categorias) {
      const copia = await TorneoCategoria.create({ ...copiaDeCategoria(categoria), torneo_id: nuevo.id }, { transaction: t });
      if (categoria.premios.length) await TorneoPremio.bulkCreate(categoria.premios.map((p) => ({ ...copiaDePremio(p), categoria_id: copia.id })), { transaction: t });
    }
    return cargarDetalle(nuevo, t);
  });
}

export async function actualizarTorneo(torneoId, usuario, body) {
  const { datos, error: invalido } = validarDatosTorneo(body);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigirEdicion(torneo, "datos");
    if (!fechasCoherentes({ fecha_inicio: torneo.fecha_inicio, fecha_fin: torneo.fecha_fin, ...datos })) {
      throw error("La fecha de fin no puede ser anterior a la de inicio.", 400, "FECHAS_INVALIDAS");
    }
    // Un torneo publicado no puede quedarse sin sede ni fecha.
    const resultado = { ...torneo.get({ plain: true }), ...datos };
    if (torneo.estado !== "borrador" && faltantesPara(torneo.estado, resultado, 1).length) {
      throw error("Un torneo publicado tiene que tener sede y fecha de inicio.", 400, "DATOS_INVALIDOS");
    }
    await torneo.update({ ...datos, actualizado_en: new Date() }, { transaction: t });
    return cargarDetalle(torneo, t);
  });
}

export async function cambiarEstado(torneoId, usuario, destino) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    if (!puedePasar(torneo.estado, destino)) {
      throw error(`Un torneo en "${ESTADOS_TORNEO[torneo.estado]?.etiqueta}" no puede pasar a "${ESTADOS_TORNEO[destino]?.etiqueta ?? destino}".`, 409, "TRANSICION_INVALIDA");
    }
    const cantidad = await TorneoCategoria.count({ where: { torneo_id: torneo.id }, transaction: t });
    const faltan = faltantesPara(destino, torneo, cantidad);
    if (faltan.length) throw error(`Para ${destino === "inscripcion" ? "abrir la inscripción" : "empezar"} falta cargar ${faltan.join(", ")}.`, 409, "FALTAN_DATOS");
    await torneo.update({ estado: destino, actualizado_en: new Date() }, { transaction: t });
    return cargarDetalle(torneo, t);
  });
}

/** Solo en borrador: publicado ya pudo verlo alguien (se cancela, no se borra). */
export async function eliminarTorneo(torneoId, usuario) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    if (torneo.estado !== "borrador") throw error("Solo se puede borrar un torneo en borrador. Si ya se publicó, cancelalo.", 409, "TORNEO_PUBLICADO");
    const categorias = (await TorneoCategoria.findAll({ where: { torneo_id: torneo.id }, attributes: ["id"], transaction: t })).map((c) => c.id);
    // De lo que cuelga a lo que lo sostiene: partidos → parejas → zonas → premios → categorías.
    await Partido.destroy({ where: { categoria_id: categorias }, transaction: t });
    await Inscripcion.destroy({ where: { torneo_id: torneo.id }, transaction: t });
    await Zona.destroy({ where: { categoria_id: categorias }, transaction: t });
    await TorneoPremio.destroy({ where: { categoria_id: categorias }, transaction: t });
    await TorneoCategoria.destroy({ where: { torneo_id: torneo.id }, transaction: t });
    await torneo.destroy({ transaction: t });
  });
}

async function exigirCategoriaUnica(torneoId, datos, t, exceptoId = null) {
  const existentes = await TorneoCategoria.findAll({ where: { torneo_id: torneoId }, attributes: ["id", "nivel", "rama", "nombre_personalizado"], transaction: t });
  const clave = claveCategoria(datos);
  if (existentes.some((c) => c.id !== exceptoId && claveCategoria(c) === clave)) {
    throw error(`Ya existe la categoría "${nombreCategoria(datos)}" en este torneo.`, 409, "CATEGORIA_REPETIDA");
  }
  return existentes;
}

export async function crearCategoria(torneoId, usuario, body) {
  const { datos, error: invalido } = validarCategoria(body);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigirEdicion(torneo, "categorias");
    const existentes = await exigirCategoriaUnica(torneo.id, datos, t);
    if (existentes.length >= LIMITES.categoriasPorTorneo) throw error(`Hasta ${LIMITES.categoriasPorTorneo} categorías por torneo.`, 409, "LIMITE_CATEGORIAS");
    await TorneoCategoria.create({ ...datos, torneo_id: torneo.id, orden: existentes.length }, { transaction: t });
    return cargarDetalle(torneo, t);
  });
}

async function categoriaDelTorneo(torneo, categoriaId, t) {
  const categoria = await TorneoCategoria.findOne({ where: { id: categoriaId, torneo_id: torneo.id }, transaction: t, lock: t.LOCK.UPDATE });
  if (!categoria) throw error("No encontramos esa categoría.", 404, "CATEGORIA_INEXISTENTE");
  return categoria;
}

export async function actualizarCategoria(torneoId, categoriaId, usuario, body) {
  const { datos, error: invalido } = validarCategoria(body);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigirEdicion(torneo, "categorias");
    const categoria = await categoriaDelTorneo(torneo, categoriaId, t);
    await exigirCategoriaUnica(torneo.id, datos, t, categoria.id);
    await categoria.update({ ...datos, actualizado_en: new Date() }, { transaction: t });
    return cargarDetalle(torneo, t);
  });
}

export async function eliminarCategoria(torneoId, categoriaId, usuario) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigirEdicion(torneo, "categorias");
    const categoria = await categoriaDelTorneo(torneo, categoriaId, t);
    if (await Inscripcion.count({ where: { categoria_id: categoria.id, estado: ["pendiente", "confirmada"] }, transaction: t })) {
      throw error("La categoría tiene parejas anotadas: dalas de baja antes de quitarla.", 409, "CATEGORIA_CON_PAREJAS");
    }
    await Partido.destroy({ where: { categoria_id: categoria.id }, transaction: t });
    await Inscripcion.destroy({ where: { categoria_id: categoria.id }, transaction: t });
    await Zona.destroy({ where: { categoria_id: categoria.id }, transaction: t });
    await TorneoPremio.destroy({ where: { categoria_id: categoria.id }, transaction: t });
    await categoria.destroy({ transaction: t });
    return cargarDetalle(torneo, t);
  });
}

/** Reemplaza todos los premios de la categoría por la lista recibida (se editan juntos). */
export async function guardarPremios(torneoId, categoriaId, usuario, lista) {
  const { datos, error: invalido } = validarPremios(lista);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigirEdicion(torneo, "premios");
    const categoria = await categoriaDelTorneo(torneo, categoriaId, t);
    await TorneoPremio.destroy({ where: { categoria_id: categoria.id }, transaction: t });
    await TorneoPremio.bulkCreate(datos.map((p) => ({ ...p, categoria_id: categoria.id })), { transaction: t });
    return cargarDetalle(torneo, t);
  });
}
