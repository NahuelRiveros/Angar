import { UniqueConstraintError } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { Torneo, TorneoCategoria, Inscripcion, Persona } from "../../models/index.js";
import { PERMITIDO, ESTADOS_TORNEO, nombreCategoria } from "../../../../torneo_config.js";
import { torneoPropio, error } from "./torneo_service.js";
import { validarInscripcionOnline, validarParejaOrganizador } from "./inscripcion_reglas.js";
import { validarRechazo } from "../suscripciones/suscripcion_reglas.js";

const ATRIBUTOS = ["id", "categoria_id", "jugador1_nombre", "jugador2_nombre", "telefono", "nota", "origen", "estado", "motivo_rechazo", "cabeza_de_serie", "zona_id", "creado_en"];
const ACTIVAS = ["pendiente", "confirmada"];

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

async function exigirCupo(categoria, t) {
  if (!categoria.cupo_parejas) return;
  const confirmadas = await Inscripcion.count({ where: { categoria_id: categoria.id, estado: "confirmada" }, transaction: t });
  if (confirmadas >= categoria.cupo_parejas) throw error(`La categoría ${nombreCategoria(categoria)} ya completó su cupo de ${categoria.cupo_parejas} parejas.`, 409, "CUPO_COMPLETO");
}

// ── El jugador ──────────────────────────────────────────────────────────────

/** El jugador logueado se anota con su compañero; queda pendiente hasta que confirme el organizador. */
export async function anotarseOnline(usuario, torneoId, body) {
  const { datos, error: invalido } = validarInscripcionOnline(body);
  if (invalido) throw error(invalido, 400, "DATOS_INVALIDOS");
  const persona = await Persona.findByPk(usuario.persona_id, { attributes: ["nombre", "apellido"] });
  const jugador1 = `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim().slice(0, 80);
  try {
    return await sequelize.transaction(async (t) => {
      const torneo = await Torneo.findByPk(torneoId, { transaction: t });
      if (!torneo || torneo.estado === "borrador") throw error("No encontramos ese torneo.", 404, "TORNEO_INEXISTENTE");
      exigir(torneo, "anotarseOnline", "La inscripción no está abierta");
      const categoria = await categoriaBloqueada(torneo.id, datos.categoria_id, t);
      await exigirCupo(categoria, t);
      return Inscripcion.create({
        ...datos, torneo_id: torneo.id, usuario_id: usuario.usuario_id, jugador1_nombre: jugador1 || "Jugador",
        origen: "online", estado: "pendiente",
      }, { transaction: t });
    });
  } catch (e) {
    // El índice único de la base frena dos inscripciones vivas del mismo jugador en la categoría.
    if (e instanceof UniqueConstraintError) throw error("Ya estás anotado en esa categoría.", 409, "YA_ANOTADO");
    throw e;
  }
}

export async function misInscripciones(usuario) {
  const filas = await Inscripcion.findAll({
    where: { usuario_id: usuario.usuario_id },
    attributes: ["id", "torneo_id", "jugador1_nombre", "jugador2_nombre", "estado", "motivo_rechazo", "zona_id", "creado_en"],
    include: [
      { model: Torneo, as: "torneo", attributes: ["id", "nombre", "estado", "fecha_inicio", "sede"] },
      { model: TorneoCategoria, as: "categoria", attributes: ["nivel", "rama", "nombre_personalizado"] },
    ],
    order: [["creado_en", "DESC"], ["id", "DESC"]],
    limit: 50,
  });
  return filas.map((f) => {
    const { categoria, ...resto } = f.get({ plain: true });
    return { ...resto, categoria: nombreCategoria(categoria) };
  });
}

/** El jugador se baja mientras la inscripción esté abierta y todavía no lo ubicaron en una zona. */
export async function cancelarMia(usuario, inscripcionId) {
  return sequelize.transaction(async (t) => {
    const inscripcion = await Inscripcion.findOne({ where: { id: inscripcionId, usuario_id: usuario.usuario_id }, transaction: t, lock: t.LOCK.UPDATE });
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
  if (["pendiente", "confirmada", "rechazada", "cancelada"].includes(estado)) where.estado = estado;
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
    if (inscripcion.estado !== "pendiente") throw error("Solo se rechazan inscripciones pendientes.", 409, "INSCRIPCION_NO_PENDIENTE");
    await inscripcion.update({ estado: "rechazada", motivo_rechazo: datos.motivo, actualizado_en: new Date() }, { transaction: t });
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
