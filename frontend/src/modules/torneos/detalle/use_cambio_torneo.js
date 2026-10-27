import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { useAuth } from "../../../auth/auth_context.jsx";
import { claveMiSuscripcion } from "../../../hooks/use_mi_suscripcion.js";

export const claveTorneo = (id) => ["torneos", Number(id)];
export const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

/**
 * Guardar algo del torneo: el servidor devuelve el torneo completo y va directo a la caché.
 * Si responde 402 (el plan venció mientras editaba) se refresca el plan para pasar a solo lectura.
 */
export function useCambioTorneo(torneoId, accion, { onExito } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { usuario } = useAuth();
  return useMutation({
    mutationFn: accion,
    onSuccess: async (r, variables) => {
      if (r?.data) queryClient.setQueryData(claveTorneo(torneoId), r.data);
      toast.success(r?.mensaje ?? "Listo");
      await queryClient.invalidateQueries({ queryKey: ["torneos", "mios"] });
      onExito?.(r, variables);
    },
    onError: (error) => {
      if (error?.response?.status === 402) queryClient.invalidateQueries({ queryKey: claveMiSuscripcion(usuario?.usuario_id) });
    },
  });
}
