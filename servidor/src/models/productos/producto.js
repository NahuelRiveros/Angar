import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

// Nombre "ProductoTienda" / tabla "producto_tienda" a propósito — ya existe
// un modelo "Producto" (tabla "producto") para el kiosco/stock (módulo stock)
// (ver models/kiosco/producto.js), dominio distinto, no reemplaza a este.
export const ProductoTienda = defineModel("ProductoTienda", {
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "categoria", key: "id" },
  },
  // opcional — un producto puede no tener marca asignada
  marca_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "marca", key: "id" },
  },

  nombre:      { type: DataTypes.STRING(150), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },

  precio:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  // null = sin precio anterior / sin oferta
  precio_anterior: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  // etiqueta de descuento visible: "-20%", "2x1", etc.
  descuento:       { type: DataTypes.STRING(20), allowNull: true },

  // null | "nuevo" | "vuelve" | "agotado"
  badge: { type: DataTypes.STRING(10), allowNull: true },

  // Código de referencia interno (SKU, código de proveedor, etc.)
  cod_ref: { type: DataTypes.STRING(60), allowNull: true },

  // Array JSON: [{ src: string, alt?: string }]
  imagenes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

  fecha_alta: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_baja: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: "producto_tienda",
  indexes: [
    { fields: ["categoria_id"] },
    { fields: ["marca_id"] },
    { fields: ["activo"] },
  ],
});
