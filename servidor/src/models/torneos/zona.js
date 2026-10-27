import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/** Zona (grupo) de una categoría: sus parejas son las inscripciones con este zona_id. */
export const Zona = defineModel("Zona", {
  categoria_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "torneo_categoria", key: "id" } },
  nombre: { type: DataTypes.STRING(5), allowNull: false },
  orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "zona",
  indexes: [{ fields: ["categoria_id", "orden"] }],
});
