import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Secciones funcionales del sistema (usuarios, stock, home, etc.).
 * Agrupa permisos y sirve para renderizar el panel de gestión de roles en la UI.
 * El campo `orden` define el orden de aparición en ese panel.
 */
export const Modulo = defineModel("Modulo", {
  codigo:      { type: DataTypes.STRING(50), allowNull: false, unique: true },
  descripcion: { type: DataTypes.STRING(150), allowNull: false },
  // Orden de aparición en el panel de gestión de roles
  orden:       { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "modulo",
  indexes: [
    { fields: ["orden"] },
  ],
});
