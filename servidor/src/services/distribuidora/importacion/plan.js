import { createHash } from "node:crypto";
import { keyText } from "./normalize.js";
export const hash = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
export const groupKey = (...parts) => JSON.stringify(parts.map(keyText));
export const variantSnapshot = (v) => hash([v.id, v.producto_id, v.nombre, String(v.precio), String(v.iva_porcentaje), v.cantidad, v.controla_stock, v.cod_ref, v.fecha_baja]);
export function categoryPaths(categories) {
  const ids = new Map(categories.map((c) => [c.id, c])), paths = new Map();
  const resolve = (id, visited = new Set()) => {
    if (paths.has(id)) return paths.get(id);
    if (visited.has(id)) throw new Error("El árbol de categorías contiene un ciclo.");
    visited.add(id);
    const cat = ids.get(id); if (!cat) return "";
    const path = (cat.padre_id ? resolve(cat.padre_id, visited) + " > " : "") + cat.nombre;
    paths.set(id, path); return path;
  };
  categories.forEach((c) => resolve(c.id)); return paths;
}
const index = (rows, fn) => {
  const out = new Map();
  for (const row of rows) { const key = fn(row); if (!out.has(key)) out.set(key, []); out.get(key).push(row); }
  return out;
};
export function buildPlan(rows, settings, catalog) {
  const paths = categoryPaths(catalog.categories);
  const products = new Map(catalog.products.map((p) => [p.id, p]));
  const byName = index(catalog.products, (p) => groupKey(paths.get(p.categoria_id), p.nombre));
  const bySku = index(catalog.variants.filter((v) => v.cod_ref), (v) => v.cod_ref);
  const byPresentation = index(catalog.variants, (v) => groupKey(v.producto_id, v.nombre));
  const duplicates = index(rows.filter((r) => r.value), (r) => settings.identity === "sku" ? r.value.cod_ref : groupKey(r.value.categoria, r.value.producto_nombre, r.value.variedad_nombre));
  const inputPresentations = index(rows.filter((r) => r.value?.producto_nombre && r.value.categoria), (r) => groupKey(r.value.categoria, r.value.producto_nombre, r.value.variedad_nombre));
  return rows.map((row) => {
    if (row.action === "error") return row;
    const value = row.value;
    const error = (message) => ({ row: row.row, value, action: "error", message });
    const identity = settings.identity === "sku" ? value.cod_ref : groupKey(value.categoria, value.producto_nombre, value.variedad_nombre);
    if (duplicates.get(identity)?.length > 1) return error("Identificador repetido en el archivo. Dejá una fila por presentación.");
    if (inputPresentations.get(groupKey(value.categoria, value.producto_nombre, value.variedad_nombre))?.length > 1) return error("La misma presentación aparece con códigos distintos. Revisá nombre o presentación.");
    if (settings.identity === "name" && !value.categoria) return error("La coincidencia por nombre requiere categoría y presentación.");
    let variant, product;
    if (settings.identity === "sku") {
      const matches = bySku.get(value.cod_ref) || [];
      if (matches.length > 1) return error("El SKU está repetido en la base. Corregí el catálogo antes de importar.");
      variant = matches[0]; product = variant && products.get(variant.producto_id);
      if (variant && !product) return error("El SKU pertenece a un producto dado de baja.");
    }
    const candidates = byName.get(groupKey(value.categoria, value.producto_nombre)) || [];
    if (!product && candidates.length > 1) return error("Hay más de un producto con ese nombre y categoría.");
    if (!product) product = candidates[0];
    const presentations = product ? byPresentation.get(groupKey(product.id, value.variedad_nombre)) || [] : [];
    if (!variant && presentations.length > 1) return error("La presentación es ambigua en la base.");
    if (settings.identity === "name") {
      variant = presentations[0];
      const matches = value.cod_ref ? bySku.get(value.cod_ref) || [] : [];
      if (matches.some((v) => v.id !== variant?.id) || variant?.cod_ref && value.cod_ref && variant.cod_ref !== value.cod_ref) return error("El código y la presentación identifican registros distintos.");
    } else if (!variant && presentations.length) return error("La presentación ya existe con otro código o sin código. Revisá el SKU o vinculala explícitamente por nombre.");
    if (variant && settings.mode === "create") return { row: row.row, value, action: "skip", message: "Ya existe: modo solo crear." };
    if (!variant && settings.mode === "update") return { row: row.row, value, action: "skip", message: "No existe: modo solo actualizar." };
    if (!variant && (!value.producto_nombre || !value.categoria)) return error("Para crear faltan nombre o categoría (podés indicar una categoría predeterminada).");
    const vat = variant
      ? settings.updateFields.includes("iva_porcentaje") && value.iva_porcentaje != null ? value.iva_porcentaje : Number(variant.iva_porcentaje)
      : value.iva_porcentaje ?? settings.defaultVat;
    const price = Math.round((settings.priceType === "gross" ? value.importe / (1 + vat / 100) : value.importe) * 100) / 100;
    const patch = {};
    if (!variant || settings.updateFields.includes("precio")) patch.precio = price;
    if (!variant || settings.updateFields.includes("iva_porcentaje") && value.iva_porcentaje != null) patch.iva_porcentaje = vat;
    if (!variant || settings.updateFields.includes("cantidad") && value.cantidad != null) {
      patch.cantidad = value.cantidad ?? 0;
      patch.controla_stock = value.cantidad != null;
    }
    if (!variant || !variant.cod_ref && value.cod_ref) patch.cod_ref = value.cod_ref;
    // Datos de la ficha que se cargan a mano: en existentes solo se completan si faltaban.
    if (value.codigo_barras && (!variant || !variant.codigo_barras)) patch.codigo_barras = value.codigo_barras;
    if (value.unidades_por_bulto != null && (!variant || Number(variant.unidades_por_bulto ?? 1) <= 1)) patch.unidades_por_bulto = value.unidades_por_bulto;
    const changed = variant && Object.entries(patch).some(([k,v]) => ["precio", "iva_porcentaje", "cantidad", "unidades_por_bulto"].includes(k) ? Number(variant[k]) !== v : variant[k] !== v);
    return {
      row: row.row, value, action: variant ? changed ? "update" : "unchanged" : "create", patch,
      target: variant?.id ?? null, productId: product?.id ?? null,
      before: variant ? variantSnapshot(variant) : null,
      productBefore: product ? hash([product.nombre, product.categoria_id, product.activo, product.fecha_baja]) : null,
      previousPrice: variant ? Number(variant.precio) : null, finalPrice: price,
      message: variant ? "Se conservan nombre, marca, descripción, categoría, imágenes y campos no seleccionados." : "Nueva presentación.",
    };
  });
}
export function summarize(rows) {
  const result = { total: rows.length, create: 0, update: 0, unchanged: 0, skip: 0, error: 0 };
  for (const row of rows) result[row.action]++;
  return result;
}
