import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api.js";

// Un proyecto puede usar estos hooks en sus propias pantallas.
const MIN = 60 * 1000;
const lista = (clave, pedir, filtros) => ({
  queryKey: ["catalogo", clave, filtros], queryFn: ({ signal }) => pedir(filtros, signal), placeholderData: keepPreviousData,
});

// ── Web ─────────────────────────────────────────────────────────────────────
export const useCategorias = () => useQuery({ queryKey: ["catalogo", "categorias"], queryFn: api.getCategorias, staleTime: 5 * MIN });
export const useDestacados = () => useQuery({ queryKey: ["catalogo", "destacados"], queryFn: api.getDestacados, staleTime: 5 * MIN });
export const useProductos = (filtros) => useQuery({ ...lista("productos", api.getProductos, filtros), staleTime: MIN });
export const useProducto = (slug) => useQuery({ queryKey: ["catalogo", "producto", slug], queryFn: () => api.getProducto(slug), staleTime: MIN, retry: false });

// ── Panel ───────────────────────────────────────────────────────────────────
/** Todo cambio refresca el catálogo entero: lo del panel también cambia lo que ve la web. */
function useAccion(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalogo"] }) });
}
export const useProductosPanel = (filtros) => useQuery(lista("productos-panel", api.getProductosPanel, filtros));
// Sin caché ni refresco al volver a la pestaña: el formulario arranca siempre de lo último y no se pisa lo escrito.
export const useProductoPanel = (id) => useQuery({ queryKey: ["catalogo", "producto-panel", id], queryFn: () => api.getProductoPanel(id), enabled: Boolean(id), gcTime: 0, refetchOnWindowFocus: false });
export const useGuardarProducto = () => useAccion(api.guardarProducto);
export const useEliminarProducto = () => useAccion(api.eliminarProducto);
export const useCategoriasPanel = () => useQuery({ queryKey: ["catalogo", "categorias-panel"], queryFn: api.getCategoriasPanel });
export const useGuardarCategoria = () => useAccion(api.guardarCategoria);
export const useEliminarCategoria = () => useAccion(api.eliminarCategoria);
