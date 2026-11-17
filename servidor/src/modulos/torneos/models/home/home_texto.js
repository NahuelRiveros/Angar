import { DataTypes } from "sequelize";
import { defineModel } from "../../../../core/models/common/define_model.js";

/**
 * Textos editables del home (hero, títulos de sección, CTA final, etc.) —
 * un valor por `clave`, no es una lista. `seccion` agrupa el formulario del
 * panel admin (hero, pilares, galeria, contacto, footer_cta).
 */
export const HomeTexto = defineModel("HomeTexto", {
  clave:     { type: DataTypes.STRING(60), allowNull: false, unique: true },
  etiqueta:  { type: DataTypes.STRING(150), allowNull: false },
  seccion:   { type: DataTypes.STRING(30), allowNull: false },
  valor:     { type: DataTypes.TEXT, allowNull: true },
  orden:     { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },

  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "home_texto",
  indexes: [
    { fields: ["seccion"] },
  ],
});
