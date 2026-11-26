import { DataTypes } from "sequelize";
import { defineModel } from "../../models/common/define_model.js";
import { aplicarRelaciones } from "../../models/common/relaciones.js";

// Las tablas las crean las migraciones (carpeta migraciones/): un cambio acá necesita la suya.
// Spec: docs/specs/core/catalogo.md.
const fechas = {
  creado_en:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
};

/** MCA-05: dos niveles. Una categoría con `padre_id` es del segundo. */
export const CatCategoria = defineModel("CatCategoria", {
  padre_id: { type: DataTypes.INTEGER, allowNull: true },
  nombre:   { type: DataTypes.STRING(60), allowNull: false },
  slug:     { type: DataTypes.STRING(90), allowNull: false },
  orden:    { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  activo:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ...fechas,
}, { tableName: "cat_categoria" });

/** MCA-01. `activo` = se ve en la web; `eliminado_en` = dado de baja (MCA-08). */
export const CatProducto = defineModel("CatProducto", {
  categoria_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre:       { type: DataTypes.STRING(120), allowNull: false },
  slug:         { type: DataTypes.STRING(90), allowNull: false },
  descripcion:  { type: DataTypes.TEXT, allowNull: true },
  destacado:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  activo:       { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  version:      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  eliminado_en: { type: DataTypes.DATE, allowNull: true },
  ...fechas,
}, { tableName: "cat_producto" });

/** MCA-02: lo que se vende. No se borra de verdad: stock y pedidos la siguen nombrando. */
export const CatVariante = defineModel("CatVariante", {
  producto_id:     { type: DataTypes.INTEGER, allowNull: false },
  nombre:          { type: DataTypes.STRING(60), allowNull: true },
  codigo:          { type: DataTypes.STRING(40), allowNull: true },
  precio:          { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  precio_anterior: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  disponible:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  orden:           { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  eliminado_en:    { type: DataTypes.DATE, allowNull: true },
}, { tableName: "cat_variante" });

export const CatFoto = defineModel("CatFoto", {
  producto_id: { type: DataTypes.INTEGER, allowNull: false },
  url:         { type: DataTypes.STRING(500), allowNull: false },
  orden:       { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
}, { tableName: "cat_foto" });

aplicarRelaciones([
  { tipo: "belongsTo", from: CatCategoria, to: CatCategoria, foreignKey: "padre_id", as: "padre" },
  { tipo: "belongsTo", from: CatProducto, to: CatCategoria, foreignKey: "categoria_id", as: "categoria" },
  { tipo: "hasMany",   from: CatProducto, to: CatVariante, foreignKey: "producto_id", as: "variantes" },
  { tipo: "belongsTo", from: CatVariante, to: CatProducto, foreignKey: "producto_id", as: "producto" },
  { tipo: "hasMany",   from: CatProducto, to: CatFoto, foreignKey: "producto_id", as: "fotos" },
]);
