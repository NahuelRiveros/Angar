import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Comprobante de transferencia que adjunta el comprador. El archivo vive en
 * Cloudinary como privado (tiene datos bancarios): solo se ve con un enlace
 * firmado y temporal que entrega el servidor al dueño del pedido o al equipo.
 *
 * Revisarlo no mueve dinero por sí solo: aceptarlo registra un NotaPedidoPago
 * (pago_id) en la misma transacción; rechazarlo guarda el motivo para el cliente.
 */
export const NotaPedidoComprobante = defineModel("NotaPedidoComprobante", {
  nota_pedido_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "nota_pedido", key: "id" },
  },

  // Cloudinary: id privado, tipo de recurso ("image" o "raw" para PDF) y extensión.
  public_id:      { type: DataTypes.STRING(255), allowNull: false },
  resource_type:  { type: DataTypes.STRING(10), allowNull: false },
  formato:        { type: DataTypes.STRING(10), allowNull: false },
  nombre_archivo: { type: DataTypes.STRING(150), allowNull: true },
  tamano:         { type: DataTypes.INTEGER, allowNull: false },

  // "pendiente" | "aceptado" | "rechazado"
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pendiente" },

  subido_por: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "usuario", key: "id" },
  },
  subido_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },

  revisado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "usuario", key: "id" },
  },
  revisado_en:    { type: DataTypes.DATE, allowNull: true },
  motivo_rechazo: { type: DataTypes.STRING(500), allowNull: true },
  pago_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "nota_pedido_pago", key: "id" },
  },
}, {
  tableName: "nota_pedido_comprobante",
  indexes: [
    { fields: ["nota_pedido_id"] },
    { fields: ["estado"] },
  ],
});
