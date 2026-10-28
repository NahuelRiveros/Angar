import { http } from "../../../api/http.js";

/** Totales de usuarios registrados y los últimos, solo con nombre y fecha de alta (super admin). */
export async function getRegistrados({ page = 1 } = {}) {
  const r = await http.get("/admin/registrados", { params: { page } });
  return r.data;
}
