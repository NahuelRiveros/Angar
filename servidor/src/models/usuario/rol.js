import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Roles del sistema.
 * codigo es el identificador de negocio que se usa en roles y permisos: 'admin', 'supervisor', 'vendedor' o uno creado en el panel.
 */
export const Rol = defineModel("Rol", {
  codigo:      { type: DataTypes.STRING(50), allowNull: false, unique: true },
  descripcion: { type: DataTypes.STRING(150), allowNull: false },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "rol",
});
