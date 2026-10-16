import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * "Familia" de producto (ej. "Galletitas Oreo") — SIN precio acá, a
 * diferencia de ProductoTienda (indumentaria): acá el precio vive en cada
 * VariedadDistribuidora, porque distintas variedades del mismo producto
 * pueden costar distinto (ej. paquete chico vs. familiar). Todo producto
 * necesita ≥1 fila de VariedadDistribuidora para ser comprable.
 */
export const ProductoDistribuidora = defineModel("ProductoDistribuidora", {
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "categoria_distribuidora", key: "id" },
  },

  nombre:      { type: DataTypes.STRING(150), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  // La marca vive en marca_distribuidora (marca_id). `marca` es una copia del
  // nombre que mantienen los servicios de marcas: la leen la tienda, la búsqueda
  // y la lista de carga sin tener que unir tablas.
  marca_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "marca_distribuidora", key: "id" },
  },
  marca: { type: DataTypes.STRING(80), allowNull: true },

  imagen_url: { type: DataTypes.STRING(500), allowNull: true },

  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

  fecha_alta: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_baja: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: "producto_distribuidora",
  indexes: [
    { fields: ["categoria_id"] },
    { fields: ["activo"] },
    { fields: ["marca_id"] },
    // No puede haber dos productos con el mismo nombre EN LA MISMA categoría
    // (categoria_id nunca es null acá, así que un solo índice alcanza — a
    // diferencia de CategoriaDistribuidora, que sí necesita manejar la raíz).
    { unique: true, fields: ["nombre", "categoria_id"], where: { fecha_baja: null }, name: "producto_distribuidora_nombre_categoria_unique" },
  ],
});
