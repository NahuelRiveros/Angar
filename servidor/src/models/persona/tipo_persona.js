import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/** Catálogo de categorías de persona (ej. Administrativo). */
export const TipoPersona = defineModel("TipoPersona", {
  descripcion: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "tipo_persona",
});
