// Reglas del torneo compartidas por la API y la interfaz (estados, categorías y premios).

export const ESTADOS_TORNEO = {
  borrador: { etiqueta: "Borrador", descripcion: "Solo lo ves vos. Cargá los datos y las categorías." },
  inscripcion: { etiqueta: "Inscripción", descripcion: "Publicado: las parejas se pueden anotar." },
  en_juego: { etiqueta: "En juego", descripcion: "Se están jugando las zonas y las llaves." },
  finalizado: { etiqueta: "Finalizado", descripcion: "Terminó. Queda como historial." },
  cancelado: { etiqueta: "Cancelado", descripcion: "Se suspendió. Queda como historial." },
};

// A qué estado se puede pasar desde cada uno, con el texto del botón.
export const TRANSICIONES = {
  borrador: [{ a: "inscripcion", accion: "Abrir inscripción" }, { a: "cancelado", accion: "Cancelar torneo" }],
  inscripcion: [{ a: "en_juego", accion: "Empezar a jugar" }, { a: "borrador", accion: "Volver a borrador" }, { a: "cancelado", accion: "Cancelar torneo" }],
  en_juego: [{ a: "finalizado", accion: "Finalizar torneo" }, { a: "cancelado", accion: "Cancelar torneo" }],
  finalizado: [],
  cancelado: [],
};

/** Qué se puede editar en cada estado. Finalizado y cancelado quedan cerrados. */
export const EDICION_POR_ESTADO = {
  borrador: { datos: true, categorias: true, premios: true },
  inscripcion: { datos: true, categorias: true, premios: true },
  // Con partidos en juego no se agregan ni quitan categorías.
  en_juego: { datos: true, categorias: false, premios: true },
  finalizado: { datos: false, categorias: false, premios: false },
  cancelado: { datos: false, categorias: false, premios: false },
};

export const NIVELES = [1, 2, 3, 4, 5, 6, 7, 8];
export const RAMAS = { caballeros: "Caballeros", damas: "Damas", mixto: "Mixto" };
const ORDINALES = { 1: "1ra", 2: "2da", 3: "3ra", 4: "4ta", 5: "5ta", 6: "6ta", 7: "7ma", 8: "8va" };
export const nombreNivel = (nivel) => ORDINALES[nivel] ?? "";

/** "4ta Caballeros" para las de lista; el nombre propio para las personalizadas ("Suma 13"). */
export function nombreCategoria({ nivel, rama, nombre_personalizado }) {
  const propio = String(nombre_personalizado ?? "").trim();
  if (propio) return propio;
  return [nombreNivel(nivel), RAMAS[rama]].filter(Boolean).join(" ");
}

export const PUESTOS = {
  campeon: "Campeón",
  subcampeon: "Subcampeón",
  semifinalista: "Semifinalista",
  cuartofinalista: "Cuartos de final",
  otro: "Otro",
};

export const LIMITES = {
  categoriasPorTorneo: 30,
  premiosPorCategoria: 10,
  cupoMinimo: 2,
  cupoMaximo: 256,
};

// ── Zonas, inscripciones y partidos ─────────────────────────────────────────

// Formato de los partidos de zona. sets: cuántos se juegan como máximo; games: a cuántos va
// cada set; superTieBreak: el último set se define con un super tie-break a 10.
export const FORMATOS_PARTIDO = {
  un_set_6: { etiqueta: "Un set a 6 games", sets: 1, games: 6, superTieBreak: false },
  un_set_9: { etiqueta: "Un set largo a 9 games", sets: 1, games: 9, superTieBreak: false },
  mejor_de_3: { etiqueta: "Al mejor de 3 sets", sets: 3, games: 6, superTieBreak: false },
  mejor_de_3_stb: { etiqueta: "Mejor de 3, el 3º con super tie-break", sets: 3, games: 6, superTieBreak: true },
};

export const ZONAS = {
  parejasPorZona: [3, 4, 5],
  clasificanPorZona: [1, 2],
  predeterminado: { parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", formato_llave: "mejor_de_3_stb" },
};

export const ESTADOS_INSCRIPCION = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  cancelada: "Dada de baja",
};

/** Cuándo se puede hacer cada cosa según el estado del torneo. */
export const PERMITIDO = {
  anotarseOnline: ["inscripcion"],
  cargarParejas: ["borrador", "inscripcion"],
  armarZonas: ["inscripcion", "en_juego"],
  cargarResultados: ["en_juego"],
  armarLlave: ["en_juego"],
};

