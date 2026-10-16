import { Op } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { CategoriaDistribuidora, ProductoDistribuidora, VariedadDistribuidora, CarritoDistribuidoraItem } from "../../models/index.js";
import { crearCrudService } from "../common/crud_service.js";
import { formatearNombre } from "../common/formato_nombre.js";

/**
 * Catálogo de categorías de distribuidora (jerárquicas). Mismo patrón que
 * services/productos/catalogos_service.js (indumentaria) — baja lógica por
 * `fecha_baja`, no el `activo` booleano genérico de crearCrudService.
 */

const categoriasCrud = crearCrudService(CategoriaDistribuidora, {
  defaultOrder: [["nombre", "ASC"]],
  defaultAttributes: ["id", "nombre", "slug", "padre_id"],
  softDeleteField: "fecha_baja",
});

// `cantidad_productos` viaja con cada categoría para que el árbol del admin
// pueda decidir "esto tiene contenido / es hoja / hace falta cargar sus
// productos" SIN tener que traer los productos en sí — clave para que el
// árbol cargue productos recién al expandir una categoría (carga perezosa,
// pensado para catálogos de miles de productos).
export async function listarCategorias() {
  const [{ items }, conteos] = await Promise.all([
    categoriasCrud.listar(),
    ProductoDistribuidora.findAll({
      attributes: ["categoria_id", [sequelize.fn("COUNT", sequelize.col("id")), "cantidad"]],
      where: { fecha_baja: null },
      group: ["categoria_id"],
      raw: true,
    }),
  ]);
  const mapaConteos = new Map(conteos.map((c) => [c.categoria_id, Number(c.cantidad)]));
  return items.map((cat) => ({ ...cat.get({ plain: true }), cantidad_productos: mapaConteos.get(cat.id) ?? 0 }));
}

export async function existeCategoriaConSlug(slug, excluirId = null) {
  const where = { slug, fecha_baja: null };
  if (excluirId) where.id = { [Op.ne]: excluirId };
  return !!(await CategoriaDistribuidora.findOne({ where }));
}

// Dos niveles fijos: Familia (sin padre) › Categoría (hija de una familia).
// Los niveles más profundos que ya existan se respetan mientras no se les cambie el padre.
export const errorCategoria = (mensaje) => Object.assign(new Error(mensaje), { codigo: "CATEGORIA_INVALIDA" });
const clave = (nombre) => String(nombre ?? "").trim().toLocaleLowerCase("es");
const LOCK = (transaction) => ({ lock: transaction.LOCK.UPDATE, transaction });

async function validarPadre(id, padreId) {
  if (padreId == null) return;
  if (id != null && Number(padreId) === Number(id)) throw errorCategoria("Una familia no puede estar dentro de sí misma.");
  const padre = await CategoriaDistribuidora.findByPk(padreId);
  if (!padre) throw errorCategoria("La familia elegida no existe.");
  if (padre.padre_id != null) throw errorCategoria("Solo hay dos niveles: elegí una familia, no una categoría.");
  if (id != null && await CategoriaDistribuidora.count({ where: { padre_id: id } })) {
    throw errorCategoria("Esta familia tiene categorías: fusionala con otra antes de convertirla en categoría.");
  }
}

export async function crearCategoria({ nombre, slug, padre_id = null }) {
  await validarPadre(null, padre_id);
  return CategoriaDistribuidora.create({ nombre: formatearNombre(nombre), slug, padre_id, fecha_alta: new Date() });
}

export async function actualizarCategoria(id, { nombre, slug, padre_id = null }) {
  const cat = await CategoriaDistribuidora.findByPk(id);
  if (!cat) return null;
  if ((padre_id ?? null) !== (cat.padre_id ?? null)) await validarPadre(cat.id, padre_id);
  await cat.update({ nombre: formatearNombre(nombre), slug, padre_id });
  return cat;
}

