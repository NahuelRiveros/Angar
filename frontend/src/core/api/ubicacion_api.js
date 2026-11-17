import { http } from "./http.js";

// División política de Argentina (provincia → departamento → localidad) —
// catálogo público y fijo, lo consume el select en cascada de
// perfil_campos.jsx. No requiere login (ver ubicacion_router.js).
export async function getProvincias() {
  const { data } = await http.get("/ubicacion/provincias", { publicAccess: true });
  return data.data;
}

export async function getDepartamentos(provinciaId) {
  if (!provinciaId) return [];
  const { data } = await http.get("/ubicacion/departamentos", { params: { provincia_id: provinciaId }, publicAccess: true });
  return data.data;
}

export async function getLocalidades(provinciaId, departamentoId) {
  if (!provinciaId) return [];
  const { data } = await http.get("/ubicacion/localidades", {
    params: { provincia_id: provinciaId, departamento_id: departamentoId || undefined },
    publicAccess: true,
  });
  return data.data;
}
