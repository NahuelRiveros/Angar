import {
  listarMarcas, resumenMarcas, obtenerMarca, ESTADOS_MARCA, crearMarca, actualizarMarca, unificarMarcas, eliminarMarca,
} from "../../services/distribuidora/marcas_distribuidora_service.js";

const idPositivo = (valor) => (Number.isInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null);
const MAX_CATEGORIAS = 500;
const MAX_UNIFICAR = 200;

// Errores de negocio del servicio (nombre repetido, asociación en uso, etc.).
function responderError(res, error, contexto) {
  if (error.codigo === "MARCA_EXISTE") return res.status(409).json({ ok: false, codigo: error.codigo, mensaje: error.message, data: error.marca ?? null });
  if (error.codigo === "MARCA_INVALIDA") return res.status(400).json({ ok: false, codigo: error.codigo, mensaje: error.message });
  console.error(`Error al ${contexto}:`, error);
  return res.status(500).json({ ok: false, mensaje: `Error interno al ${contexto}` });
}

function leerCuerpo(body) {
  const nombre = typeof body?.nombre === "string" ? body.nombre : "";
  const categorias = Array.isArray(body?.categorias) ? body.categorias.map(idPositivo) : null;
  if (!nombre.trim()) return { error: "Escribí el nombre de la marca." };
  if (!categorias || categorias.includes(null)) return { error: "Elegí las familias o categorías de la marca." };
  if (categorias.length > MAX_CATEGORIAS) return { error: `Se pueden asociar hasta ${MAX_CATEGORIAS} categorías.` };
  return { nombre, categorias };
}

export async function listarMarcasController(req, res) {
  try {
    const categoria = idPositivo(req.query.categoria) ?? undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    return res.json({ ok: true, data: await listarMarcas({ categoria, q }) });
  } catch (error) { return responderError(res, error, "listar las marcas"); }
}

export async function resumenMarcasController(req, res) {
  try {
    const { q, estado, orden, pagina, por_pagina } = req.query;
    const { marcas, pagination, totales } = await resumenMarcas({
      q: typeof q === "string" ? q.slice(0, 80) : undefined,
      categoria: idPositivo(req.query.categoria) ?? undefined,
      estado: ESTADOS_MARCA.includes(estado) ? estado : undefined,
      orden: orden === "articulos" ? "articulos" : "nombre",
      pagina, por_pagina,
    });
    return res.json({ ok: true, data: marcas, total: pagination.total, pagina: pagination.page, total_paginas: pagination.totalPages, totales });
  } catch (error) { return responderError(res, error, "listar las marcas"); }
}

export async function obtenerMarcaController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    const marca = id && await obtenerMarca(id);
    if (!marca) return res.status(404).json({ ok: false, mensaje: "Marca no encontrada" });
    return res.json({ ok: true, data: marca });
  } catch (error) { return responderError(res, error, "obtener la marca"); }
}

export async function crearMarcaController(req, res) {
  try {
    const { error, ...datos } = leerCuerpo(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: error });
    const marca = await crearMarca(datos);
    return res.status(201).json({ ok: true, mensaje: `Marca "${marca.nombre}" creada`, data: marca });
  } catch (error) { return responderError(res, error, "crear la marca"); }
}

export async function actualizarMarcaController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    const { error, ...datos } = leerCuerpo(req.body);
    if (!id || error) return res.status(400).json({ ok: false, mensaje: error ?? "Marca inválida" });
    const marca = await actualizarMarca(id, datos);
    if (!marca) return res.status(404).json({ ok: false, mensaje: "Marca no encontrada" });
    return res.json({ ok: true, mensaje: `Marca "${marca.nombre}" actualizada`, data: marca });
  } catch (error) { return responderError(res, error, "actualizar la marca"); }
}

export async function unificarMarcasController(req, res) {
  try {
    const destino = idPositivo(req.body?.destino_id);
    const origenes = Array.isArray(req.body?.origenes) ? [...new Set(req.body.origenes.map(idPositivo))] : [];
    if (!destino || origenes.length === 0 || origenes.includes(null)) return res.status(400).json({ ok: false, mensaje: "Elegí las marcas a unir y cuál queda." });
    if (origenes.length > MAX_UNIFICAR) return res.status(400).json({ ok: false, mensaje: `Se pueden unir hasta ${MAX_UNIFICAR} marcas por vez.` });
    const r = await unificarMarcas(origenes, destino);
    if (!r.ok) return res.status(404).json({ ok: false, mensaje: "Alguna marca ya no existe; actualizá la pantalla." });
    return res.json({ ok: true, mensaje: `Quedó "${r.marca}": ${r.articulos} artículo(s) actualizados`, data: { marca: r.marca, articulos: r.articulos } });
  } catch (error) { return responderError(res, error, "unificar las marcas"); }
}

export async function eliminarMarcaController(req, res) {
  try {
    const id = idPositivo(req.params.id);
    const r = id ? await eliminarMarca(id) : { ok: false };
    if (!r.ok) return res.status(404).json({ ok: false, mensaje: "Marca no encontrada" });
    return res.json({ ok: true, mensaje: "Marca eliminada", data: null });
  } catch (error) { return responderError(res, error, "eliminar la marca"); }
}
