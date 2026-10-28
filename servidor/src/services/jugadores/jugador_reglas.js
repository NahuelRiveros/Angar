// Historial de un jugador sin base de datos (se prueba en ux_rules.test.mjs).
import { PUESTOS_ALCANZADOS } from "../../../../torneo_config.js";

const ORDEN = Object.keys(PUESTOS_ALCANZADOS);

/**
 * Hasta dónde llegó una pareja en una categoría.
 * rondas: rondas de la llave (null si no hay llave); alcanzada: la ronda más alta en la que jugó;
 * campeon: ganó la final.
 */
export function puestoAlcanzado({ rondas, alcanzada, campeon }) {
  if (campeon) return "campeon";
  if (!rondas || !alcanzada) return "zona";
  const faltaban = rondas - alcanzada;
  return ["final", "semifinal", "cuartos", "octavos"][faltaban] ?? "llave";
}

/** Resumen para el perfil: torneos, títulos, finales, mejor puesto. */
export function resumirHistorial(participaciones) {
  const puestos = participaciones.map((p) => p.puesto);
  const mejor = puestos.length ? ORDEN[Math.min(...puestos.map((p) => ORDEN.indexOf(p)))] : null;
  return {
    torneos: new Set(participaciones.map((p) => p.torneo_id)).size,
    titulos: puestos.filter((p) => p === "campeon").length,
    finales: puestos.filter((p) => p === "campeon" || p === "final").length,
    mejor_puesto: mejor,
  };
}
