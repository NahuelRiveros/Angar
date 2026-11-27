import { Op, UniqueConstraintError, literal } from "sequelize";
import { sequelize } from "../../../database/sequelize.js";
import { ErrorApp, noExiste } from "../../../services/common/errores.js";
import { contiene, exigirVersion, obtenerOFallar, paginar, patronBusqueda } from "../../../services/common/consultas.js";
import { disponibilidad } from "../../enganches.js";
import { CatCategoria, CatFoto, CatProducto, CatVariante } from "../modelos.js";
import { resumenVariantes, slug, slugLibre } from "../reglas.js";
import { cacheCatalogo } from "./cache.js";
import { conSubcategorias } from "./categorias_service.js";

// Productos del panel (MCA-01 a MCA-09). Lo que ve la web está en web_service.js.
const POR_PAGINA = 30;
const NO_EXISTE = "Ese producto no existe.";
const ORDEN = [["orden", "ASC"], ["id", "ASC"]];
const VARIANTES = { model: CatVariante, as: "variantes", separate: true, where: { eliminado_en: null }, order: ORDEN, attributes: { exclude: ["eliminado_en", "orden"] } };
const FOTOS = { model: CatFoto, as: "fotos", separate: true, order: ORDEN, attributes: ["producto_id", "url"] };
const CATEGORIA = { model: CatCategoria, as: "categoria", attributes: ["id", "nombre", "activo"], include: [{ model: CatCategoria, as: "padre", attributes: ["id", "nombre", "activo"] }] };
// SQL fijo: no lleva datos de la persona.
const SIN_NADA_DISPONIBLE = literal('NOT EXISTS (SELECT 1 FROM cat_variante v WHERE v.producto_id = "CatProducto".id AND v.disponible AND v.eliminado_en IS NULL)');
const POR_ESTADO = { visibles: [{ activo: true }], ocultos: [{ activo: false }], sin_stock: [SIN_NADA_DISPONIBLE] };

export async function listarProductos({ categoria_id, estado, q, page }) {
  const condiciones = [{ eliminado_en: null }, ...(POR_ESTADO[estado] ?? [])];
  if (categoria_id) condiciones.push({ categoria_id: await conSubcategorias(categoria_id) });
  if (q) {
    const porCodigo = await CatVariante.findAll({ where: { eliminado_en: null, codigo: { [Op.iLike]: patronBusqueda(q) } }, attributes: ["producto_id"], limit: 200, raw: true });
    condiciones.push({ [Op.or]: [contiene("CatProducto.nombre", q), { id: porCodigo.map((v) => v.producto_id) }] });
  }
  const pagina = await paginar(CatProducto, {
    where: { [Op.and]: condiciones }, attributes: ["id", "nombre", "slug", "destacado", "activo"],
    include: [VARIANTES, FOTOS, CATEGORIA], order: [["nombre", "ASC"], ["id", "ASC"]],
  }, { page, limit: POR_PAGINA });
  return {
    ...pagina,
    items: pagina.items.map((producto) => {
      const { variantes, fotos, categoria, ...datos } = producto.get({ plain: true });
      const oculta = !categoria.activo || categoria.padre?.activo === false;
      return {
        ...datos, ...resumenVariantes(variantes), foto: fotos[0]?.url ?? null, opciones: variantes.length,
        categoria: [categoria.padre?.nombre, categoria.nombre].filter(Boolean).join(" › "), categoria_oculta: oculta,
      };
    }),
  };
}

export async function obtenerProducto(id) {
  const producto = await obtenerOFallar(CatProducto, { id, eliminado_en: null }, NO_EXISTE, { include: [VARIANTES, FOTOS] });
  const { fotos, variantes, ...datos } = producto.get({ plain: true });
  // MOD-17: si otro módulo maneja el "hay stock" de una opción, el formulario lo muestra sin casilla.
  const manejadas = await disponibilidad(variantes.map((v) => v.id));
  return { ...datos, fotos: fotos.map((f) => f.url), variantes: variantes.map((v) => ({ ...v, disponible_por: manejadas.get(v.id)?.por ?? null })) };
}

