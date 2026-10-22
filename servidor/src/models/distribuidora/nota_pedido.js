import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Snapshot de productos, precios y entrega al enviar la nota.
 * Estado comercial y cobro son independientes según order_config.js.
 * Los cobros se conservan en NotaPedidoPago; monto_pagado/estado_pago
 * se recalculan en una transacción. El historial de estados guarda operador,
 * fecha y motivo. Cambiar el perfil no modifica notas anteriores.
 */
export const NotaPedido = defineModel("NotaPedido", {
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "usuario", key: "id" },
  },

  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pendiente" },
  // true mientras sus cantidades estén restadas del stock (al confirmar). Los
  // pedidos anteriores a este cambio quedan en false: cancelarlos no devuelve
  // stock que nunca se descontó.
  stock_descontado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

  // "pendiente" | "parcial" | "pagado" — derivado de la suma de pagos
  // activos en NotaPedidoPago, nunca se escribe directo salvo al crear.
  estado_pago:  { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pendiente" },
  monto_pagado: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

  notas:  { type: DataTypes.TEXT, allowNull: true },

  cuit:          { type: DataTypes.STRING(20), allowNull: true },
  razon_social:  { type: DataTypes.STRING(150), allowNull: true },
  condicion_iva: { type: DataTypes.STRING(30), allowNull: true },
  direccion:     { type: DataTypes.STRING(200), allowNull: true },
  provincia:     { type: DataTypes.STRING(50), allowNull: true },
  departamento:  { type: DataTypes.STRING(100), allowNull: true },
  localidad:     { type: DataTypes.STRING(100), allowNull: true },
  codigo_postal: { type: DataTypes.STRING(15), allowNull: true },

  // Lista de precios con que se cobró (copia: el pedido no cambia si la lista
  // se edita o se borra). null = lista General.
  lista_precio_id:     { type: DataTypes.INTEGER, allowNull: true },
  lista_precio_nombre: { type: DataTypes.STRING(80), allowNull: true },

  // snapshot de la suma de subtotales de sus items
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

  fecha_alta: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_mod:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "nota_pedido",
  indexes: [
    { fields: ["usuario_id"] },
    { fields: ["estado"] },
  ],
});
