import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Línea de una nota de pedido — denormaliza nombre/variedad/precio para que
 * el pedido sobreviva intacto aunque el producto cambie o se borre después
 * (mismo criterio que precio_unidad en CarritoItem, llevado más lejos porque
 * esto es un registro permanente, no un carrito editable).
 */
export const NotaPedidoItem = defineModel("NotaPedidoItem", {
  nota_pedido_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "nota_pedido", key: "id" },
  },
  // nullable — el producto/variedad puede haberse borrado después
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "producto_distribuidora", key: "id" },
  },
  variedad_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "variedad_distribuidora", key: "id" },
  },

  nombre_producto: { type: DataTypes.STRING(150), allowNull: false },
  variedad_nombre: { type: DataTypes.STRING(100), allowNull: true },

  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  cantidad:        { type: DataTypes.INTEGER, allowNull: false },
  subtotal:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  // Alícuota de IVA al enviar el pedido: precio_unitario es FINAL (con IVA) y una
  // factura electrónica tiene que discriminarlo por alícuota. null en pedidos viejos.
  iva_porcentaje:  { type: DataTypes.DECIMAL(5, 2), allowNull: true },
}, {
  tableName: "nota_pedido_item",
  indexes: [
    { fields: ["nota_pedido_id"] },
  ],
});
