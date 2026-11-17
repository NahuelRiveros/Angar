import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/** Catálogo de categorías de persona (ej. Administrativo). */
export const TipoPersona = defineModel("TipoPersona", {
  descripcion: { type: DataTypes.STRING(80), allowNull: false },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "tipo_persona",
  // SIS-51: los únicos de texto van como índice con nombre fijo: con `unique: true` en la columna,
  // cada sync({ alter: true }) agregaba otra restricción igual.
  indexes: [{ name: "tipo_persona_descripcion_key", unique: true, fields: ["descripcion"] }],
});
