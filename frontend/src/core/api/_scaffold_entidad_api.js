/**
 * PLANTILLA — forma que espera useCrudPage (ver pages/_scaffold/entidad_page_scaffold.jsx).
 * No es un recurso real: al copiar la page, copiá este archivo a `api/mi_entidad_api.js`
 * y reemplazá las rutas por las del backend real (mismo contrato que crud_service en el backend).
 */
import { http } from "./http.js";

export async function getEntidades() {
  const r = await http.get("/entidades");
  return r.data; // { ok, data: [...] }
}

export async function crearEntidad(payload) {
  const r = await http.post("/entidades", payload);
  return r.data;
}

export async function actualizarEntidad(id, payload) {
  const r = await http.put(`/entidades/${id}`, payload);
  return r.data;
}

export async function cambiarEstadoEntidad(id, activo) {
  const r = await http.patch(`/entidades/${id}/estado`, { activo });
  return r.data;
}
