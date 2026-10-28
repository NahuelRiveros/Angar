// Lista pública de torneos sin base de datos (se prueba en ux_rules.test.mjs).
import { NIVELES, RAMAS, nombreCategoria } from "../../../../torneo_config.js";

export const ESTADOS_PUBLICOS = ["inscripcion", "en_juego", "finalizado"];
const LARGO_BUSQUEDA = 60;
const LARGO_DESCRIPCION = 160;

/**
 * Filtros de la lista pública, con allowlist: lo que no se reconoce se ignora (no da error,
 * así un link viejo o tocado a mano igual muestra la lista). La búsqueda escapa % y _ del ILIKE.
 */
export function normalizarFiltros(query = {}) {
  const texto = typeof query.q === "string" ? query.q.trim().slice(0, LARGO_BUSQUEDA) : "";
  const nivel = Number(query.nivel);
  return {
    busqueda: texto ? texto.replace(/[\\%_]/g, "\\$&") : null,
    estado: ESTADOS_PUBLICOS.includes(query.estado) ? query.estado : null,
    rama: Object.hasOwn(RAMAS, query.rama ?? "") ? query.rama : null,
    nivel: NIVELES.includes(nivel) ? nivel : null,
  };
}

/** "Texto largo…" cortado en una palabra, para la tarjeta. */
function recortar(texto, largo = LARGO_DESCRIPCION) {
  const limpio = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (limpio.length <= largo) return limpio || null;
  return `${limpio.slice(0, largo).replace(/\s+\S*$/, "")}…`;
}

/**
 * Lo que la tarjeta cuenta de un torneo a partir de sus categorías (en orden):
 * nombres y ramas, el formato si todas juegan igual, parejas confirmadas, lugares libres
 * (solo si todas tienen cupo) y el premio del campeón de la primera categoría que lo tenga.
 */
export function resumirTorneo(torneo, categorias, confirmadasPorCategoria, premioCampeon) {
  const formatos = new Set(categorias.map((c) => `${c.parejas_por_zona}|${c.clasifican_por_zona}|${c.formato_zona}`));
  const [primera] = categorias;
  const parejas = categorias.reduce((suma, c) => suma + (confirmadasPorCategoria.get(c.id) ?? 0), 0);
  const conCupo = categorias.length > 0 && categorias.every((c) => c.cupo_parejas);
  return {
    ...torneo,
    descripcion: recortar(torneo.descripcion),
    categorias: categorias.map((c) => ({ nombre: nombreCategoria(c), rama: c.rama })),
    ramas: [...new Set(categorias.map((c) => c.rama).filter(Boolean))],
    formato: formatos.size === 1
      ? { parejas_por_zona: primera.parejas_por_zona, clasifican_por_zona: primera.clasifican_por_zona, formato_zona: primera.formato_zona }
      : null,
    parejas,
    lugares_libres: conCupo ? categorias.reduce((suma, c) => suma + Math.max(0, c.cupo_parejas - (confirmadasPorCategoria.get(c.id) ?? 0)), 0) : null,
    premio_campeon: premioCampeon ?? null,
  };
}
