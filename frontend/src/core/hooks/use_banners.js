import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarBanner, cambiarEstadoBanner, crearBanner, eliminarBanner, getBannersAdmin, getBannersVigentes,
} from "../api/banners_api.js";

const CLAVE_VIGENTES = ["banners", "vigentes"];
const CLAVE_ADMIN = ["banners", "admin"];
const SIN_BANNERS = { carrusel: [], cinta: [] };

/** Carrusel y cinta del sitio. Cambian poco y se piden en cada página: 5 minutos de caché. */
export function useBannersVigentes() {
  const consulta = useQuery({ queryKey: CLAVE_VIGENTES, queryFn: getBannersVigentes, staleTime: 5 * 60 * 1000 });
  return { ...consulta, banners: consulta.data ?? SIN_BANNERS };
}

export function useBannersAdmin() {
  return useQuery({ queryKey: CLAVE_ADMIN, queryFn: getBannersAdmin });
}

/** Alta, edición, estado y baja. Cada cambio refresca el panel y lo que ve el sitio. */
export function useGestionBanners() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ["banners"] });

  const guardar = useMutation({
    mutationFn: ({ id, ...banner }) => (id ? actualizarBanner(id, banner) : crearBanner(banner)),
    onSuccess,
  });
  const cambiarEstado = useMutation({ mutationFn: ({ id, activo }) => cambiarEstadoBanner(id, activo), onSuccess });
  const eliminar = useMutation({ mutationFn: eliminarBanner, onSuccess });

  return { guardar, cambiarEstado, eliminar };
}

/** El mensaje en español que manda el servidor, o uno genérico. */
export const mensajeDeError = (error, porDefecto) => error?.response?.data?.mensaje ?? porDefecto;
