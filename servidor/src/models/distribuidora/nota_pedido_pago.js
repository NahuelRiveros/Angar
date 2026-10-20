import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Ledger de pagos de una nota de pedido — tabla de auditoría, insert-only.
 * Soporta pagos parciales: un pedido puede tener varias filas hasta cubrir
 * el total. `estado_pago`/`monto_pagado` en NotaPedido se recalculan a
 * partir de la suma de pagos activos (ver nota_pedido_service.js) cada vez
 * que se crea o anula uno, siempre dentro de la misma transacción.
 *
 * Un pago erróneo se anula (`anulado_por`/`anulado_en`), nunca se borra —
 * un movimiento de dinero no
 * desaparece, queda visible con quién lo anuló y cuándo.
 */
export const NotaPedidoPago = defineModel("NotaPedidoPago", {
  nota_pedido_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "nota_pedido", key: "id" },
  },

  metodo: { type: DataTypes.STRING(30), allowNull: true },
  anulacion_motivo: { type: DataTypes.STRING(500), allowNull: true },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  nota:  { type: DataTypes.STRING(255), allowNull: true },

  registrado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "usuario", key: "id" },
  },
  registrado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },

  anulado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "usuario", key: "id" },
  },
  anulado_en: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "nota_pedido_pago",
  indexes: [
    { fields: ["nota_pedido_id"] },
  ],
});
