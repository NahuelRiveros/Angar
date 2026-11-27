import { Op } from "sequelize";
import { sequelize } from "../../../database/sequelize.js";
import { ErrorApp } from "../../../services/common/errores.js";
import { obtenerOFallar, sinRepetir } from "../../../services/common/consultas.js";
import { CatCategoria, CatProducto } from "../modelos.js";
import { slug, slugLibre } from "../reglas.js";
import { cacheCatalogo } from "./cache.js";

// MCA-05: categorías de dos niveles.
const ORDEN = [["orden", "ASC"], ["nombre", "ASC"], ["id", "ASC"]];
const REPETIDA = "Ya hay una categoría con ese nombre en ese nivel.";
const NO_EXISTE = "Esa categoría no existe.";

export const listarCategorias = () => CatCategoria.findAll({ order: ORDEN, raw: true });

/** Las que se ven en la web: activas y, si son del segundo nivel, con la de arriba activa. */
export const categoriasVisibles = () => cacheCatalogo.obtener("categorias", async () => {
  const activas = await CatCategoria.findAll({ where: { activo: true }, attributes: ["id", "padre_id", "nombre", "slug"], order: ORDEN, raw: true });
  const ids = new Set(activas.map((c) => c.id));
  return activas.filter((c) => c.padre_id === null || ids.has(c.padre_id));
});

/** El id de una categoría y los de las que tiene adentro. */
export async function conSubcategorias(id) {
  const hijas = await CatCategoria.findAll({ where: { padre_id: id }, attributes: ["id"], raw: true });
  return [id, ...hijas.map((c) => c.id)];
}

async function controlarPadre(padre_id, propia, transaction) {
  if (padre_id === null) return;
  const padre = await obtenerOFallar(CatCategoria, padre_id, "La categoría de arriba no existe.", { transaction, bloquear: true });
  if (padre.padre_id !== null || padre.id === propia?.id) throw new ErrorApp("NIVELES", "Las categorías tienen dos niveles: elegí una del primero.", 409);
  if (propia && await CatCategoria.count({ where: { padre_id: propia.id }, transaction })) {
    throw new ErrorApp("NIVELES", "Esta categoría tiene subcategorías: no puede estar dentro de otra.", 409);
  }
}

export async function crearCategoria(datos) {
  const categoria = await sinRepetir(() => sequelize.transaction(async (transaction) => {
    await controlarPadre(datos.padre_id, null, transaction);
    const usados = await CatCategoria.findAll({ where: { slug: { [Op.like]: `${slug(datos.nombre)}%` } }, attributes: ["slug"], raw: true, transaction });
    return CatCategoria.create({ ...datos, slug: slugLibre(datos.nombre, usados.map((c) => c.slug)) }, { transaction });
  }), REPETIDA);
  cacheCatalogo.vaciar();
  return categoria;
}

export async function actualizarCategoria(id, datos) {
  const categoria = await sinRepetir(() => sequelize.transaction(async (transaction) => {
    const propia = await obtenerOFallar(CatCategoria, id, NO_EXISTE, { transaction, bloquear: true });
    await controlarPadre(datos.padre_id, propia, transaction);
    // La dirección (slug) no cambia: los links compartidos siguen andando.
    return propia.update({ ...datos, actualizado_en: new Date() }, { transaction });
  }), REPETIDA);
  cacheCatalogo.vaciar();
  return categoria;
}

export async function eliminarCategoria(id) {
  await sequelize.transaction(async (transaction) => {
    const categoria = await obtenerOFallar(CatCategoria, id, NO_EXISTE, { transaction, bloquear: true });
    if (await CatCategoria.count({ where: { padre_id: id }, transaction })) throw new ErrorApp("EN_USO", "No se puede borrar: tiene subcategorías.", 409);
    if (await CatProducto.count({ where: { categoria_id: id }, transaction })) {
      throw new ErrorApp("EN_USO", "No se puede borrar: tiene productos (también cuentan los dados de baja). Podés ocultarla.", 409);
    }
    await categoria.destroy({ transaction });
  });
  cacheCatalogo.vaciar();
}
