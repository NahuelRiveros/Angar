import { Op } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { ProductoDistribuidora, CategoriaDistribuidora, VariedadDistribuidora } from "../../models/index.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";
import { capitalizar } from "../common/query_helpers.js";

// fecha_alta viaja acá para que el admin pueda auditar cuándo se cargó cada
// producto (columna DATEONLY ya existente en el modelo, antes no se
// seleccionaba nunca — invisible aunque siempre estuvo en la base).
const ATTR_LISTADO = ["id", "categoria_id", "nombre", "descripcion", "marca", "imagen_url", "activo", "fecha_alta"];

const INCLUDE_LISTADO = [
  { model: CategoriaDistribuidora, as: "categoria", attributes: ["id", "nombre", "slug"] },
  {
    model: VariedadDistribuidora, as: "variedades", where: { fecha_baja: null }, required: false,
    attributes: ["id", "nombre", "precio", "precio_anterior", "iva_porcentaje", "controla_stock", "cantidad", "cod_ref",
      "codigo_barras", "unidad_medida", "unidad_bulto", "unidades_por_bulto", "stock_minimo", "fecha_cambio_precio"],
  },
];

// Cache en memoria del árbol de categorías (solo id/padre_id) — las
// categorías cambian rarísima vez, pero antes se releía la tabla entera en
// CADA búsqueda de productos con filtro de categoría. TTL corto en vez de
// invalidación cruzada con catalogos_distribuidora_service.js: a los 60s se
// autocorrige solo, no hace falta acoplar los dos archivos.
let cacheArbolCategorias = { filas: null, expiraEn: 0 };
async function obtenerCategoriasCacheadas() {
  if (Date.now() > cacheArbolCategorias.expiraEn) {
    const filas = await CategoriaDistribuidora.findAll({
      where: { fecha_baja: null }, attributes: ["id", "padre_id"],
    });
    cacheArbolCategorias = { filas, expiraEn: Date.now() + 60_000 };
  }
  return cacheArbolCategorias.filas;
}

// Una categoría "padre" (ej. Comestibles) normalmente no tiene productos
// cargados directo — están en sus subcategorías (Galletitas, Fideos, etc.).
// Filtrar por categoria_id exacto dejaba la categoría padre siempre vacía.
// Acá resolvemos la categoría elegida + TODOS sus descendientes (recursivo,
// cualquier profundidad) para que filtrar por el padre traiga todo lo de
// abajo también.
async function idsConDescendientes(categoriaId) {
  // req.query siempre trae strings ("6", no 6) — sin este Number(), el Map de
  // abajo (con claves numéricas de verdad, padre_id sale de Postgres como
  // number) nunca encontraba a los hijos de la categoría elegida: filtrar por
  // cualquier categoría que no fuera una hoja exacta devolvía "sin resultados".
  const catId = Number(categoriaId);
  const todas = await obtenerCategoriasCacheadas();
  const hijosPorPadre = new Map();
  for (const c of todas) {
    if (!hijosPorPadre.has(c.padre_id)) hijosPorPadre.set(c.padre_id, []);
    hijosPorPadre.get(c.padre_id).push(c.id);
  }
  const ids = [catId];
  const pendientes = [catId];
  while (pendientes.length > 0) {
    const actual = pendientes.pop();
    for (const hijoId of hijosPorPadre.get(actual) ?? []) {
      ids.push(hijoId);
      pendientes.push(hijoId);
    }
  }
  return ids;
}

// Ids de productos con alguna presentación vigente que cumple `condicion`.
async function idsConVariedad(condicion) {
  const filas = await VariedadDistribuidora.findAll({ where: { fecha_baja: null, ...condicion }, attributes: ["producto_id"], raw: true });
  return [...new Set(filas.map((v) => v.producto_id))];
}

const CONDICION_STOCK = {
  sin_stock: { controla_stock: true, cantidad: { [Op.lte]: 0 } },
  // Incluye los agotados: también están por debajo del mínimo.
  bajo_minimo: { controla_stock: true, stock_minimo: { [Op.gt]: 0 }, [Op.and]: [sequelize.where(sequelize.col("cantidad"), Op.lte, sequelize.col("stock_minimo"))] },
};

