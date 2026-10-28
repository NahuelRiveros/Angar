import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth_context.jsx";
import { getMisInscripciones } from "./api/torneos_api.js";

export const claveMisInscripciones = (usuarioId) => ["mis-inscripciones", usuarioId];

/**
 * Las inscripciones del usuario. La comparten "Mis inscripciones" y la campanita de avisos:
 * una sola consulta en caché, sin repetirla cada tanto (Neon cobra mientras está despierta).
 * Lo que cambia (anotarse, mandar un comprobante) la invalida.
 */
export function useMisInscripciones() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: claveMisInscripciones(usuario?.usuario_id),
    queryFn: getMisInscripciones,
    enabled: Boolean(usuario),
    staleTime: 5 * 60 * 1000,
  });
}
