import { z } from "zod";

// Reglas y forma de la entrada del catálogo, sin acceso a la base (tests/catalogo.test.mjs).
export const MAX_FOTOS = 5;
export const MAX_VARIANTES = 50;

/** "Casco Integral Ñandú" → "casco-integral-nandu". */
export const slug = (texto) => String(texto).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "producto";

/** MCA-07: el primero libre entre "casco", "casco-2", "casco-3"… */
export function slugLibre(texto, usados) {
  const base = slug(texto);
  const ocupados = new Set(usados);
  let candidato = base;
  for (let n = 2; ocupados.has(candidato); n++) candidato = `${base}-${n}`;
  return candidato;
}

/**
 * Lo que la tarjeta muestra de un producto a partir de sus variantes. `precio` es el más bajo;
 * `desde` avisa que hay otros más altos (o sin precio). El anterior, solo si hay una sola variante.
 */
export function resumenVariantes(variantes) {
  const centavos = (monto) => Math.round(Number(monto) * 100);
  const conPrecio = variantes.filter((v) => v.precio !== null);
  // Si algo está disponible, el precio que se muestra es de algo que se puede comprar.
  const candidatas = conPrecio.some((v) => v.disponible) ? conPrecio.filter((v) => v.disponible) : conPrecio;
  const barata = candidatas.reduce((menor, v) => (!menor || centavos(v.precio) < centavos(menor.precio) ? v : menor), null);
  return {
    precio: barata?.precio ?? null,
    precio_anterior: variantes.length === 1 ? barata?.precio_anterior ?? null : null,
    desde: variantes.length > 1 && Boolean(barata) && variantes.some((v) => v.precio === null || centavos(v.precio) !== centavos(barata.precio)),
    disponible: variantes.some((v) => v.disponible),
    con_opciones: variantes.length > 1,
  };
}

// ── Esquemas de entrada ─────────────────────────────────────────────────────
const vacioANull = (esquema) => z.preprocess((v) => (v === "" || v === undefined ? null : v), esquema.nullable());
const texto = (etiqueta, max) => z.string({ error: `Escribí ${etiqueta}.` }).trim().min(1, `Escribí ${etiqueta}.`).max(max, `Máximo ${max} caracteres.`);
const textoOpcional = (max) => vacioANull(z.string().trim().max(max, `Máximo ${max} caracteres.`).transform((v) => v || null));
const id = (mensaje) => z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje).max(2147483647, mensaje);
const precio = vacioANull(z.coerce.number({ error: "Escribí un precio válido." }).min(0, "El precio no puede ser negativo.").max(99999999, "El precio es demasiado alto.")
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Usá hasta dos decimales."));
const pagina = z.coerce.number().int().min(1).max(100000).default(1).catch(1);
const busqueda = z.string().trim().max(80).default("").catch("");
const direccion = z.string().regex(/^[a-z0-9-]{1,90}$/, "La dirección no es válida.");

export const esquemaId = z.object({ id: id("Ese código no es válido.") });
export const esquemaSlug = z.object({ slug: direccion });
export const esquemaFiltrosWeb = z.object({ categoria: direccion.optional().catch(undefined), q: busqueda, page: pagina });
export const esquemaFiltrosPanel = z.object({
  categoria_id: id("").optional().catch(undefined),
  estado: z.enum(["visibles", "ocultos", "sin_stock"]).optional().catch(undefined),
  q: busqueda,
  page: pagina,
});

export const esquemaCategoria = z.object({
  nombre: texto("el nombre", 60),
  padre_id: vacioANull(id("Esa categoría no existe.")),
  orden: z.coerce.number({ error: "Escribí un número." }).int("Usá un número entero.").min(0, "Desde 0.").max(999, "Hasta 999.").default(0),
  activo: z.boolean().default(true),
});

const esquemaVariante = z.object({
  id: vacioANull(id("Esa opción no existe.")),
  nombre: textoOpcional(60),
  codigo: textoOpcional(40),
  precio,
  precio_anterior: precio,
  disponible: z.boolean().default(true),
}).refine((v) => v.precio_anterior === null || (v.precio !== null && v.precio_anterior > v.precio), {
  path: ["precio_anterior"], message: "El precio anterior tiene que ser más alto que el precio.",
});

/** MCA-02: con más de una variante, cada una necesita un nombre propio para poder elegirla. */
function controlarVariantes(variantes, ctx) {
  const ids = variantes.map((v) => v.id).filter((v) => v !== null);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Hay una opción repetida." });
  if (variantes.length < 2) return;
  const vistos = new Set();
  variantes.forEach(({ nombre }, i) => {
    const clave = nombre?.toLowerCase();
    if (!clave) ctx.addIssue({ code: "custom", path: [i, "nombre"], message: "Con varias opciones, cada una necesita un nombre." });
    else if (vistos.has(clave)) ctx.addIssue({ code: "custom", path: [i, "nombre"], message: "Hay otra opción con ese nombre." });
    vistos.add(clave);
  });
}

export const esquemaProducto = z.object({
  nombre: texto("el nombre del producto", 120),
  categoria_id: id("Elegí la categoría."),
  descripcion: textoOpcional(4000),
  destacado: z.boolean().default(false),
  activo: z.boolean().default(true),
  variantes: z.array(esquemaVariante, { error: "Cargá al menos una opción." }).min(1, "Cargá al menos una opción.").max(MAX_VARIANTES, `Hasta ${MAX_VARIANTES} opciones.`).superRefine(controlarVariantes),
  fotos: z.array(z.string().trim().max(500, "La dirección de la foto es demasiado larga.").regex(/^https:\/\//, "La foto tiene que ser una dirección https."))
    .max(MAX_FOTOS, `Hasta ${MAX_FOTOS} fotos.`).default([]),
});
export const esquemaEditarProducto = esquemaProducto.extend({ version: z.coerce.number({ error: "Recargá la página y probá de nuevo." }).int().min(1) });
