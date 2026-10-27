import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Historial de lo que movió el vencimiento de un plan: pagos de MercadoPago
 * (aprobados o no, para poder rastrearlos), extensiones manuales y ajustes de fecha.
 * mp_payment_id es único: es lo que vuelve idempotente al webhook.
 */
export const PagoSuscripcion = defineModel("PagoSuscripcion", {
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "usuario", key: "id" },
  },
  // mercadopago | manual | ajuste
  origen:        { type: DataTypes.STRING(20), allowNull: false },
  mp_payment_id: { type: DataTypes.STRING(60), allowNull: true, unique: true },
  // aprobado | pendiente | rechazado | monto_insuficiente | ... (estado de MercadoPago)
  estado:        { type: DataTypes.STRING(30), allowNull: false },
  monto:         { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  // Días sumados; 0 si el pago todavía no se aplicó (pendiente, rechazado).
  dias:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  vencimiento_anterior: { type: DataTypes.DATEONLY, allowNull: true },
  vencimiento_nuevo:    { type: DataTypes.DATEONLY, allowNull: true },
  registrado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "usuario", key: "id" },
  },
  nota:      { type: DataTypes.STRING(300), allowNull: true },
  detalle:   { type: DataTypes.JSONB, allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "pago_suscripcion",
  indexes: [{ fields: ["usuario_id", "creado_en"] }],
});