const verificarCategoria = (id, transaction) => obtenerOFallar(CatCategoria, id, "La categoría elegida no existe.", { transaction }).catch((error) => {
  throw error instanceof ErrorApp ? new ErrorApp("DATOS_INVALIDOS", error.message, 400) : error;
});

/** Deja las variantes y fotos iguales a lo recibido. Las quitadas no se borran (ver modelos.js). */
async function guardarHijos(producto_id, { variantes, fotos }, transaction) {
  const actuales = new Map((await CatVariante.findAll({ where: { producto_id, eliminado_en: null }, transaction })).map((v) => [v.id, v]));
  if (variantes.some((v) => v.id !== null && !actuales.has(v.id))) throw new ErrorApp("CAMBIO_SIMULTANEO", "Una de las opciones ya no existe. Recargá el producto y volvé a guardar.", 409);
  const quedan = new Set(variantes.map((v) => v.id));
  // MOD-17: lo que maneja otro módulo (ej. stock) no lo pisa la casilla del formulario.
  const manejadas = await disponibilidad([...actuales.keys()], transaction);
  for (const [id, fila] of actuales) if (!quedan.has(id)) await fila.update({ eliminado_en: new Date() }, { transaction });
  for (const [orden, { id, ...datos }] of variantes.entries()) {
    if (id === null) await CatVariante.create({ ...datos, producto_id, orden }, { transaction });
    else await actuales.get(id).update({ ...datos, disponible: manejadas.get(id)?.disponible ?? datos.disponible, orden }, { transaction });
  }
  await CatFoto.destroy({ where: { producto_id }, transaction });
  await CatFoto.bulkCreate(fotos.map((url, orden) => ({ producto_id, url, orden })), { transaction });
}

export async function crearProducto({ variantes, fotos, ...datos }) {
  const guardar = () => sequelize.transaction(async (transaction) => {
    await verificarCategoria(datos.categoria_id, transaction);
    const usados = await CatProducto.findAll({ where: { slug: { [Op.like]: `${slug(datos.nombre)}%` } }, attributes: ["slug"], raw: true, transaction });
    const { id } = await CatProducto.create({ ...datos, slug: slugLibre(datos.nombre, usados.map((p) => p.slug)) }, { transaction });
    // Al crear no hay opciones previas: cualquier id recibido sobra.
    await guardarHijos(id, { variantes: variantes.map((v) => ({ ...v, id: null })), fotos }, transaction);
    return id;
  });
  // MCA-07: si otra persona creó recién uno con el mismo nombre, se prueba con la dirección siguiente.
  const id = await guardar().catch((error) => { if (error instanceof UniqueConstraintError) return guardar(); throw error; });
  cacheCatalogo.vaciar();
  return obtenerProducto(id);
}

export async function actualizarProducto(id, { variantes, fotos, version, ...datos }) {
  await sequelize.transaction(async (transaction) => {
    const producto = await obtenerOFallar(CatProducto, { id, eliminado_en: null }, NO_EXISTE, { transaction, bloquear: true });
    exigirVersion(producto, version, "Otra persona cambió este producto recién. Recargalo para ver cómo quedó.");
    await verificarCategoria(datos.categoria_id, transaction);
    // MCA-07: la dirección (slug) no cambia al renombrar.
    await producto.update({ ...datos, version: version + 1, actualizado_en: new Date() }, { transaction });
    await guardarHijos(id, { variantes, fotos }, transaction);
  });
  cacheCatalogo.vaciar();
  return obtenerProducto(id);
}

/** MCA-08: deja de verse, pero la fila queda para los pedidos y movimientos que la nombran. */
export async function eliminarProducto(id) {
  const [cantidad] = await CatProducto.update({ eliminado_en: new Date(), activo: false }, { where: { id, eliminado_en: null } });
  if (!cantidad) throw noExiste(NO_EXISTE);
  cacheCatalogo.vaciar();
}
