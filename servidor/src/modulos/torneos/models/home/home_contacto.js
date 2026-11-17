import { DataTypes } from "sequelize";
import { defineModel } from "../../../../core/models/common/define_model.js";

/**
 * Reemplaza el array CONTACTS hardcodeado (dirección, Instagram, etc.) de
 * home_page.jsx. `icono` validado contra el mismo mapa fijo que HomePilar.
 */
export const HomeContacto = defineModel("HomeContacto", {
  icono:  { type: DataTypes.STRING(40), allowNull: false },
  label:  { type: DataTypes.STRING(80), allowNull: false },
  valor:  { type: DataTypes.STRING(255), allowNull: false },
  href:   { type: DataTypes.STRING(500), allowNull: true },
  orden:  { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "home_contacto",
  indexes: [
    { fields: ["activo"] },
    { fields: ["orden"] },
  ],
});
