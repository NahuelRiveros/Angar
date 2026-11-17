import { http } from "./http";

/** { grupos, permisos, roles }: la grilla del panel de permisos. */
export async function getPermisos() {
  const { data } = await http.get("/permisos");
  return data.data;
}

export async function crearRol(nombre) {
  const { data } = await http.post("/permisos/roles", { nombre });
  return data;
}

export async function guardarPermisosRol(rolId, permisos) {
  const { data } = await http.put(`/permisos/roles/${rolId}`, { permisos });
  return data;
}

export async function eliminarRol(rolId) {
  const { data } = await http.delete(`/permisos/roles/${rolId}`);
  return data;
}
