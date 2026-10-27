import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/** Premio de una categoría por puesto, en texto libre ("$200.000 + trofeo"). */
export const TorneoPremio = defineModel("TorneoPremio", {
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "torneo_categoria", key: "id" },
    onDelete: "CASCADE",
  },
  // campeon | subcampeon | semifinalista | cuartofinalista | otro (ver PUESTOS)
  puesto: { type: DataTypes.STRING(20), allowNull: false },
  // Solo para "otro": cómo se llama ese puesto ("Mejor pareja", "Fair play").
  etiqueta: { type: DataTypes.STRING(40), allowNull: true },
  descripcion: { type: DataTypes.STRING(200), allowNull: false },
  orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "torneo_premio",
  indexes: [{ fields: ["categoria_id", "orden"] }],
});
