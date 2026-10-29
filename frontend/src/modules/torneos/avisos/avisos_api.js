import { useQuery } from "@tanstack/react-query";
import { http } from "../../../api/http.js";
import { useAuth } from "../../../auth/auth_context.jsx";

export const claveAvisos = (usuarioId) => ["avisos", usuarioId];

/** Novedades de la campanita: { avisos, no_leidos }. */
export async function getMisAvisos() {
  const r = await http.get("/avisos");
  return r.data.data;
}

export async function marcarAvisosLeidos() {
  const r = await http.post("/avisos/leidos");
  return r.data.data;
}

export async function cambiarRecibirMails(recibir) {
  const r = await http.put("/avisos/preferencias", { recibir_mails: recibir });
  return r.data.data;
}

/** Una sola consulta en caché (5 min), sin repetirla cada tanto: Neon cobra mientras está despierta. */
export function useMisAvisos() {
  const { usuario } = useAuth();
  return useQuery({ queryKey: claveAvisos(usuario?.usuario_id), queryFn: getMisAvisos, enabled: Boolean(usuario), staleTime: 5 * 60 * 1000 });
}