// `estado` y `stock` solo los usa la gestión (con soloActivos en false).
async function construirWhere({ categoria, incluirDescendientes = true, q, soloActivos = true, marca, estado, stock } = {}) {
  const where = { fecha_baja: null };
  const filtros = [];
  if (soloActivos || estado === "activos") where.activo = true;
  else if (estado === "inactivos") where.activo = false;
  if (categoria) {
    where.categoria_id = incluirDescendientes ? { [Op.in]: await idsConDescendientes(categoria) } : categoria;
  }
  if (marca) where.marca = { [Op.iLike]: String(marca).slice(0, 80) };
  if (q) {
    // `%` y `_` del texto buscado se escapan: son comodines de LIKE.
    const pattern = "%" + String(q).slice(0, 120).replace(/[\\%_]/g, "\\$&") + "%";
    const porCodigo = await idsConVariedad({ [Op.or]: [{ cod_ref: { [Op.iLike]: pattern } }, { codigo_barras: { [Op.iLike]: pattern } }] });
    filtros.push({ [Op.or]: [
      { nombre: { [Op.iLike]: pattern } }, { marca: { [Op.iLike]: pattern } },
      { id: { [Op.in]: porCodigo } },
    ] });
  }
  if (!soloActivos && CONDICION_STOCK[stock]) filtros.push({ id: { [Op.in]: await idsConVariedad(CONDICION_STOCK[stock]) } });
  if (filtros.length) where[Op.and] = filtros;
  return where;
}

/** Marcas cargadas (para el filtro de la gestión de artículos). */
export async function listarMarcas() {
  const filas = await ProductoDistribuidora.findAll({
    where: { fecha_baja: null, marca: { [Op.ne]: null } },
    attributes: [[sequelize.fn("DISTINCT", sequelize.col("marca")), "marca"]],
    order: [["marca", "ASC"]], raw: true, limit: 1000,
  });
  return filas.map((f) => f.marca).filter(Boolean);
}

// `soloActivos` en false = ve también los productos desactivados (admin/staff
// gestionando el catálogo); en true = solo lo que ve un cliente en el catálogo público.
// `maxLimit` sube a 1000 solo para el admin (carga perezosa por categoría del
// árbol: una categoría entera se trae de una — el catálogo público se queda
// con el tope de 100 de siempre, no tiene sentido pedirle más de una página).
// `incluirDescendientes` en false = SOLO los productos con esa categoria_id
// exacta (sin bajar a subcategorías) — lo usa el árbol del admin al expandir
// un nivel puntual, para no traerse de golpe todo el subárbol y mezclarlo
// bajo el nodo equivocado.
export async function listarProductos({ categoria, incluirDescendientes = true, q, pagina, por_pagina, soloActivos = true, marca, estado, stock } = {}) {
  const where = await construirWhere({ categoria, incluirDescendientes, q, soloActivos, marca, estado, stock });
  const maxLimit = soloActivos ? 100 : 1000;
  const { page, limit, offset } = normalizarPaginacion({ page: pagina, limit: por_pagina, defaultLimit: 24, maxLimit });

  const { rows, count } = await ProductoDistribuidora.findAndCountAll({
    where,
    attributes: ATTR_LISTADO,
    include: INCLUDE_LISTADO,
    order: [["nombre", "ASC"]],
    limit,
    offset,
    distinct: true,
  });

  return { productos: rows, pagination: armarPaginacion({ page, limit, total: count }) };
}

export async function obtenerProductoPorId(id, { soloActivos = true } = {}) {
  const where = { id, fecha_baja: null };
  if (soloActivos) where.activo = true;
  return ProductoDistribuidora.findOne({
    where,
    attributes: ATTR_LISTADO,
    include: INCLUDE_LISTADO,
  });
}

export async function crearProducto(payload, { transaction } = {}) {
  return ProductoDistribuidora.create({
    categoria_id: payload.categoria_id,
    nombre: capitalizar(payload.nombre),
    descripcion: payload.descripcion ?? null,
    marca: payload.marca ?? null,
    imagen_url: payload.imagen_url ?? null,
    activo: true,
    fecha_alta: new Date(),
  }, { transaction });
}

/**
 * Alta de producto + su variedad en un solo paso — antes había que crear el
 * producto y, en una acción aparte ("Variedades", ya retirada), cargarle
 * precio; hasta ese segundo paso el producto no era comprable. No hay UI
 * para más de una presentación por producto — si en el futuro hace falta,
 * `crearVariedad`/`actualizarVariedad` siguen soportándolo a nivel de datos.
 * Transacción: si la variedad falla (ej. precio inválido), no queda un
 * producto huérfano sin variedad.
 */
// `variedad` llega ya validada con validarVariedad() (services/common/articulo_rules.js).
export async function crearProductoConVariedad(payload, variedad) {
  const producto = await sequelize.transaction(async (transaction) => {
    const nuevoProducto = await crearProducto(payload, { transaction });
    await crearVariedad(nuevoProducto.id, variedad, { transaction });
    return nuevoProducto;
  });
  return obtenerProductoPorId(producto.id);
}

