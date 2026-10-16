import { http } from "../../../api/http.js";

const BASE = "/distribuidora/marcas";

// Con `categoria`: marcas de esa categoría y su familia; con `q`: búsqueda (máx. 20). Devuelve [{ id, nombre }].
export async function listarMarcas({ categoria, q } = {}) {
  const { data } = await http.get(BASE, { params: { categoria: categoria || undefined, q: q || undefined } });
  return data.data;
}

// Pantalla Marcas, paginada: { data, total, pagina, total_paginas, totales }.
export async function getResumenMarcas(params = {}) {
  const { data } = await http.get(`${BASE}/gestion`, { params });
  return data;
}

export async function getMarca(id) {
  const { data } = await http.get(`${BASE}/${id}`);
  return data.data;
}

export async function crearMarca(payload) {
  const { data } = await http.post(BASE, payload);
  return data;
}

export async function actualizarMarca(id, payload) {
  const { data } = await http.put(`${BASE}/${id}`, payload);
  return data;
}

export async function unificarMarcas(origenes, destinoId) {
  const { data } = await http.post(`${BASE}/unificar`, { origenes, destino_id: destinoId });
  return data;
}

export async function eliminarMarca(id) {
  const { data } = await http.delete(`${BASE}/${id}`);
  return data;
}
