import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Plan de un organizador: una fila por usuario. Puede organizar mientras
 * hoy (hora de Argentina) <= fecha_vencimiento; después queda en solo lectura.
 * Fechas sin hora (DATEONLY) para que el vencimiento no dependa de la zona horaria.
 */
export const Suscripcion = defineModel("Suscripcion", {
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: "usuario", key: "id" },
  },
  fecha_inicio:      { type: DataTypes.DATEONLY, allowNull: false },
  fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: false },
  // true mientras no haya un pago ni una extensión manual (sigue en los 14 días gratis).
  en_prueba:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  creado_en:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "suscripcion",
  indexes: [{ fields: ["fecha_vencimiento"] }],
});
