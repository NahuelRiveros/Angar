import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Listas de precios regionales. La "General" no es una fila: es el precio de
 * cada VariedadDistribuidora. Una lista solo guarda los artículos que cambian
 * (ListaPrecioItem); el resto se cobra con la General.
 */
export const ListaPrecio = defineModel("ListaPrecio", {
  nombre: { type: DataTypes.STRING(80), allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  fecha_alta: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_mod:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "lista_precio",
  indexes: [{ unique: true, fields: ["nombre"], name: "lista_precio_nombre_unique" }],
});

/**
 * Localidades donde aplica cada lista, con los mismos nombres que guarda el
 * perfil del cliente (catálogo de ubicación). `clave` normaliza provincia +
 * departamento + localidad y es única: una localidad pertenece a una sola lista.
 */
export const ListaPrecioLocalidad = defineModel("ListaPrecioLocalidad", {
  lista_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: "lista_precio", key: "id" }, onDelete: "CASCADE",
  },
  provincia:    { type: DataTypes.STRING(50), allowNull: false },
  departamento: { type: DataTypes.STRING(100), allowNull: true },
  localidad:    { type: DataTypes.STRING(100), allowNull: false },
  clave:        { type: DataTypes.STRING(260), allowNull: false },
}, {
  tableName: "lista_precio_localidad",
  indexes: [
    { unique: true, fields: ["clave"], name: "lista_precio_localidad_clave_unique" },
    { fields: ["lista_id"] },
  ],
});

/**
 * Precio especial de una presentación en una lista. `precio_anterior` mayor al
 * precio marca una oferta en esa región (igual criterio que la variedad).
 */
export const ListaPrecioItem = defineModel("ListaPrecioItem", {
  lista_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: "lista_precio", key: "id" }, onDelete: "CASCADE",
  },
  variedad_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: "variedad_distribuidora", key: "id" }, onDelete: "CASCADE",
  },
  precio:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  precio_anterior: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  fecha_mod: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "lista_precio_item",
  indexes: [
    { unique: true, fields: ["lista_id", "variedad_id"], name: "lista_precio_item_unique" },
    { fields: ["variedad_id"] },
  ],
});
