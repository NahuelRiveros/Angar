import { http } from "../../../api/http.js";

export async function getProductos(params = {}, options = {}) {
  const { data } = await http.get("/distribuidora/productos", { params, ...options });
  return data; // { ok, data, total, pagina, total_paginas }
}

export async function getProducto(id, options = {}) {
  const { data } = await http.get(`/distribuidora/productos/${id}`, options);
  return data.data;
}

export async function crearProducto(payload) {
  const { data } = await http.post("/distribuidora/productos", payload);
  return data;
}

export async function actualizarProducto(id, payload) {
  const { data } = await http.put(`/distribuidora/productos/${id}`, payload);
  return data;
}

export async function cambiarEstadoProducto(id, activo) {
  const { data } = await http.put(`/distribuidora/productos/${id}/estado`, { activo });
  return data;
}

export async function eliminarProducto(id) {
  const { data } = await http.delete(`/distribuidora/productos/${id}`);
  return data;
}

export async function ajustarPreciosMasivo(payload) {
  const { data } = await http.post("/distribuidora/productos/ajustar-precios", payload);
  return data;
}
