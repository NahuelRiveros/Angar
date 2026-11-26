import { useSearchParams } from "react-router-dom";

/** Filtros guardados en la dirección: se pueden compartir y sobreviven al botón "atrás". */
export function useFiltrosUrl(campos) {
  const [params, setParams] = useSearchParams();
  const filtros = {};
  for (const campo of [...campos, "page"]) if (params.get(campo)) filtros[campo] = params.get(campo);
  // Cambiar un filtro vuelve a la primera página.
  const cambiar = (cambios) => setParams((previos) => {
    const nuevos = new URLSearchParams(previos);
    for (const [campo, valor] of Object.entries({ page: "", ...cambios })) {
      if (valor) nuevos.set(campo, valor); else nuevos.delete(campo);
    }
    return nuevos;
  }, { replace: true });
  return { filtros, cambiar };
}
