import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Asignación de permisos a roles (N:N).
 * UNIQUE(rol_id, permiso_id) previene duplicados.
 * ON DELETE CASCADE: borrar un rol o permiso limpia automáticamente sus asignaciones.
 *
 * Para verificar si un usuario tiene un permiso:
 *   SELECT 1 FROM rol_permiso rp
 *   JOIN usuario_rol ur ON ur.rol_id = rp.rol_id
 *   WHERE ur.usuario_id = :uid AND rp.permiso_id = (SELECT id FROM permiso WHERE codigo = :codigo)
 */
export const RolPermiso = defineModel("RolPermiso", {
  rol_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "rol", key: "id" },
    onDelete: "CASCADE",
  },
  permiso_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "permiso", key: "id" },
    onDelete: "CASCADE",
  },

  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "rol_permiso",
  indexes: [
    { unique: true, fields: ["rol_id", "permiso_id"] },
    { fields: ["rol_id"] },
    { fields: ["permiso_id"] },
  ],
});
