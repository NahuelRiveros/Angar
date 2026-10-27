import {
  listarMisTorneos, obtenerTorneo, crearTorneo, actualizarTorneo, cambiarEstado, eliminarTorneo,
  crearCategoria, actualizarCategoria, eliminarCategoria, guardarPremios,
} from "../../services/torneos/torneo_service.js";

export function responderError(res, e, mensaje) {
  if (e.status) return res.status(e.status).json({ ok: false, codigo: e.codigo, mensaje: e.message });
  console.error(mensaje, e);
  return res.status(500).json({ ok: false, codigo: "ERROR_TORNEO", mensaje });
}

const idValido = (valor) => {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
};

/** Envuelve un handler: todos los parámetros de la ruta (torneoId, categoriaId…) tienen que ser ids válidos. */
export const conIds = (handler, mensajeError) => async (req, res) => {
  const ids = Object.fromEntries(Object.entries(req.params).map(([clave, valor]) => [clave, idValido(valor)]));
  if (Object.values(ids).some((id) => id === null)) return res.status(400).json({ ok: false, codigo: "ID_INVALIDO", mensaje: "No encontramos lo que buscás." });
  try {
    return await handler(req, res, ids);
  } catch (e) { return responderError(res, e, mensajeError); }
};

export async function listarController(req, res) {
  try {
    return res.json({ ok: true, ...await listarMisTorneos(req.user, { page: req.query.page, limit: req.query.limit }) });
  } catch (e) { return responderError(res, e, "No pudimos cargar tus torneos."); }
}

export async function crearController(req, res) {
  try {
    return res.status(201).json({ ok: true, mensaje: "Torneo creado en borrador.", data: await crearTorneo(req.user, req.body) });
  } catch (e) { return responderError(res, e, "No pudimos crear el torneo."); }
}

export const obtenerController = conIds(async (req, res, { torneoId }) =>
  res.json({ ok: true, data: await obtenerTorneo(torneoId, req.user) }), "No pudimos cargar el torneo.");

export const actualizarController = conIds(async (req, res, { torneoId }) =>
  res.json({ ok: true, mensaje: "Cambios guardados.", data: await actualizarTorneo(torneoId, req.user, req.body) }), "No pudimos guardar los cambios.");

export const estadoController = conIds(async (req, res, { torneoId }) => {
  const data = await cambiarEstado(torneoId, req.user, String(req.body?.estado ?? ""));
  return res.json({ ok: true, mensaje: "Estado actualizado.", data });
}, "No pudimos cambiar el estado.");

export const eliminarController = conIds(async (req, res, { torneoId }) => {
  await eliminarTorneo(torneoId, req.user);
  return res.json({ ok: true, mensaje: "Torneo borrado." });
}, "No pudimos borrar el torneo.");

export const crearCategoriaController = conIds(async (req, res, { torneoId }) =>
  res.status(201).json({ ok: true, mensaje: "Categoría agregada.", data: await crearCategoria(torneoId, req.user, req.body) }), "No pudimos agregar la categoría.");

export const actualizarCategoriaController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, mensaje: "Categoría actualizada.", data: await actualizarCategoria(torneoId, categoriaId, req.user, req.body) }), "No pudimos actualizar la categoría.");

export const eliminarCategoriaController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, mensaje: "Categoría quitada.", data: await eliminarCategoria(torneoId, categoriaId, req.user) }), "No pudimos quitar la categoría.");

export const premiosController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, mensaje: "Premios guardados.", data: await guardarPremios(torneoId, categoriaId, req.user, req.body?.premios) }), "No pudimos guardar los premios.");
