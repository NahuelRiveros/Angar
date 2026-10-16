import { http } from "../../../api/http.js";

export async function getResumenPanel() {
  const { data } = await http.get("/distribuidora/panel/resumen");
  return data.data;
}
