import { http } from "../../api/http.js";

// Torneos de muestra (solo super admin). Cada llamada devuelve la lista de torneos demo que quedan.
export async function getTorneosDemo() {
  const r = await http.get("/admin/demo");
  return r.data.data;
}

export async function crearTorneosDemo() {
  const r = await http.post("/admin/demo");
  return r.data;
}

export async function borrarTorneosDemo() {
  const r = await http.delete("/admin/demo");
  return r.data;
}
