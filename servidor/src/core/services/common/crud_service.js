import { Op } from "sequelize";
import { normalizarPaginacion, armarPaginacion } from "./pagination.js";
import { armarBusquedaTexto } from "./query_helpers.js";

/**
 * Factory de operaciones mecánicas de CRUD sobre un modelo Sequelize:
 * listar (con o sin paginación), obtenerPorId, cambiarEstado.
 *
 * A propósito NO incluye crear/actualizar: en este proyecto casi todo
 * "crear"/"actualizar" real trae validación de negocio (unicidad, mensajes
 * en español, transacciones con tablas de log) que no vale la pena forzar
 * a un config genérico — se quedan como funciones propias de cada service,
 * llamando a Model.create()/instancia.update() directamente.
 */
export function crearCrudService(Model, config = {}) {
  const {
    defaultOrder = [["id", "DESC"]],
    defaultAttributes,
    include,
    searchable = [],
    softDeleteField = null,
    activeField = "activo",
  } = config;

  if (!defaultAttributes && ["Usuario", "Persona"].includes(Model.name)) {
    throw new Error(
      `crearCrudService(${Model.name}): pasá "defaultAttributes" explícito — sin eso el SELECT trae todas las columnas, incluyendo posibles datos sensibles.`
    );
  }

  function construirWhere({ where = {}, q } = {}) {
    const finalWhere = { ...where };
    if (softDeleteField) finalWhere[softDeleteField] = null;

    const busqueda = q ? armarBusquedaTexto(searchable, q) : null;
    return busqueda ? { [Op.and]: [finalWhere, busqueda] } : finalWhere;
  }

  /**
   * Sin page/limit: devuelve todos los registros ({ok, items}) — para catálogos/ABM chicos.
   * Con page y/o limit: devuelve {ok, items, pagination} vía findAndCountAll.
   */
  async function listar({ page, limit, q, where, order = defaultOrder } = {}) {
    const finalWhere = construirWhere({ where, q });

    if (page == null && limit == null) {
      const items = await Model.findAll({ where: finalWhere, attributes: defaultAttributes, include, order });
      return { ok: true, items };
    }

    const { page: p, limit: l, offset } = normalizarPaginacion({ page, limit });

    const { rows, count } = await Model.findAndCountAll({
      where: finalWhere,
      attributes: defaultAttributes,
      include,
      order,
      limit: l,
      offset,
      distinct: true,
    });

    return { ok: true, items: rows, pagination: armarPaginacion({ page: p, limit: l, total: count }) };
  }

  async function obtenerPorId(id) {
    const where = { id };
    if (softDeleteField) where[softDeleteField] = null;
    return Model.findOne({ where, attributes: defaultAttributes, include });
  }

  async function cambiarEstado(id, activo) {
    const item = await Model.findByPk(id);
    if (!item) return null;
    await item.update({ [activeField]: !!activo });
    return item;
  }

  async function eliminar(id) {
    const item = await Model.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
  }

  return { listar, obtenerPorId, cambiarEstado, eliminar };
}
