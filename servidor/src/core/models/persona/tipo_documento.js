import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/** Catálogo de tipos de documento (DNI, Pasaporte, CUIL, etc.). */
export const TipoDocumento = defineModel("TipoDocumento", {
  descripcion: { type: DataTypes.STRING(80), allowNull: false },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "tipo_documento",
  // SIS-51: los únicos de texto van como índice con nombre fijo: con `unique: true` en la columna,
  // cada sync({ alter: true }) agregaba otra restricción igual.
  indexes: [{ name: "tipo_documento_descripcion_key", unique: true, fields: ["descripcion"] }],
});
