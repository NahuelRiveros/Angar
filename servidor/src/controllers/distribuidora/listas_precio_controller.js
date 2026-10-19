import {
  listarListas, obtenerLista, guardarLista, eliminarLista, listarPreciosDeLista, guardarPreciosDeLista, importarPreciosDeLista,
} from "../../services/distribuidora/listas_precio_service.js";

const idPositivo = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);
const MAX_FILAS = 2000;

function responderError(res, error, contexto) {
  if (error.codigo === "LISTA_INVALIDA") return res.status(400).json({ ok: false, codigo: error.codigo, mensaje: error.message });
  if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ ok: false, mensaje: "Una localidad pertenece a una sola lista o el nombre ya existe." });
  console.error(`Error al ${contexto}:`, error);
  return res.status(500).json({ ok: false, mensaje: `Error interno al ${contexto}` });
}

export async function listarListasController(_req, res) {
  try { return res.json({ ok: true, data: await listarListas() }); } catch (error) { return responderError(res, error, "listar las listas de precios"); }
}

export async function obtenerListaController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    const lista = id && await obtenerLista(id);
    if (!lista) return res.status(404).json({ ok: false, mensaje: "Lista no encontrada" });
    return res.json({ ok: true, data: lista });
  } catch (error) { return responderError(res, error, "obtener la lista de precios"); }
}

function leerLista(body) {
  return { nombre: typeof body?.nombre === "string" ? body.nombre : "", activo: body?.activo !== false, localidades: body?.localidades };
}

export async function crearListaController(req, res) {
  try {
    const lista = await guardarLista(null, leerLista(req.body));
    return res.status(201).json({ ok: true, mensaje: `Lista "${lista.nombre}" creada`, data: lista });
  } catch (error) { return responderError(res, error, "crear la lista de precios"); }
}

export async function actualizarListaController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    const lista = id && await guardarLista(id, leerLista(req.body));
    if (!lista) return res.status(404).json({ ok: false, mensaje: "Lista no encontrada" });
    return res.json({ ok: true, mensaje: `Lista "${lista.nombre}" guardada`, data: lista });
  } catch (error) { return responderError(res, error, "guardar la lista de precios"); }
}

export async function eliminarListaController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    if (!id || !await eliminarLista(id)) return res.status(404).json({ ok: false, mensaje: "Lista no encontrada" });
    return res.json({ ok: true, mensaje: "Lista eliminada: esas localidades vuelven a la General", data: null });
  } catch (error) { return responderError(res, error, "eliminar la lista de precios"); }
}

export async function listarPreciosController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    if (!id) return res.status(400).json({ ok: false, mensaje: "Lista inválida" });
    const { q, pagina, por_pagina } = req.query;
    const { filas, pagination } = await listarPreciosDeLista(id, {
      q: typeof q === "string" ? q : undefined, solo_especiales: req.query.solo_especiales === "1", pagina, por_pagina,
    });
    return res.json({ ok: true, data: filas, total: pagination.total, pagina: pagination.page, total_paginas: pagination.totalPages });
  } catch (error) { return responderError(res, error, "listar los precios de la lista"); }
}

const resumenGuardado = (r, verbo) => `${r.guardados} precio(s) ${verbo}${r.quitados ? `, ${r.quitados} vuelven a la General` : ""}`;

export async function guardarPreciosController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    const filas = Array.isArray(req.body?.precios) ? req.body.precios : null;
    if (!id || !filas?.length) return res.status(400).json({ ok: false, mensaje: "No hay precios para guardar." });
    if (filas.length > MAX_FILAS) return res.status(400).json({ ok: false, mensaje: `Se pueden guardar hasta ${MAX_FILAS} precios por vez.` });
    if (filas.some((f) => !idPositivo(f?.variedad_id))) return res.status(400).json({ ok: false, mensaje: "Artículo inválido." });
    const r = await guardarPreciosDeLista(id, filas.map((f) => ({ variedad_id: Number(f.variedad_id), precio: f.precio, precio_anterior: f.precio_anterior })));
    if (!r) return res.status(404).json({ ok: false, mensaje: "Lista no encontrada" });
    return res.json({ ok: true, mensaje: resumenGuardado(r, "guardados"), data: r });
  } catch (error) { return responderError(res, error, "guardar los precios de la lista"); }
}

export async function importarPreciosController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    const filas = Array.isArray(req.body?.filas) ? req.body.filas : null;
    if (!id || !filas?.length) return res.status(400).json({ ok: false, mensaje: "No hay filas para importar." });
    if (filas.length > MAX_FILAS) return res.status(400).json({ ok: false, mensaje: `Se pueden importar hasta ${MAX_FILAS} filas por vez.` });
    const r = await importarPreciosDeLista(id, filas.map((f) => ({ cod_ref: f?.cod_ref, precio: f?.precio, precio_anterior: f?.precio_anterior })));
    if (!r) return res.status(404).json({ ok: false, mensaje: "Lista no encontrada" });
    return res.json({ ok: true, mensaje: resumenGuardado(r, "importados"), data: r });
  } catch (error) { return responderError(res, error, "importar los precios de la lista"); }
}
