import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api.js";

// Un proyecto puede usar estos hooks en sus propias pantallas. Sin consultas periódicas: se actualiza
// al volver a la pestaña o con el botón.
const MIN = 60 * 1000;

export const useEnviarPedido = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: api.enviarPedido, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos"] }) });
};
export const useSeguimiento = (clave) => useQuery({ queryKey: ["pedidos", "seguir", clave], queryFn: () => api.getSeguimiento(clave), staleTime: MIN, retry: false });
export const useMisPedidos = (filtros) => useQuery({ queryKey: ["pedidos", "mios", filtros], queryFn: () => api.getMisPedidos(filtros), placeholderData: keepPreviousData });

export const usePedidosPanel = (filtros) => useQuery({ queryKey: ["pedidos", "panel", filtros], queryFn: ({ signal }) => api.getPedidosPanel(filtros, signal), placeholderData: keepPreviousData });
export const usePedidoPanel = (id) => useQuery({ queryKey: ["pedidos", "panel", "detalle", id], queryFn: () => api.getPedidoPanel(id), retry: false });
export const useCambiarEstado = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: api.cambiarEstado, onSettled: () => queryClient.invalidateQueries({ queryKey: ["pedidos", "panel"] }) });
};
