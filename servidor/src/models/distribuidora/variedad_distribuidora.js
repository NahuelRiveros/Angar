import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Una fila = una variedad comprable de un producto (ej. "Original 118g",
 * "Familiar 300g"), CON precio y stock propios — a diferencia de Stock
 * (indumentaria), donde el precio vive en el producto padre y la variante
 * solo aporta cantidad. Acá cada variedad puede costar distinto.
 * `nombre` null = producto sin variedades reales, esta fila representa "el
 * producto" (igual idea que talle_id/color_id null en Stock).
 * Es lo que el frontend llama `variedad_id` (carrito_distribuidora/,
 * nota_pedido/): el id de esta tabla.
 */
export const VariedadDistribuidora = defineModel("VariedadDistribuidora", {
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "producto_distribuidora", key: "id" },
  },

  nombre: { type: DataTypes.STRING(100), allowNull: true },

  // FINAL, con IVA incluido (lo que paga el cliente); `iva_porcentaje` lo desglosa.
  precio:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  // null = sin precio anterior / sin oferta
  precio_anterior: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  // Alícuota de IVA de esta variedad (21 general, 10.5 canasta básica, 0 exento, etc).
  iva_porcentaje:  { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 21 },

  // false (default) = "sin stock controlado en este sistema": la cantidad
  // real vive en el sistema del cliente (no conectado a este), no se
  // bloquea ni se avisa nada acá — el negocio confirma disponibilidad real
  // al procesar la nota de pedido. true = sí se controla acá (ej. un cupo
  // reservado para el canal online) y `cantidad` pasa a ser real.
  controla_stock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

  // Código interno del artículo (en el sistema del cliente, ej. "000519"), opcional
  cod_ref: { type: DataTypes.STRING(60), allowNull: true },
  // EAN/UPC impreso en el envase; se busca igual que el código interno.
  codigo_barras: { type: DataTypes.STRING(30), allowNull: true },

  // Ficha "Stock" del sistema del cliente: en qué se cuenta/vende (UM primaria)
  // y cuántas de esas trae el bulto (1 CAJA = 20 PAQUETE). Valores en unidades_config.js.
  unidad_medida:      { type: DataTypes.STRING(20), allowNull: false, defaultValue: "UNIDAD" },
  unidad_bulto:       { type: DataTypes.STRING(20), allowNull: false, defaultValue: "CAJA" },
  unidades_por_bulto: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  // Aviso de reposición: con stock controlado, cantidad <= stock_minimo = "stock bajo".
  stock_minimo:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  // Se completa sola cada vez que cambia el precio (edición, ajuste masivo o importación).
  fecha_cambio_precio: { type: DataTypes.DATE, allowNull: true },

  fecha_alta: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_baja: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: "variedad_distribuidora",
  indexes: [
    { fields: ["producto_id"] },
    { fields: ["cod_ref"] },
    { fields: ["codigo_barras"] },
  ],
});