export async function actualizarProducto(id, payload, { transaction } = {}) {
  const producto = await ProductoDistribuidora.findByPk(id, { transaction });
  if (!producto) return null;
  await producto.update({
    categoria_id: payload.categoria_id,
    nombre: capitalizar(payload.nombre),
    descripcion: payload.descripcion ?? null,
    marca: payload.marca ?? null,
    imagen_url: payload.imagen_url ?? producto.imagen_url,
    activo: payload.activo ?? producto.activo,
  }, { transaction });
  return producto;
}

/**
 * Edición de producto + su variedad en un solo paso (mismo criterio que
 * crearProductoConVariedad). Actualiza la variedad más antigua activa del
 * producto — hoy siempre hay como máximo una — y si por algún motivo no
 * tiene ninguna (dato viejo, o se la borró desde la base a mano), la crea
 * en vez de fallar.
 */
export async function actualizarProductoConVariedad(id, payload, datosVariedad) {
  const producto = await sequelize.transaction(async (transaction) => {
    const actualizado = await actualizarProducto(id, payload, { transaction });
    if (!actualizado) return null;
    const variedad = await VariedadDistribuidora.findOne({
      where: { producto_id: id, fecha_baja: null }, order: [["id", "ASC"]], transaction,
    });
    if (variedad) {
      const cambioPrecio = Number(variedad.precio) !== Number(datosVariedad.precio);
      await variedad.update({ ...datosVariedad, ...(cambioPrecio ? { fecha_cambio_precio: new Date() } : {}) }, { transaction });
    } else await crearVariedad(id, datosVariedad, { transaction });
    return actualizado;
  });
  if (!producto) return null;
  return obtenerProductoPorId(id);
}

export async function cambiarEstadoProducto(id, activo) {
  const producto = await ProductoDistribuidora.findByPk(id);
  if (!producto) return null;
  await producto.update({ activo });
  return producto;
}

export async function eliminarProducto(id) {
  const producto = await ProductoDistribuidora.findByPk(id);
  if (!producto) return null;
  await producto.update({ fecha_baja: new Date() });
  return producto;
}

// ── Variedades — un producto necesita una para ser comprable. Sin UI propia:
// se maneja siempre junto al producto (ver crearProductoConVariedad /
// actualizarProductoConVariedad más arriba) — crearVariedad queda como
// función de datos, reutilizable si en el futuro hiciera falta más de una
// presentación por producto. ──────────────────────────────────────────────

export async function crearVariedad(producto_id, { nombre = null, ...datos }, { transaction } = {}) {
  return VariedadDistribuidora.create({
    precio_anterior: null, iva_porcentaje: 21, controla_stock: false, cantidad: 0, cod_ref: null,
    ...datos, producto_id, nombre, fecha_alta: new Date(), fecha_cambio_precio: new Date(),
  }, { transaction });
}

/**
 * Ajuste masivo de precios — sube o baja (porcentaje negativo) el precio de
 * TODAS las variedades que caen dentro del filtro, en una sola operación.
 * No toca `precio_anterior` — eso queda para marcar una oferta puntual,
 * no se pisa solo porque cambió la lista de precios.
 *
 * Alcance según qué se pase:
 *   - producto_id  → solo las variedades de ese producto.
 *   - categoria_id → todos los productos de esa categoría.
 *   - ninguno de los dos → TODO el catálogo (el controller exige una
 *     confirmación explícita aparte para este caso).
 */
export async function ajustarPreciosMasivo({ porcentaje, producto_id = null, categoria_id = null }) {
  const factor = 1 + Number(porcentaje) / 100;
  if (!Number.isFinite(factor) || factor <= 0) {
    throw Object.assign(new Error("Porcentaje inválido"), { status: 400 });
  }

  const where = { fecha_baja: null };
  if (producto_id) {
    where.producto_id = producto_id;
  } else if (categoria_id) {
    const productos = await ProductoDistribuidora.findAll({
      where: { categoria_id: { [Op.in]: await idsConDescendientes(categoria_id) }, fecha_baja: null },
      attributes: ["id"],
    });
    if (productos.length === 0) return 0;
    where.producto_id = { [Op.in]: productos.map((p) => p.id) };
  }
  // ni producto_id ni categoria_id → sin filtro extra, afecta todo el catálogo

  const [cantidadActualizada] = await VariedadDistribuidora.update(
    { precio: sequelize.literal(`ROUND(precio * ${factor}, 2)`), fecha_cambio_precio: new Date() },
    { where }
  );

  return cantidadActualizada;
}
