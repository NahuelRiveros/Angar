import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/** Catálogo de áreas del home (General). */
export const HomeArea = defineModel("HomeArea", {
  descripcion: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  // Cómo se muestra la galería de esta área en el home público.
  layout:      { type: DataTypes.STRING(10), allowNull: false, defaultValue: "grid", validate: { isIn: [["grid", "carrusel"]] } },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "home_area",
});
