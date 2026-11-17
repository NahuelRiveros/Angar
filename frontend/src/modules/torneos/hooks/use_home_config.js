import { useEffect, useState } from "react";
import { obtenerConfigHomePublico } from "../api/home_content_api.js";
import { normalizarTexto, normalizarTextosProfundo } from "../../../core/utils/normalizar_texto.js";

/**
 * Textos, pilares, contactos y layout de galería del home — todo lo que NO
 * es la galería de medios en sí (ver use_home_content.js para eso).
 * `texto(clave, fallback)` devuelve el copy actual o el default hardcodeado
 * si todavía no cargó / la clave no existe — el home nunca se ve vacío.
 */
export function useHomeConfig() {
  const [textos, setTextos] = useState({});
  const [pilares, setPilares] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [layoutPorArea, setLayoutPorArea] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await obtenerConfigHomePublico();
        if (!alive) return;
        if (r?.ok) {
          setTextos(normalizarTextosProfundo(r.textos ?? {}));
          setPilares(normalizarTextosProfundo(r.pilares ?? []));
          setContactos(normalizarTextosProfundo(r.contactos ?? []));
          setLayoutPorArea(normalizarTextosProfundo(r.layoutPorArea ?? {}));
        }
      } catch {
        // silencioso: el home sigue con los fallbacks hardcodeados
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  function texto(clave, fallback = "") {
    return textos[clave] || normalizarTexto(fallback);
  }

  function layoutDeArea(descripcion) {
    return layoutPorArea[descripcion] || "grid";
  }

  return { texto, pilares, contactos, layoutDeArea, loading };
}