// Pasa los artículos (también los dados de baja, para que ninguna fila quede
// apuntando a la categoría que se borra) y las subcategorías heredadas.
async function moverContenido(desdeId, haciaId, transaction) {
  const [productos] = await ProductoDistribuidora.update({ categoria_id: haciaId }, { where: { categoria_id: desdeId }, transaction });
  await CategoriaDistribuidora.update({ padre_id: haciaId }, { where: { padre_id: desdeId }, transaction });
  // Las marcas ofrecidas en la categoría que se borra pasan a ofrecerse en el destino.
  await sequelize.query(
    `INSERT INTO marca_categoria_distribuidora (marca_id, categoria_id)
     SELECT marca_id, :hacia FROM marca_categoria_distribuidora WHERE categoria_id = :desde
     ON CONFLICT DO NOTHING`,
    { replacements: { desde: desdeId, hacia: haciaId }, transaction },
  );
  return productos;
}

/**
 * Fusiona `origenId` dentro de `destinoId` y borra el origen. Familia con familia:
 * sus categorías pasan al destino y las de igual nombre se fusionan entre sí.
 * Categoría con categoría o con familia: solo se mueven sus artículos.
 */
export async function fusionarCategoria(origenId, destinoId) {
  return sequelize.transaction(async (transaction) => {
    const filas = await CategoriaDistribuidora.findAll({ where: { id: [origenId, destinoId] }, order: [["id", "ASC"]], ...LOCK(transaction) });
    const origen = filas.find((c) => c.id === Number(origenId));
    const destino = filas.find((c) => c.id === Number(destinoId));
    if (!origen || !destino) return { ok: false, motivo: "no_encontrada" };
    if (origen.id === destino.id) throw errorCategoria("Elegí otra familia o categoría como destino.");
    if (origen.padre_id == null && destino.padre_id != null) throw errorCategoria("Una familia solo se puede fusionar con otra familia.");

    // Las categorías del origen quedan en la familia del destino (nunca en un tercer nivel).
    const familiaDestino = destino.padre_id ?? destino.id;
    const [hijos, existentes] = await Promise.all([
      CategoriaDistribuidora.findAll({ where: { padre_id: origen.id }, order: [["id", "ASC"]], ...LOCK(transaction) }),
      CategoriaDistribuidora.findAll({ where: { padre_id: familiaDestino }, order: [["id", "ASC"]], ...LOCK(transaction) }),
    ]);
    const porNombre = new Map(existentes.map((c) => [clave(c.nombre), c]));
    let productosMovidos = 0;
    let categoriasMovidas = 0;
    let categoriasFusionadas = 0;
    for (const hijo of hijos) {
      const igual = porNombre.get(clave(hijo.nombre));
      if (igual) {
        productosMovidos += await moverContenido(hijo.id, igual.id, transaction);
        await hijo.destroy({ transaction });
        categoriasFusionadas += 1;
      } else {
        await hijo.update({ padre_id: familiaDestino }, { transaction });
        porNombre.set(clave(hijo.nombre), hijo);
        categoriasMovidas += 1;
      }
    }
    productosMovidos += await moverContenido(origen.id, destino.id, transaction);
    await origen.destroy({ transaction });
    return { ok: true, productos_movidos: productosMovidos, categorias_movidas: categoriasMovidas, categorias_fusionadas: categoriasFusionadas };
  });
}

