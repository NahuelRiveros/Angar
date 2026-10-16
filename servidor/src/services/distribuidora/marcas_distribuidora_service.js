import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { MarcaDistribuidora, MarcaCategoriaDistribuidora, CategoriaDistribuidora, ProductoDistribuidora } from "../../models/index.js";
import { formatearNombre, claveMarca } from "../common/formato_nombre.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";

/**
 * Marcas de distribuidora: catálogo propio (marca_distribuidora) asociado a
 * familias o categorías (marca_categoria_distribuidora). Una asociación a una
 * familia vale para todas sus categorías. El artículo guarda marca_id y una
 * copia del nombre en producto_distribuidora.marca, que este servicio mantiene
 * al renombrar o unificar.
 */

export const errorMarca = (mensaje, codigo = "MARCA_INVALIDA", extra = {}) => Object.assign(new Error(mensaje), { codigo, ...extra });
const LOCK = (transaction) => ({ lock: transaction.LOCK.UPDATE, transaction });
const consulta = (sql, replacements, transaction) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });

// Árbol de categorías (2000 filas como mucho): ancestros y descendientes sin una consulta por nivel.
async function cargarArbol(transaction) {
  const filas = await CategoriaDistribuidora.findAll({ where: { fecha_baja: null }, attributes: ["id", "nombre", "padre_id"], raw: true, transaction });
  const porId = new Map(filas.map((c) => [c.id, c]));
  const hijos = new Map();
  for (const c of filas) {
    if (c.padre_id == null) continue;
    if (!hijos.has(c.padre_id)) hijos.set(c.padre_id, []);
    hijos.get(c.padre_id).push(c.id);
  }
  const ancestros = (id) => {
    const lista = [];
    let actual = porId.get(Number(id));
    while (actual?.padre_id != null && porId.has(actual.padre_id) && !lista.includes(actual.padre_id)) {
      lista.push(actual.padre_id);
      actual = porId.get(actual.padre_id);
    }
    return lista;
  };
  const descendientes = (id) => {
    const lista = [];
    const pendientes = [Number(id)];
    while (pendientes.length) for (const h of hijos.get(pendientes.pop()) ?? []) { lista.push(h); pendientes.push(h); }
    return lista;
  };
  const ruta = (id) => [...ancestros(id).reverse(), Number(id)].map((i) => porId.get(i)?.nombre).filter(Boolean).join(" › ");
  return { porId, ancestros, descendientes, ruta };
}

