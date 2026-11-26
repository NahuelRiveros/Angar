import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api.js";

// Un proyecto puede usar estos hooks en sus propias pantallas.
export const useStock = (filtros) => useQuery({ queryKey: ["stock", "lista", filtros], queryFn: ({ signal }) => api.getStock(filtros, signal), placeholderData: keepPreviousData });
export const useMovimientos = (variante_id, page) => useQuery({ queryKey: ["stock", "movimientos", variante_id, page], queryFn: () => api.getMovimientos(variante_id, { page }), placeholderData: keepPreviousData });

/** Mover stock cambia también lo que muestra el catálogo (MST-06). */
function useAccion(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ["stock"] }), queryClient.invalidateQueries({ queryKey: ["catalogo"] })]) });
}
export const useMover = () => useAccion(api.mover);
export const useControlar = () => useAccion(api.controlar);
export const useDejarDeControlar = () => useAccion(api.dejarDeControlar);
export const useCambiarMinimo = () => useAccion(api.cambiarMinimo);
