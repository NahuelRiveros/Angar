import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/** Catálogo de géneros (Masculino, Femenino, Otro). */
export const Sexo = defineModel("Sexo", {
  descripcion: { type: DataTypes.STRING(50), allowNull: false },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "sexo",
  // SIS-51: los únicos de texto van como índice con nombre fijo: con `unique: true` en la columna,
  // cada sync({ alter: true }) agregaba otra restricción igual.
  indexes: [{ name: "sexo_descripcion_key", unique: true, fields: ["descripcion"] }],
});
