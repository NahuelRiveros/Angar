import { z } from "zod";
import { TIENDA_POR_DEFECTO } from "../../../../../core/tienda_opciones.js";

// Reglas y forma de la entrada de pedidos, sin acceso a la base (tests/pedidos.test.mjs).
export const MAX_LINEAS = 50;
export const MAX_CANTIDAD = 99;


// ── Estados (MPE-07) ────────────────────────────────────────────────────────
export const ESTADOS = ["recibido", "confirmado", "listo", "entregado", "cancelado"];
export const NOMBRE_ESTADO = { recibido: "Recibido", confirmado: "Confirmado", listo: "Listo", entregado: "Entregado", cancelado: "Cancelado" };
const AVANZA = { recibido: "confirmado", confirmado: "listo", listo: "entregado" };
const VUELVE = { confirmado: "recibido", listo: "confirmado", entregado: "listo" };

/** Cómo se llama el paso de `de` a `a`, o null si no se puede. Todo lo que no es avanzar pide motivo. */
export function transicion(de, a) {
  if (AVANZA[de] === a) return { tipo: "avanzar", pideMotivo: false };
  if (VUELVE[de] === a) return { tipo: "volver", pideMotivo: true };
  if (a === "cancelado" && de in AVANZA) return { tipo: "cancelar", pideMotivo: true };
  if (de === "cancelado" && a === "recibido") return { tipo: "reabrir", pideMotivo: true };
  return null;
}

/** Los estados a los que puede pasar un pedido, en el orden en que se ofrecen. */
export const siguientes = (de) => ESTADOS.map((a) => ({ estado: a, ...transicion(de, a) })).filter((t) => t.tipo)
  .sort((x, y) => (x.tipo === "avanzar" ? -1 : 0) - (y.tipo === "avanzar" ? -1 : 0));

// ── Plata (MPE-02): siempre en centavos enteros ─────────────────────────────
/** "95000.5" → 9500050, sin pasar por decimales de punto flotante. */
export function aCentavos(monto) {
  const texto = typeof monto === "number" ? monto.toFixed(2) : String(monto).trim();
  const [, entero, decimales = ""] = texto.match(/^(\d+)(?:\.(\d{1,2}))?$/) ?? [];
  if (entero === undefined) throw new Error(`Monto inválido: ${monto}`);
  return Number(entero) * 100 + Number(decimales.padEnd(2, "0"));
}
export const deCentavos = (centavos) => `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;

/**
 * MPE-02 y MPE-03: arma las líneas del pedido con los datos de la base. `variantes`: Map id → { nombre,
 * producto, codigo, precio, vendible }. Si algo cambió, devuelve `cambios` y ninguna línea.
 */
export function armarLineas(items, variantes) {
  const cambios = [];
  const lineas = items.map(({ variante_id, cantidad, precio_visto }, orden) => {
    const v = variantes.get(variante_id);
    if (!v?.vendible) {
      cambios.push({ variante_id, tipo: "no_disponible", nombre: v ? nombreLinea(v) : null });
      return null;
    }
    const precio = aCentavos(v.precio);
    if (precio_visto !== undefined && (precio_visto === null || aCentavos(precio_visto) !== precio)) cambios.push({ variante_id, tipo: "precio", nombre: nombreLinea(v), precio: v.precio });
    return {
      variante_id, producto_nombre: v.producto, variante_nombre: v.nombre, codigo: v.codigo, cantidad, orden,
      precio: deCentavos(precio), subtotal: deCentavos(precio * cantidad), centavos: precio * cantidad,
    };
  });
  if (cambios.length) return { cambios, lineas: [], total: null };
  return { cambios, lineas: lineas.map(({ centavos: _c, ...l }) => l), total: deCentavos(lineas.reduce((suma, l) => suma + l.centavos, 0)) };
}
const nombreLinea = (v) => (v.nombre ? `${v.producto} (${v.nombre})` : v.producto);

/** "+54 9 11 1234-5678" → "5491112345678". */
export const soloDigitos = (texto) => String(texto ?? "").replace(/\D/g, "");

// ── Esquemas de entrada ─────────────────────────────────────────────────────
const vacioANull = (esquema) => z.preprocess((v) => (v === "" || v === undefined ? null : v), esquema.nullable());
const texto = (etiqueta, max) => z.string({ error: `Escribí ${etiqueta}.` }).trim().min(1, `Escribí ${etiqueta}.`).max(max, `Máximo ${max} caracteres.`);
const textoOpcional = (max) => vacioANull(z.string().trim().max(max, `Máximo ${max} caracteres.`).transform((v) => v || null));
const id = (mensaje) => z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje).max(2147483647, mensaje);
const pagina = z.coerce.number().int().min(1).max(100000).default(1).catch(1);

const esquemaItem = z.object({
  variante_id: id("Ese producto no existe."),
  cantidad: z.coerce.number({ error: "Elegí una cantidad." }).int("La cantidad tiene que ser entera.").min(1, "La cantidad mínima es 1.").max(MAX_CANTIDAD, `Hasta ${MAX_CANTIDAD} unidades.`),
  // Lo que la persona vio en la web: solo sirve para avisarle si cambió (MPE-03), nunca para cobrar.
  precio_visto: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]).nullable().optional().catch(null),
});

/** Lo que manda la web al enviar un pedido. `entregas`: las que ofrece el proyecto (MPE-12). */
export const esquemaEnviar = (entregas = TIENDA_POR_DEFECTO.entregas) => z.object({
  clave_envio: z.uuid("Recargá la página y probá de nuevo."),
  nombre: texto("tu nombre", 80),
  celular: z.string({ error: "Escribí tu celular." }).transform(soloDigitos)
    .refine((v) => v.length >= 8 && v.length <= 15, "Escribí tu celular con la característica, sin el 0 ni el 15."),
  entrega: z.enum(entregas, { error: "Elegí cómo lo recibís." }),
  direccion: textoOpcional(150),
  localidad: textoOpcional(80),
  nota: textoOpcional(500),
  items: z.array(esquemaItem, { error: "Tu carrito está vacío." }).min(1, "Tu carrito está vacío.").max(MAX_LINEAS, `Hasta ${MAX_LINEAS} productos distintos por pedido.`),
}).superRefine((pedido, ctx) => {
  if (pedido.entrega === "envio") {
    if (!pedido.direccion) ctx.addIssue({ code: "custom", path: ["direccion"], message: "Escribí la dirección de entrega." });
    if (!pedido.localidad) ctx.addIssue({ code: "custom", path: ["localidad"], message: "Escribí la localidad." });
  }
  const ids = pedido.items.map((i) => i.variante_id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["items"], message: "Hay un producto repetido en el carrito." });
}).transform((pedido) => (pedido.entrega === "retiro" ? { ...pedido, direccion: null, localidad: null } : pedido));

export const esquemaId = z.object({ id: id("Ese pedido no existe.") });
export const esquemaClave = z.object({ clave: z.string().regex(/^[A-Za-z0-9_-]{20,32}$/, "Ese link no es válido.") });
export const esquemaPagina = z.object({ page: pagina });
export const esquemaFiltros = z.object({
  estado: z.enum(ESTADOS).optional().catch(undefined),
  q: z.string().trim().max(80).default("").catch(""),
  page: pagina,
});
export const esquemaCambioEstado = z.object({
  estado: z.enum(ESTADOS, { error: "Ese estado no existe." }),
  motivo: textoOpcional(300),
  version: z.coerce.number({ error: "Recargá la página y probá de nuevo." }).int().min(1),
});
