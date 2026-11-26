import { z } from "zod";

// Reglas y forma de la entrada de stock, sin acceso a la base (tests/stock.test.mjs).
export const MAX_CANTIDAD = 1000000;

/** MST-06: "agotado" sin unidades; "bajo" en el mínimo o por debajo (si tiene mínimo). */
export const estadoStock = ({ cantidad, minimo }) => (cantidad <= 0 ? "agotado" : minimo > 0 && cantidad <= minimo ? "bajo" : "ok");

/**
 * Cuánto cambia la cantidad con un movimiento. Entrada suma, salida resta y ajuste deja la cantidad
 * contada. MST-03: nunca negativa.
 */
export function variacion(tipo, cantidad, actual) {
  const delta = tipo === "entrada" ? cantidad : tipo === "salida" ? -cantidad : cantidad - actual;
  if (actual + delta < 0) return { error: `No alcanza: hay ${actual} y querés sacar ${-delta}.` };
  if (actual + delta > MAX_CANTIDAD) return { error: `El stock no puede pasar de ${MAX_CANTIDAD}.` };
  return { delta, saldo: actual + delta };
}

/** MST-04: estados del pedido con las unidades ya separadas del stock. */
const CON_STOCK_TOMADO = new Set(["confirmado", "listo", "entregado"]);
/** Qué le hace un cambio de estado al stock: "descontar", "devolver" o nada. */
export function efectoDelPedido(de, a) {
  const antes = CON_STOCK_TOMADO.has(de);
  const despues = CON_STOCK_TOMADO.has(a);
  if (!antes && despues) return "descontar";
  if (antes && !despues) return "devolver";
  return null;
}

// ── Esquemas de entrada ─────────────────────────────────────────────────────
const vacioANull = (esquema) => z.preprocess((v) => (v === "" || v === undefined ? null : v), esquema.nullable());
const motivo = vacioANull(z.string().trim().max(200, "Máximo 200 caracteres.").transform((v) => v || null));
const entero = (mensaje, min = 0) => z.coerce.number({ error: mensaje }).int("Usá un número entero.").min(min, min ? `Desde ${min}.` : "No puede ser negativo.").max(MAX_CANTIDAD, `Hasta ${MAX_CANTIDAD}.`);
const id = (mensaje) => z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje).max(2147483647, mensaje);

export const esquemaVariante = z.object({ variante_id: id("Esa opción no existe.") });
export const esquemaFiltros = z.object({
  estado: z.enum(["controlados", "reponer", "agotado", "sin_control"]).optional().catch(undefined),
  q: z.string().trim().max(80).default("").catch(""),
  page: z.coerce.number().int().min(1).max(100000).default(1).catch(1),
});
export const esquemaControlar = z.object({ cantidad: entero("Escribí cuántas hay."), minimo: entero("Escribí el mínimo.").default(0) });
export const esquemaMinimo = z.object({ minimo: entero("Escribí el mínimo.") });
/** MST-03: salidas y ajustes piden motivo; una entrada, no (sería "compra" casi siempre). */
export const esquemaMovimiento = z.object({
  tipo: z.enum(["entrada", "salida", "ajuste"], { error: "Elegí qué movimiento es." }),
  cantidad: z.coerce.number({ error: "Escribí la cantidad." }).int("Usá un número entero.").min(0, "No puede ser negativa.").max(MAX_CANTIDAD, `Hasta ${MAX_CANTIDAD}.`),
  motivo,
}).superRefine((m, ctx) => {
  if (m.tipo !== "ajuste" && m.cantidad < 1) ctx.addIssue({ code: "custom", path: ["cantidad"], message: "La cantidad mínima es 1." });
  if (m.tipo !== "entrada" && !m.motivo) ctx.addIssue({ code: "custom", path: ["motivo"], message: "Escribí el motivo." });
});
