import { http } from "./http.js";

// Banners de la tienda: carrusel del home y cinta superior (SIS-30 a SIS-39).

/** Público: { carrusel: [...], cinta: [...] } con los vigentes hoy. */
export async function getBannersVigentes() {
  const { data } = await http.get("/banners", { publicAccess: true });
  return data.data;
}

/** Panel: todos, con su `estado` (vigente, programado, vencido, inactivo). */
export async function getBannersAdmin() {
  const { data } = await http.get("/banners/admin");
  return data.data;
}

export async function crearBanner(banner) {
  const { data } = await http.post("/banners", banner);
  return data;
}

export async function actualizarBanner(id, banner) {
  const { data } = await http.put(`/banners/${id}`, banner);
  return data;
}

export async function cambiarEstadoBanner(id, activo) {
  const { data } = await http.patch(`/banners/${id}/estado`, { activo });
  return data;
}

export async function eliminarBanner(id) {
  const { data } = await http.delete(`/banners/${id}`);
  return data;
}
