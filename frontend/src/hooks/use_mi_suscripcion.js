import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/auth_context.jsx";
import { getMiSuscripcion } from "../api/suscripcion_api.js";

export const claveMiSuscripcion = (usuarioId) => ["suscripcion", "mia", usuarioId];

/**
 * Plan del usuario logueado. Lo comparten el cartel de aviso y "Mi suscripción":
 * una sola consulta cacheada (el vencimiento cambia por día, no hace falta más seguido).
 */
export function useMiSuscripcion({ enabled = true } = {}) {
  const { usuario, isAuth } = useAuth();
  return useQuery({
    queryKey: claveMiSuscripcion(usuario?.usuario_id),
    queryFn: getMiSuscripcion,
    enabled: enabled && isAuth,
    staleTime: 10 * 60 * 1000,
  });
}
