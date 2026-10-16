import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Marcas del catálogo de distribuidora. `clave` es el nombre normalizado
 * (minúsculas, sin acentos ni signos): "BAGLEY", "Bagley" y "Bag-ley" son la
 * misma marca y el índice único impide cargarla dos veces.
 * El artículo guarda `marca_id` y además una copia del nombre en
 * producto_distribuidora.marca (la usan la tienda, la búsqueda y la lista de
 * carga); los servicios de marcas mantienen esa copia al renombrar o unificar.
 */
export const MarcaDistribuidora = defineModel("MarcaDistribuidora", {
  nombre: { type: DataTypes.STRING(80), allowNull: false },
  clave:  { type: DataTypes.STRING(80), allowNull: false },
  fecha_alta: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "marca_distribuidora",
  indexes: [{ unique: true, fields: ["clave"], name: "marca_distribuidora_clave_unique" }],
});

/**
 * Dónde se ofrece cada marca: una familia entera (categoría raíz, vale para todas
 * sus categorías) o categorías puntuales. La ficha del artículo muestra las marcas
 * de la categoría elegida y de su familia. Una marca con artículos en una
 * categoría siempre queda asociada a ella o a su familia.
 */
export const MarcaCategoriaDistribuidora = defineModel("MarcaCategoriaDistribuidora", {
  marca_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: "marca_distribuidora", key: "id" }, onDelete: "CASCADE",
  },
  categoria_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: "categoria_distribuidora", key: "id" }, onDelete: "CASCADE",
  },
}, {
  tableName: "marca_categoria_distribuidora",
  indexes: [
    { unique: true, fields: ["marca_id", "categoria_id"], name: "marca_categoria_distribuidora_unique" },
    { fields: ["categoria_id"] },
  ],
});