async function idsCategoriasValidos(ids, transaction) {
  const unicos = [...new Set((ids ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (!unicos.length) return [];
  const existentes = await CategoriaDistribuidora.findAll({ where: { id: unicos, fecha_baja: null }, attributes: ["id"], raw: true, transaction });
  if (existentes.length !== unicos.length) throw errorMarca("Alguna familia o categoría elegida ya no existe; actualizá la pantalla.");
  return unicos;
}

/**
 * Marcas para elegir. Con `categoria`: las asociadas a esa categoría, a su familia
 * o (si es una familia) a sus categorías. Con `q`: búsqueda en todas (máx. 20).
 * Sin filtros: todas, para el filtro de Artículos.
 */
export async function listarMarcas({ categoria, q } = {}) {
  const where = {};
  if (categoria) {
    const arbol = await cargarArbol();
    if (!arbol.porId.has(Number(categoria))) return [];
    const ids = [Number(categoria), ...arbol.ancestros(categoria), ...arbol.descendientes(categoria)];
    where.id = { [Op.in]: sequelize.literal(`(SELECT marca_id FROM marca_categoria_distribuidora WHERE categoria_id IN (${ids.map(Number).join(",")}))`) };
  }
  const texto = String(q ?? "").trim().slice(0, 80);
  if (texto) where.clave = { [Op.like]: `%${claveMarca(texto)}%` };
  return MarcaDistribuidora.findAll({
    where, attributes: ["id", "nombre"], order: [[sequelize.fn("lower", sequelize.col("nombre")), "ASC"]], raw: true, limit: texto ? 20 : 2000,
  });
}

/** Pantalla Marcas: cada marca con sus artículos y dónde se ofrece (con la ruta "Familia › Categoría"). */
export const ESTADOS_MARCA = ["con_articulos", "sin_articulos", "sin_asociar"];
// Allowlist de orden: el valor del usuario nunca llega al SQL, solo elige una de estas.
const ORDEN_MARCAS = {
  nombre: "lower(m.nombre) ASC, m.id ASC",
  articulos: "coalesce(c.articulos, 0) DESC, lower(m.nombre) ASC, m.id ASC",
};

/**
 * Pantalla Marcas, paginada en la base: filtra por nombre (`q`, sin importar
 * mayúsculas ni acentos), por familia o categoría (la marca se ofrece ahí, en su
 * familia o en sus categorías) y por `estado`; ordena por nombre o por cantidad de
 * artículos. Devuelve la página con dónde se ofrece cada marca ("Familia › Categoría")
 * y los totales generales para el encabezado.
 */
export async function resumenMarcas({ q, categoria, estado, orden, pagina, por_pagina } = {}) {
  const { page, limit, offset } = normalizarPaginacion({ page: pagina, limit: por_pagina, defaultLimit: 50, maxLimit: 100 });
  const arbol = await cargarArbol();
  const condiciones = [];
  const replacements = { limit, offset };
  const clave = claveMarca(q);
  if (clave) { condiciones.push("m.clave LIKE :clave"); replacements.clave = `%${clave}%`; }
  if (categoria) {
    if (!arbol.porId.has(Number(categoria))) return { marcas: [], pagination: armarPaginacion({ page, limit, total: 0 }), totales: await totalesMarcas() };
    condiciones.push("m.id IN (SELECT marca_id FROM marca_categoria_distribuidora WHERE categoria_id IN (:categorias))");
    replacements.categorias = [Number(categoria), ...arbol.ancestros(categoria), ...arbol.descendientes(categoria)];
  }
  if (estado === "con_articulos") condiciones.push("coalesce(c.articulos, 0) > 0");
  if (estado === "sin_articulos") condiciones.push("coalesce(c.articulos, 0) = 0");
  if (estado === "sin_asociar") condiciones.push("NOT EXISTS (SELECT 1 FROM marca_categoria_distribuidora mc WHERE mc.marca_id = m.id)");

  const desde = `FROM marca_distribuidora m
    LEFT JOIN (SELECT marca_id, count(*)::int AS articulos, count(*) FILTER (WHERE activo)::int AS activos
      FROM producto_distribuidora WHERE fecha_baja IS NULL AND marca_id IS NOT NULL GROUP BY marca_id) c ON c.marca_id = m.id
    ${condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : ""}`;
  const [filas, [{ total }], totales] = await Promise.all([
    consulta(`SELECT m.id, m.nombre, coalesce(c.articulos, 0)::int AS articulos, coalesce(c.activos, 0)::int AS activos
      ${desde} ORDER BY ${ORDEN_MARCAS[orden] ?? ORDEN_MARCAS.nombre} LIMIT :limit OFFSET :offset`, replacements),
    consulta(`SELECT count(*)::int AS total ${desde}`, replacements),
    totalesMarcas(),
  ]);

  // Dónde se ofrece: una sola consulta para las marcas de esta página.
  const asociaciones = filas.length
    ? await MarcaCategoriaDistribuidora.findAll({ where: { marca_id: filas.map((f) => f.id) }, attributes: ["marca_id", "categoria_id"], raw: true })
    : [];
  const categoriasDe = new Map();
  for (const a of asociaciones) {
    if (!arbol.porId.has(a.categoria_id)) continue;
    if (!categoriasDe.has(a.marca_id)) categoriasDe.set(a.marca_id, []);
    categoriasDe.get(a.marca_id).push({ id: a.categoria_id, ruta: arbol.ruta(a.categoria_id) });
  }
  return {
    marcas: filas.map((m) => ({ ...m, categorias: (categoriasDe.get(m.id) ?? []).sort((a, b) => a.ruta.localeCompare(b.ruta, "es")) })),
    pagination: armarPaginacion({ page, limit, total }),
    totales,
  };
}

async function totalesMarcas() {
  const [fila] = await consulta(`SELECT (SELECT count(*)::int FROM marca_distribuidora) AS marcas,
    (SELECT count(*)::int FROM producto_distribuidora WHERE marca_id IS NOT NULL AND fecha_baja IS NULL) AS articulos`);
  return fila;
}

export async function obtenerMarca(id) {
  const marca = await MarcaDistribuidora.findByPk(id, { attributes: ["id", "nombre"], raw: true });
  if (!marca) return null;
  const [asociaciones, enUso] = await Promise.all([
    MarcaCategoriaDistribuidora.findAll({ where: { marca_id: id }, attributes: ["categoria_id"], raw: true }),
    consulta("SELECT categoria_id, count(*)::int AS articulos FROM producto_distribuidora WHERE marca_id = :id AND fecha_baja IS NULL GROUP BY categoria_id", { id }),
  ]);
  return { ...marca, categorias: asociaciones.map((a) => a.categoria_id), articulos_por_categoria: Object.fromEntries(enUso.map((u) => [u.categoria_id, u.articulos])) };
}

async function marcaConClave(clave, transaction, excluirId = null) {
  const where = { clave };
  if (excluirId) where.id = { [Op.ne]: excluirId };
  return MarcaDistribuidora.findOne({ where, attributes: ["id", "nombre"], raw: true, transaction });
}

function nombreValido(nombre) {
  const formateado = formatearNombre(nombre);
  const clave = claveMarca(formateado);
  if (!formateado || !clave) throw errorMarca("Escribí el nombre de la marca.");
  if (formateado.length > 80) throw errorMarca("La marca admite hasta 80 caracteres.");
  return { nombre: formateado, clave };
}
const yaExiste = (existente) => errorMarca(`Ya existe la marca "${existente.nombre}".`, "MARCA_EXISTE", { marca: existente });

export async function crearMarca({ nombre, categorias }) {
  const datos = nombreValido(nombre);
  try {
    return await sequelize.transaction(async (transaction) => {
      const existente = await marcaConClave(datos.clave, transaction);
      if (existente) throw yaExiste(existente);
      const ids = await idsCategoriasValidos(categorias, transaction);
      if (!ids.length) throw errorMarca("Elegí al menos una familia o categoría para la marca.");
      const marca = await MarcaDistribuidora.create({ ...datos, fecha_alta: new Date() }, { transaction });
      await MarcaCategoriaDistribuidora.bulkCreate(ids.map((categoria_id) => ({ marca_id: marca.id, categoria_id })), { transaction, ignoreDuplicates: true });
      return { id: marca.id, nombre: marca.nombre };
    });
  } catch (error) {
    // Dos altas simultáneas de la misma marca: gana una y la otra la reutiliza.
    if (error.name === "SequelizeUniqueConstraintError") throw yaExiste(await marcaConClave(datos.clave));
    throw error;
  }
}

// Categorías con artículos de la marca que quedarían sin ninguna asociación que las cubra.
function categoriasSinCubrir(enUso, asociadas, arbol) {
  const conjunto = new Set(asociadas);
  return enUso.filter((u) => ![u.categoria_id, ...arbol.ancestros(u.categoria_id)].some((id) => conjunto.has(id)));
}

export async function actualizarMarca(id, { nombre, categorias }) {
  const datos = nombreValido(nombre);
  return sequelize.transaction(async (transaction) => {
    const marca = await MarcaDistribuidora.findByPk(id, LOCK(transaction));
    if (!marca) return null;
    const existente = await marcaConClave(datos.clave, transaction, marca.id);
    if (existente) throw yaExiste(existente);
    const ids = await idsCategoriasValidos(categorias, transaction);
    const [arbol, enUso] = await Promise.all([
      cargarArbol(transaction),
      consulta("SELECT categoria_id, count(*)::int AS articulos FROM producto_distribuidora WHERE marca_id = :id AND fecha_baja IS NULL GROUP BY categoria_id", { id: marca.id }, transaction),
    ]);
    const faltan = categoriasSinCubrir(enUso, ids, arbol);
    if (faltan.length) {
      const detalle = faltan.slice(0, 3).map((f) => `${arbol.ruta(f.categoria_id)} (${f.articulos})`).join(", ");
      throw errorMarca(`No se puede quitar: la marca tiene artículos en ${detalle}. Mové o cambiá esos artículos primero.`);
    }
    if (!ids.length) throw errorMarca("Elegí al menos una familia o categoría para la marca.");
    const cambioNombre = marca.nombre !== datos.nombre;
    await marca.update(datos, { transaction });
    if (cambioNombre) await ProductoDistribuidora.update({ marca: datos.nombre }, { where: { marca_id: marca.id }, transaction });
    await MarcaCategoriaDistribuidora.destroy({ where: { marca_id: marca.id, categoria_id: { [Op.notIn]: ids } }, transaction });
    await MarcaCategoriaDistribuidora.bulkCreate(ids.map((categoria_id) => ({ marca_id: marca.id, categoria_id })), { transaction, ignoreDuplicates: true });
    return { id: marca.id, nombre: marca.nombre };
  });
}

/** Une varias marcas en `destinoId`: pasan sus artículos y asociaciones, y se borran. */
export async function unificarMarcas(origenIds, destinoId) {
  return sequelize.transaction(async (transaction) => {
    const ids = [...new Set([...origenIds, destinoId].map(Number))];
    const filas = await MarcaDistribuidora.findAll({ where: { id: ids }, order: [["id", "ASC"]], ...LOCK(transaction) });
    const destino = filas.find((m) => m.id === Number(destinoId));
    const origenes = filas.filter((m) => m.id !== Number(destinoId));
    if (!destino || filas.length !== ids.length) return { ok: false, motivo: "no_encontrada" };
    if (!origenes.length) throw errorMarca("Elegí al menos otra marca para unir.");
    const idsOrigen = origenes.map((m) => m.id);
    const [, articulos] = await sequelize.query(
      "UPDATE producto_distribuidora SET marca_id = :destino, marca = :nombre WHERE marca_id IN (:origenes)",
      { replacements: { destino: destino.id, nombre: destino.nombre, origenes: idsOrigen }, type: QueryTypes.UPDATE, transaction },
    );
    await sequelize.query(
      `INSERT INTO marca_categoria_distribuidora (marca_id, categoria_id)
       SELECT DISTINCT :destino, categoria_id FROM marca_categoria_distribuidora WHERE marca_id IN (:origenes)
       ON CONFLICT DO NOTHING`,
      { replacements: { destino: destino.id, origenes: idsOrigen }, transaction },
    );
    await MarcaDistribuidora.destroy({ where: { id: idsOrigen }, transaction });
    return { ok: true, marca: destino.nombre, articulos, unificadas: idsOrigen.length };
  });
}

/** Solo sin artículos vigentes; los dados de baja conservan el nombre como texto. */
export async function eliminarMarca(id) {
  return sequelize.transaction(async (transaction) => {
    const marca = await MarcaDistribuidora.findByPk(id, LOCK(transaction));
    if (!marca) return { ok: false, motivo: "no_encontrada" };
    const enUso = await ProductoDistribuidora.count({ where: { marca_id: marca.id, fecha_baja: null }, transaction });
    if (enUso) throw errorMarca(`No se puede eliminar: tiene ${enUso} artículo(s). Unificala con otra marca.`);
    await ProductoDistribuidora.update({ marca_id: null }, { where: { marca_id: marca.id }, transaction });
    await marca.destroy({ transaction });
    return { ok: true };
  });
}

/**
 * Marca elegida en la ficha del artículo: valida que exista, devuelve el nombre
 * para la copia de texto y la asocia a la categoría si todavía no la cubre
 * (ni directo ni por su familia). Sin `marca_id`, acepta el nombre en texto
 * (clientes de la API anteriores a la tabla de marcas) y la busca o crea.
 */
export async function resolverMarcaDeArticulo({ marca_id, marca: texto, categoria_id }, transaction) {
  let marca = null;
  if (marca_id != null && marca_id !== "") {
    marca = await MarcaDistribuidora.findByPk(Number(marca_id), { attributes: ["id", "nombre"], raw: true, transaction });
    if (!marca) throw errorMarca("La marca elegida ya no existe; elegí otra.");
  } else if (marca_id === undefined && typeof texto === "string" && claveMarca(texto)) {
    marca = [...(await asegurarMarcasPorNombre([texto], transaction)).values()][0] ?? null;
  }
  if (!marca) return { marca_id: null, marca: null };
  await asociarSiFalta([{ marca_id: marca.id, categoria_id: Number(categoria_id) }], transaction);
  return { marca_id: marca.id, marca: marca.nombre };
}

// Asocia cada (marca, categoría) salvo que ya la cubra la categoría o una de sus familias.
export async function asociarSiFalta(pares, transaction) {
  if (!pares.length) return;
  const arbol = await cargarArbol(transaction);
  const marcas = [...new Set(pares.map((p) => p.marca_id))];
  const existentes = await MarcaCategoriaDistribuidora.findAll({ where: { marca_id: marcas }, attributes: ["marca_id", "categoria_id"], raw: true, transaction });
  const tiene = new Set(existentes.map((e) => `${e.marca_id}:${e.categoria_id}`));
  const nuevos = pares.filter((p) => ![p.categoria_id, ...arbol.ancestros(p.categoria_id)].some((c) => tiene.has(`${p.marca_id}:${c}`)));
  if (nuevos.length) await MarcaCategoriaDistribuidora.bulkCreate(nuevos, { transaction, ignoreDuplicates: true });
}

/**
 * Importación (y paso de datos viejos): resuelve nombres de marca a filas de la
 * tabla, creando las que falten. Devuelve Map clave → { id, nombre }.
 */
export async function asegurarMarcasPorNombre(nombres, transaction) {
  const porClave = new Map();
  for (const nombre of nombres) {
    const formateado = formatearNombre(nombre);
    const clave = claveMarca(formateado);
    if (clave && !porClave.has(clave)) porClave.set(clave, formateado.slice(0, 80));
  }
  if (!porClave.size) return new Map();
  const claves = [...porClave.keys()];
  await MarcaDistribuidora.bulkCreate(claves.map((clave) => ({ clave, nombre: porClave.get(clave), fecha_alta: new Date() })), { transaction, ignoreDuplicates: true });
  const filas = await MarcaDistribuidora.findAll({ where: { clave: claves }, attributes: ["id", "nombre", "clave"], raw: true, transaction });
  return new Map(filas.map((f) => [f.clave, { id: f.id, nombre: f.nombre }]));
}

/**
 * Paso único de datos viejos (corre en el bootstrap, idempotente): los artículos
 * con marca en texto y sin marca_id reciben su marca de la tabla (creándola si
 * falta, con las repetidas unidas por clave) y se asocian a su categoría.
 */
export async function sincronizarMarcasLegado() {
  return sequelize.transaction(async (transaction) => {
    const textos = (await consulta(
      "SELECT DISTINCT marca FROM producto_distribuidora WHERE marca_id IS NULL AND marca IS NOT NULL AND btrim(marca) <> ''", {}, transaction,
    )).map((f) => f.marca);
    if (!textos.length) return { marcas: 0, articulos: 0 };
    const mapa = await asegurarMarcasPorNombre(textos, transaction);
    let articulos = 0;
    for (const texto of textos) {
      const marca = mapa.get(claveMarca(formatearNombre(texto)));
      if (!marca) continue;
      const [, n] = await sequelize.query(
        "UPDATE producto_distribuidora SET marca_id = :id, marca = :nombre WHERE marca_id IS NULL AND marca = :texto",
        { replacements: { id: marca.id, nombre: marca.nombre, texto }, type: QueryTypes.UPDATE, transaction },
      );
      articulos += n;
    }
    const pares = await consulta(
      "SELECT DISTINCT marca_id, categoria_id FROM producto_distribuidora WHERE marca_id IN (:ids) AND fecha_baja IS NULL",
      { ids: [...mapa.values()].map((m) => m.id) }, transaction,
    );
    await asociarSiFalta(pares, transaction);
    return { marcas: mapa.size, articulos };
  });
}
