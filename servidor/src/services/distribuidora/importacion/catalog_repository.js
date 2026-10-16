import { Op, fn, col, where } from "sequelize";
import { CategoriaDistribuidora as Category, ProductoDistribuidora as Product, VariedadDistribuidora as Variant } from "../../../models/index.js";
import { groupKey, categoryPaths, hash } from "./plan.js";
import { keyText } from "./normalize.js";
const unique = (rows) => [...new Map(rows.map((r) => [r.id, r])).values()];
const chunks = (array, size = 500) => Array.from({ length: Math.ceil(array.length / size) }, (_, i) => array.slice(i * size, (i + 1) * size));
async function readChunks(Model, values, condition, transaction) {
  const out = [];
  for (const part of chunks([...new Set(values)])) out.push(...await Model.findAll({ where: { fecha_baja: null, ...condition(part) }, raw: true, transaction }));
  return out;
}
export async function loadCatalog(rows, transaction) {
  const values = rows.filter((r) => r.value).map((r) => r.value);
  const categories = await Category.findAll({ where: { fecha_baja: null }, raw: true, transaction });
  let products = await readChunks(Product, values.map((v) => keyText(v.producto_nombre)).filter(Boolean), (names) => ({ [Op.and]: where(fn("lower", col("nombre")), { [Op.in]: names }) }), transaction);
  let variants = await readChunks(Variant, values.map((v) => v.cod_ref).filter(Boolean), (codes) => ({ cod_ref: { [Op.in]: codes } }), transaction);
  products = unique([...products, ...await readChunks(Product, variants.map((v) => v.producto_id), (ids) => ({ id: { [Op.in]: ids } }), transaction)]);
  variants = unique([...variants, ...await readChunks(Variant, products.map((p) => p.id), (ids) => ({ producto_id: { [Op.in]: ids } }), transaction)]);
  return { categories, products, variants };
}
export async function applyPlan(plan, catalog, transaction) {
  const creates = plan.filter((r) => r.action === "create");
  const categoryPath = categoryPaths(catalog.categories);
  const categoryIds = new Map([...categoryPath].map(([id, path]) => [keyText(path), id]));
  const paths = new Map();
  for (const row of creates) {
    const parts = row.value.categoria.split(" > ");
    parts.forEach((_, i) => { const path = parts.slice(0, i + 1).join(" > "); paths.set(keyText(path), path); });
  }
  let newCategories = 0;
  for (let level = 1; level <= 10; level++) {
    const pending = [...paths.entries()].filter(([key, path]) => !categoryIds.has(key) && path.split(" > ").length === level);
    if (!pending.length) continue;
    const created = await Category.bulkCreate(pending.map(([key, path]) => {
      const parts = path.split(" > "), name = parts.at(-1);
      const slug = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 64) + "-" + hash(key).slice(0, 12);
      return { nombre: name, slug, padre_id: parts.length > 1 ? categoryIds.get(keyText(parts.slice(0, -1).join(" > "))) : null };
    }), { transaction, returning: true });
    created.forEach((c, i) => categoryIds.set(pending[i][0], c.id)); newCategories += created.length;
  }
  const productIds = new Map(catalog.products.map((p) => [groupKey(categoryPath.get(p.categoria_id), p.nombre), p.id]));
  const newProducts = new Map();
  for (const row of creates) {
    const key = groupKey(row.value.categoria, row.value.producto_nombre);
    if (!productIds.has(key) && !newProducts.has(key)) newProducts.set(key, row.value);
  }
  if (newProducts.size) {
    const entries = [...newProducts];
    const added = await Product.bulkCreate(entries.map(([,v]) => ({ nombre: v.producto_nombre, categoria_id: categoryIds.get(keyText(v.categoria)), marca: v.marca, descripcion: v.descripcion, activo: true })), { transaction, returning: true });
    added.forEach((p, i) => productIds.set(entries[i][0], p.id));
  }
  if (creates.length) await Variant.bulkCreate(creates.map((r) => ({ producto_id: r.productId || productIds.get(groupKey(r.value.categoria, r.value.producto_nombre)), nombre: r.value.variedad_nombre, ...r.patch, fecha_cambio_precio: new Date() })), { transaction });
  const variants = new Map(catalog.variants.map((v) => [v.id, v]));
  const updates = plan.filter((r) => r.action === "update");
  const conFechaPrecio = (r) => {
    const antes = variants.get(r.target);
    const cambioPrecio = r.patch.precio != null && Number(antes.precio) !== Number(r.patch.precio);
    return { ...antes, ...r.patch, ...(cambioPrecio ? { fecha_cambio_precio: new Date() } : {}) };
  };
  if (updates.length) await Variant.bulkCreate(updates.map(conFechaPrecio), { transaction, updateOnDuplicate: ["precio", "iva_porcentaje", "cantidad", "controla_stock", "cod_ref", "codigo_barras", "unidades_por_bulto", "fecha_cambio_precio"] });
  return { products: newProducts.size, categories: newCategories };
}
