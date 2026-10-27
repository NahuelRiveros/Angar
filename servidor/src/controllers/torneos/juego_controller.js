import {
  listarInscripciones, cargarPareja, editarPareja, confirmarInscripcion, rechazarInscripcion, darDeBaja,
  anotarseOnline, misInscripciones, cancelarMia,
} from "../../services/torneos/inscripcion_service.js";
import { verZonas, generarZonas, moverPareja, cargarResultado, borrarResultado } from "../../services/torneos/zona_service.js";
import { verLlave, armarLlaveCategoria, deshacerLlave } from "../../services/torneos/llave_service.js";
import { listarTorneosPublicos, verTorneoPublico, verCategoriaPublica } from "../../services/torneos/publico_service.js";
import { conIds, responderError } from "./torneo_controller.js";

// ── Organizador: inscripciones ──────────────────────────────────────────────
export const listarInscripcionesController = conIds(async (req, res, { torneoId }) =>
  res.json({ ok: true, data: await listarInscripciones(torneoId, req.user, req.query) }), "No pudimos cargar las inscripciones.");

export const cargarParejaController = conIds(async (req, res, { torneoId }) =>
  res.status(201).json({ ok: true, mensaje: "Pareja agregada y confirmada.", data: await cargarPareja(torneoId, req.user, req.body) }), "No pudimos agregar la pareja.");

export const editarParejaController = conIds(async (req, res, { torneoId, inscripcionId }) =>
  res.json({ ok: true, mensaje: "Pareja actualizada.", data: await editarPareja(torneoId, inscripcionId, req.user, req.body) }), "No pudimos actualizar la pareja.");

export const confirmarController = conIds(async (req, res, { torneoId, inscripcionId }) =>
  res.json({ ok: true, mensaje: "Inscripción confirmada.", data: await confirmarInscripcion(torneoId, inscripcionId, req.user) }), "No pudimos confirmar la inscripción.");

export const rechazarController = conIds(async (req, res, { torneoId, inscripcionId }) =>
  res.json({ ok: true, mensaje: "Inscripción rechazada.", data: await rechazarInscripcion(torneoId, inscripcionId, req.user, req.body) }), "No pudimos rechazar la inscripción.");

export const bajaController = conIds(async (req, res, { torneoId, inscripcionId }) =>
  res.json({ ok: true, mensaje: "Pareja dada de baja.", data: await darDeBaja(torneoId, inscripcionId, req.user) }), "No pudimos dar de baja la pareja.");

// ── Organizador: zonas y resultados ─────────────────────────────────────────
export const verZonasController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, data: await verZonas(torneoId, categoriaId, req.user) }), "No pudimos cargar las zonas.");

export const generarZonasController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, mensaje: "Zonas armadas.", data: await generarZonas(torneoId, categoriaId, req.user) }), "No pudimos armar las zonas.");

export const moverParejaController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, mensaje: "Pareja movida.", data: await moverPareja(torneoId, categoriaId, req.user, req.body) }), "No pudimos mover la pareja.");

export const resultadoController = conIds(async (req, res, { torneoId, partidoId }) =>
  res.json({ ok: true, mensaje: "Resultado guardado.", data: await cargarResultado(torneoId, partidoId, req.user, req.body?.sets) }), "No pudimos guardar el resultado.");

export const borrarResultadoController = conIds(async (req, res, { torneoId, partidoId }) =>
  res.json({ ok: true, mensaje: "Resultado borrado.", data: await borrarResultado(torneoId, partidoId, req.user) }), "No pudimos borrar el resultado.");

// ── Organizador: llave ──────────────────────────────────────────────────────
export const verLlaveController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, data: await verLlave(torneoId, categoriaId, req.user) }), "No pudimos cargar la llave.");

export const armarLlaveController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, mensaje: "Llave armada.", data: await armarLlaveCategoria(torneoId, categoriaId, req.user) }), "No pudimos armar la llave.");

export const deshacerLlaveController = conIds(async (req, res, { torneoId, categoriaId }) =>
  res.json({ ok: true, mensaje: "Llave deshecha: ya podés corregir las zonas.", data: await deshacerLlave(torneoId, categoriaId, req.user) }), "No pudimos deshacer la llave.");

// ── Jugador ─────────────────────────────────────────────────────────────────
export async function anotarseController(req, res) {
  const torneoId = Number(req.body?.torneo_id);
  if (!Number.isInteger(torneoId) || torneoId <= 0) return res.status(400).json({ ok: false, codigo: "DATOS_INVALIDOS", mensaje: "Elegí el torneo." });
  try {
    await anotarseOnline(req.user, torneoId, req.body);
    return res.status(201).json({ ok: true, mensaje: "¡Listo! Tu inscripción quedó pendiente: el organizador la va a confirmar." });
  } catch (e) { return responderError(res, e, "No pudimos anotarte."); }
}

export async function misInscripcionesController(req, res) {
  try {
    return res.json({ ok: true, data: await misInscripciones(req.user) });
  } catch (e) { return responderError(res, e, "No pudimos cargar tus inscripciones."); }
}

export const cancelarMiaController = conIds(async (req, res, { inscripcionId }) => {
  await cancelarMia(req.user, inscripcionId);
  return res.json({ ok: true, mensaje: "Te bajaste del torneo." });
}, "No pudimos darte de baja.");

// ── Público ─────────────────────────────────────────────────────────────────
export async function torneosPublicosController(req, res) {
  try {
    res.set("Cache-Control", "public, max-age=60");
    return res.json({ ok: true, ...await listarTorneosPublicos({ page: req.query.page, limit: req.query.limit }) });
  } catch (e) { return responderError(res, e, "No pudimos cargar los torneos."); }
}

export const torneoPublicoController = conIds(async (req, res, { torneoId }) => {
  res.set("Cache-Control", "public, max-age=60");
  return res.json({ ok: true, data: await verTorneoPublico(torneoId) });
}, "No pudimos cargar el torneo.");

export const categoriaPublicaController = conIds(async (req, res, { torneoId, categoriaId }) => {
  // Corto: los resultados cambian durante el torneo. Sin consultas automáticas desde el navegador.
  res.set("Cache-Control", "public, max-age=30");
  return res.json({ ok: true, data: await verCategoriaPublica(torneoId, categoriaId) });
}, "No pudimos cargar los resultados.");