/** Mueve varias categorías a una familia en una sola transacción; no fusiona nombres repetidos. */
export async function moverCategorias(ids, familiaId) {
  return sequelize.transaction(async (transaction) => {
    const filas = await CategoriaDistribuidora.findAll({ where: { id: [...ids, familiaId] }, order: [["id", "ASC"]], ...LOCK(transaction) });
    const familia = filas.find((c) => c.id === Number(familiaId));
    const elegidas = filas.filter((c) => ids.includes(c.id));
    if (!familia || elegidas.length !== ids.length) return { ok: false, motivo: "no_encontrada" };
    if (familia.padre_id != null) throw errorCategoria("Solo se puede mover a una familia.");
    if (ids.includes(familia.id)) throw errorCategoria("Una familia no puede estar dentro de sí misma.");
    if (await CategoriaDistribuidora.count({ where: { padre_id: ids }, transaction })) {
      throw errorCategoria("Alguna de las elegidas es una familia con categorías: usá Fusionar.");
    }
    const ocupados = new Set((await CategoriaDistribuidora.findAll({ where: { padre_id: familia.id }, attributes: ["id", "nombre"], transaction }))
      .filter((c) => !ids.includes(c.id)).map((c) => clave(c.nombre)));
    for (const c of elegidas) {
      if (ocupados.has(clave(c.nombre))) throw errorCategoria(`Ya hay una categoría "${c.nombre}" en ${familia.nombre}: usá Fusionar.`);
      ocupados.add(clave(c.nombre));
    }
    await CategoriaDistribuidora.update({ padre_id: familia.id }, { where: { id: ids }, transaction });
    // Artículos cuyas marcas se ofrecían solo por la familia anterior: se asocian a su categoría.
    await sequelize.query(
      `INSERT INTO marca_categoria_distribuidora (marca_id, categoria_id)
       SELECT DISTINCT p.marca_id, p.categoria_id FROM producto_distribuidora p
       WHERE p.categoria_id IN (:ids) AND p.marca_id IS NOT NULL AND p.fecha_baja IS NULL
         AND NOT EXISTS (SELECT 1 FROM marca_categoria_distribuidora mc WHERE mc.marca_id = p.marca_id AND mc.categoria_id IN (p.categoria_id, :familia))
       ON CONFLICT DO NOTHING`,
      { replacements: { ids, familia: familia.id }, transaction },
    );
    return { ok: true, movidas: ids.length };
  });
}

// Eliminación definitiva — bloqueada si hay productos ACTIVOS usándola,
// promueve subcategorías a raíz en vez de arrastrarlas (igual criterio que
// Categoria).
//
// Un producto ya eliminado (soft-delete, fecha_baja seteada) es invisible en
// toda la app pero la fila sigue existiendo — y producto_distribuidora.categoria_id
// no tiene ON DELETE CASCADE/SET NULL, así que esa fila igual bloquearía el
// DELETE de la categoría con un error de foreign key si no se limpia. Como ya
// está soft-deleted (el admin ya decidió borrarlo), se purga de verdad acá:
// primero sus variedades y cualquier ítem de carrito que las referencie
// (nota_pedido_item apunta a ambas con ON DELETE SET NULL, así que el
// historial de pedidos ya entregados/pendientes no se toca), y por último el
// producto. Todo en una transacción para no dejar un estado a medias si algo falla.
export async function eliminarCategoria(id) {
  const cat = await CategoriaDistribuidora.findByPk(id);
  if (!cat) return { ok: false, motivo: "no_encontrada" };

  const productosActivos = await ProductoDistribuidora.count({ where: { categoria_id: id, fecha_baja: null } });
  if (productosActivos > 0) {
    return { ok: false, motivo: "en_uso", cantidad: productosActivos };
  }

  return sequelize.transaction(async (t) => {
    const productosEliminados = await ProductoDistribuidora.findAll({
      where: { categoria_id: id, fecha_baja: { [Op.ne]: null } },
      attributes: ["id"],
      transaction: t,
    });

    if (productosEliminados.length > 0) {
      const idsProductos = productosEliminados.map((p) => p.id);
      const variedades = await VariedadDistribuidora.findAll({
        where: { producto_id: { [Op.in]: idsProductos } },
        attributes: ["id"],
        transaction: t,
      });
      const idsVariedades = variedades.map((v) => v.id);

      if (idsVariedades.length > 0) {
        await CarritoDistribuidoraItem.destroy({ where: { variedad_id: { [Op.in]: idsVariedades } }, transaction: t });
        await VariedadDistribuidora.destroy({ where: { id: { [Op.in]: idsVariedades } }, transaction: t });
      }
      await CarritoDistribuidoraItem.destroy({ where: { producto_id: { [Op.in]: idsProductos } }, transaction: t });
      await ProductoDistribuidora.destroy({ where: { id: { [Op.in]: idsProductos } }, transaction: t });
    }

    await CategoriaDistribuidora.update({ padre_id: null }, { where: { padre_id: id }, transaction: t });
    await cat.destroy({ transaction: t });
    return { ok: true };
  });
}
