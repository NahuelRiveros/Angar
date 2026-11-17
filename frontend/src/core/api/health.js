import { http } from "./http";

// LISTAR
export async function verificarServidor() {
  const r = await http.get("/health");
  return r.data;
}
