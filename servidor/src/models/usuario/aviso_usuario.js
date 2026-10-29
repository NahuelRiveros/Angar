import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Novedad para un usuario en la campanita (lo confirmaron, le rechazaron el comprobante, le
 * asignaron horario…). El texto queda armado; `ruta` es a dónde lleva dentro de la web.
 */
export const AvisoUsuario = defineModel("AvisoUsuario", {
  usuario_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "usuario", key: "id" }, onDelete: "CASCADE" },
  tipo: { type: DataTypes.STRING(40), allowNull: false },
  titulo: { type: DataTypes.STRING(160), allowNull: false },
  detalle: { type: DataTypes.STRING(300), allowNull: true },
  ruta: { type: DataTypes.STRING(200), allowNull: true },
  leido_en: { type: DataTypes.DATE, allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "aviso_usuario",
  indexes: [{ fields: ["usuario_id", "creado_en"] }],
});
