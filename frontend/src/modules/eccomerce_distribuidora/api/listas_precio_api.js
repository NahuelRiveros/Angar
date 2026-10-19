import { http } from "../../../api/http.js";

const BASE = "/distribuidora/listas-precio";

export async function getListasPrecio() {
  const { data } = await http.get(BASE);
  return data.data;
}

export async function getListaPrecio(id) {
  const { data } = await http.get(`${BASE}/${id}`);
  return data.data;
}

// payload: { nombre, activo, localidades: [{ provincia, departamento, localidad }] }
export async function crearListaPrecio(payload) {
  const { data } = await http.post(BASE, payload);
  return data;
}

export async function actualizarListaPrecio(id, payload) {
  const { data } = await http.put(`${BASE}/${id}`, payload);
  return data;
}

export async function eliminarListaPrecio(id) {
  const { data } = await http.delete(`${BASE}/${id}`);
  return data;
}

// Paginado: { data, total, pagina, total_paginas }.
export async function getPreciosDeLista(id, params = {}) {
  const { data } = await http.get(`${BASE}/${id}/precios`, { params });
  return data;
}

// precios: [{ variedad_id, precio, precio_anterior }]; precio vacío vuelve a la General.
export async function guardarPreciosDeLista(id, precios) {
  const { data } = await http.put(`${BASE}/${id}/precios`, { precios });
  return data;
}

// filas: [{ cod_ref, precio, precio_anterior }] desde "Pegar desde Excel".
export async function importarPreciosDeLista(id, filas) {
  const { data } = await http.post(`${BASE}/${id}/precios/importar`, { filas });
  return data;
}
