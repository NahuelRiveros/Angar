import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Tabla de unión N:N entre usuario y rol.
 * UNIQUE(usuario_id, rol_id) previene duplicados a nivel DB.
 * ON DELETE CASCADE: si se elimina el usuario, se limpian sus roles.
 */
export const UsuarioRol = defineModel("UsuarioRol", {
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "usuario", key: "id" },
    onDelete: "CASCADE",
  },
  rol_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "rol", key: "id" },
  },

  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "usuario_rol",
  indexes: [
    { unique: true, fields: ["usuario_id", "rol_id"] },
    { fields: ["usuario_id"] },
  ],
});
