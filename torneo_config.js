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
  // Monto de inscripción por pareja, en pesos.
  montoMaximo: 10000000,
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

// ── Cálculo de zonas y llave ────────────────────────────────────────────────
// Lo usan el sorteo y la llave del servidor y el cálculo que ve el organizador: una sola cuenta.

/**
 * Cuántas parejas va a tener cada zona. Busca zonas del tamaño pedido (o una más si sobran);
 * si para eso alguna tendría que quedar con 2, prefiere una zona más grande.
 */
export function tamaniosDeZonas(cantidad, parejasPorZona) {
  if (cantidad < 2) return [];
  const repartir = (zonas) => Array.from({ length: zonas }, (_, i) => Math.floor(cantidad / zonas) + (i < cantidad % zonas ? 1 : 0));
  const pocas = Math.max(1, Math.floor(cantidad / parejasPorZona));
  const tamanios = repartir(pocas);
  if (tamanios[0] <= parejasPorZona + 1) return tamanios;
  const masZonas = repartir(Math.ceil(cantidad / parejasPorZona));
  return Math.min(...masZonas) >= 3 ? masZonas : tamanios;
}

export const potenciaDeDos = (n) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

/** "Final", "Semifinal", "Cuartos de final"… según cuántos partidos tiene la ronda. */
export function nombreRonda(partidosEnRonda) {
  return { 1: "Final", 2: "Semifinal", 4: "Cuartos de final", 8: "Octavos de final", 16: "16avos de final" }[partidosEnRonda] ?? `Ronda de ${partidosEnRonda * 2}`;
}

/**
 * Cómo se completa la llave con `directos` clasificados: tamaño (potencia de 2), cuántos lugares
 * se llenan con los mejores del puesto siguiente (terceros, o segundos si clasifica 1) de las
 * `disponibles` zonas que los tienen, y cuántos quedan como pases (byes). Con menos de 2 no hay llave.
 */
export function completarLlave(directos, disponibles) {
  if (directos < 2) return null;
  const tamanio = potenciaDeDos(directos);
  const mejores = Math.min(tamanio - directos, disponibles);
  return { tamanio, mejores, pases: tamanio - directos - mejores };
}

/**
 * Qué torneo sale con `cantidad` parejas: zonas, clasificados directos y llave. Los lugares que
 * sobran en la llave los toman los mejores del puesto siguiente; si no alcanzan, quedan pases.
 */
export function planDeLlave(cantidad, parejasPorZona, clasificanPorZona) {
  const zonas = tamaniosDeZonas(cantidad, parejasPorZona);
  if (!zonas.length) return null;
  const clasificados = zonas.reduce((suma, t) => suma + Math.min(clasificanPorZona, t), 0);
  const llave = completarLlave(clasificados, zonas.filter((t) => t > clasificanPorZona).length);
  if (!llave) return { zonas, clasificados, llave: null };
  return { zonas, clasificados, llave: { ...llave, puestoMejores: clasificanPorZona + 1, primeraRonda: nombreRonda(llave.tamanio / 2) } };
}

/** Llave justa: la llenan los clasificados directos, sin mejores del puesto siguiente ni pases. */
export const llaveJusta = (plan) => Boolean(plan?.llave) && plan.llave.mejores === 0 && plan.llave.pases === 0;

export const zonasIguales = (plan) => new Set(plan.zonas).size === 1;

/** Cupos que dan todas las zonas del mismo tamaño (de 2 a `maximoZonas` zonas): nadie juega menos partidos. */
export function cuposConZonasIguales(parejasPorZona, maximoZonas = 16) {
  return Array.from({ length: maximoZonas - 1 }, (_, i) => parejasPorZona * (i + 2)).filter((n) => n <= LIMITES.cupoMaximo);
}

// Pago de la inscripción con comprobante (null = todavía no mandó ninguno).
export const ESTADOS_PAGO_INSCRIPCION = {
  en_revision: "Comprobante en revisión",
  aprobado: "Pago aprobado",
  rechazado: "Comprobante rechazado",
};

export const ESTADOS_INSCRIPCION = {
  esperando: "Esperando al compañero",
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
  // Día, hora y cancha: se pueden publicar antes de empezar a jugar.
  programarPartidos: ["inscripcion", "en_juego"],
  // La pareja paga la inscripción mientras está abierta.
  pagarInscripcion: ["inscripcion"],
  armarLlave: ["en_juego"],
};

// Hasta dónde llegó una pareja, de mejor a peor (historial y perfil del jugador).
// "final" = llegó a la final y no la ganó (o todavía se juega).
export const PUESTOS_ALCANZADOS = {
  campeon: "Campeón",
  final: "Finalista",
  semifinal: "Semifinal",
  cuartos: "Cuartos de final",
  octavos: "Octavos de final",
  llave: "Llave",
  zona: "Zona",
};
