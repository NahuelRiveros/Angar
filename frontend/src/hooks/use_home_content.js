import { useEffect, useState } from "react";
import { obtenerContenidoHomePublico } from "../api/home_content_api.js";
import { normalizarTextosProfundo } from "../utils/normalizar_texto.js";

export function useHomeContent() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await obtenerContenidoHomePublico();
        if (!alive) return;
        setAreas(normalizarTextosProfundo(r?.data ?? []));
      } catch (e) {
        if (!alive) return;
        setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function contenidosDeArea(descripcion) {
    return areas.find((a) => a.descripcion === descripcion)?.contenidos ?? [];
  }

  return { areas, loading, error, contenidosDeArea };
}
