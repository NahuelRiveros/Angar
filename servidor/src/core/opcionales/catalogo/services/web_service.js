import { Op, literal } from "sequelize";
import { noExiste } from "../../../services/common/errores.js";
import { contiene, paginar } from "../../../services/common/consultas.js";
import { CatFoto, CatProducto, CatVariante } from "../modelos.js";
import { resumenVariantes } from "../reglas.js";
import { cacheCatalogo } from "./cache.js";
import { categoriasVisibles } from "./categorias_service.js";

// Lo que ve cualquier visita (MCA-06). El panel está en productos_service.js.
const POR_PAGINA = 24;
const DESTACADOS = 8;
const VARIANTES = {
  model: CatVariante, as: "variantes", separate: true, where: { eliminado_en: null },
  attributes: ["id", "producto_id", "nombre", "codigo", "precio", "precio_anterior", "disponible"], order: [["orden", "ASC"], ["id", "ASC"]],
};
const FOTOS = { model: CatFoto, as: "fotos", separate: true, attributes: ["producto_id", "url"], order: [["orden", "ASC"], ["id", "ASC"]] };
// Lo que se puede vender primero. SQL fijo: no lleva datos de la persona.
const HAY_DISPONIBLE = literal('EXISTS (SELECT 1 FROM cat_variante v WHERE v.producto_id = "CatProducto".id AND v.disponible AND v.eliminado_en IS NULL)');

/** MCA-06: los productos visibles; con `categoria` (su dirección), solo los de ella y sus subcategorías. */
async function visibles(categoria) {
  const todas = await categoriasVisibles();
  const elegida = categoria && todas.find((c) => c.slug === categoria);
  const ids = todas.filter((c) => !categoria || c.id === elegida?.id || (elegida && c.padre_id === elegida.id)).map((c) => c.id);
  return { where: { activo: true, eliminado_en: null, categoria_id: ids }, categorias: new Map(todas.map((c) => [c.id, c])) };
}

async function coincide(q) {
  if (!q) return {};
  const porCodigo = await CatVariante.findAll({ where: { eliminado_en: null, codigo: { [Op.iLike]: q.replace(/[\\%_]/g, "\\$&") } }, attributes: ["producto_id"], limit: 50, raw: true });
  return { [Op.or]: [contiene("CatProducto.nombre", q), { id: porCodigo.map((v) => v.producto_id) }] };
}

function tarjeta(producto, categorias) {
  const { id, nombre, slug, variantes, fotos, categoria_id } = producto.get({ plain: true });
  return {
    id, nombre, slug, foto: fotos[0]?.url ?? null, categoria: categorias.get(categoria_id)?.nombre ?? null, ...resumenVariantes(variantes),
    // Con una sola variante la tarjeta ya puede agregarla al carrito.
    variante_id: variantes.length === 1 ? variantes[0].id : null,
  };
}

async function consultarProductos({ categoria, q, page }) {
  const { where, categorias } = await visibles(categoria);
  const pagina = await paginar(CatProducto, {
    where: { ...where, ...await coincide(q) },
    attributes: ["id", "nombre", "slug", "categoria_id"], include: [VARIANTES, FOTOS],
    order: [[HAY_DISPONIBLE, "DESC"], ["nombre", "ASC"], ["id", "ASC"]],
  }, { page, limit: POR_PAGINA });
  return { ...pagina, items: pagina.items.map((p) => tarjeta(p, categorias)) };
}

/** Las búsquedas escritas son casi siempre distintas: esas no ocupan lugar en la caché. */
export const listarProductosWeb = (filtros) => (filtros.q
  ? consultarProductos(filtros)
  : cacheCatalogo.obtener(`lista:${filtros.categoria ?? ""}:${filtros.page}`, () => consultarProductos(filtros)));

export const listarDestacados = () => cacheCatalogo.obtener("destacados", async () => {
  const { where, categorias } = await visibles();
  const productos = await CatProducto.findAll({
    where: { ...where, destacado: true }, attributes: ["id", "nombre", "slug", "categoria_id"], include: [VARIANTES, FOTOS],
    order: [[HAY_DISPONIBLE, "DESC"], ["actualizado_en", "DESC"], ["id", "DESC"]], limit: DESTACADOS,
  });
  return productos.map((p) => tarjeta(p, categorias));
});

export async function detalleProducto(slug) {
  const { where, categorias } = await visibles();
  const producto = await CatProducto.findOne({ where: { ...where, slug }, attributes: ["id", "nombre", "slug", "descripcion", "categoria_id"], include: [VARIANTES, FOTOS] });
  if (!producto) throw noExiste("Ese producto ya no está publicado.");
  const { id, nombre, descripcion, categoria_id, variantes, fotos } = producto.get({ plain: true });
  const propia = categorias.get(categoria_id);
  const padre = propia.padre_id === null ? null : categorias.get(propia.padre_id);
  return {
    id, nombre, slug, descripcion, fotos: fotos.map((f) => f.url), ...resumenVariantes(variantes),
    categorias: [padre, propia].filter(Boolean).map((c) => ({ nombre: c.nombre, slug: c.slug })),
    variantes: variantes.map(({ producto_id: _id, ...v }) => v),
  };
}
