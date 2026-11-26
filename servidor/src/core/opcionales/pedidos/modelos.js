import { DataTypes } from "sequelize";
import { defineModel } from "../../models/common/define_model.js";
import { aplicarRelaciones } from "../../models/common/relaciones.js";

// Las tablas las crean las migraciones (carpeta migraciones/): un cambio acá necesita la suya.
// Spec: docs/specs/core/pedidos.md.
export const PedPedido = defineModel("PedPedido", {
  clave:          { type: DataTypes.STRING(32), allowNull: false },
  clave_envio:    { type: DataTypes.UUID, allowNull: false },
  usuario_id:     { type: DataTypes.INTEGER, allowNull: true },
  estado:         { type: DataTypes.STRING(12), allowNull: false, defaultValue: "recibido" },
  nombre:         { type: DataTypes.STRING(80), allowNull: false },
  celular:        { type: DataTypes.STRING(20), allowNull: false },
  entrega:        { type: DataTypes.STRING(10), allowNull: false },
  direccion:      { type: DataTypes.STRING(150), allowNull: true },
  localidad:      { type: DataTypes.STRING(80), allowNull: true },
  nota:           { type: DataTypes.STRING(500), allowNull: true },
  total:          { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  version:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  creado_en:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "ped_pedido" });

/** MPE-05: copia de nombre, opción y precio del momento del pedido. */
export const PedItem = defineModel("PedItem", {
  pedido_id:       { type: DataTypes.INTEGER, allowNull: false },
  variante_id:     { type: DataTypes.INTEGER, allowNull: false },
  producto_nombre: { type: DataTypes.STRING(120), allowNull: false },
  variante_nombre: { type: DataTypes.STRING(60), allowNull: true },
  codigo:          { type: DataTypes.STRING(40), allowNull: true },
  precio:          { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  cantidad:        { type: DataTypes.INTEGER, allowNull: false },
  subtotal:        { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  orden:           { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
}, { tableName: "ped_item" });

/** MPE-07: `de` vacío es el alta del pedido. */
export const PedHistorial = defineModel("PedHistorial", {
  pedido_id:  { type: DataTypes.INTEGER, allowNull: false },
  de:         { type: DataTypes.STRING(12), allowNull: true },
  a:          { type: DataTypes.STRING(12), allowNull: false },
  motivo:     { type: DataTypes.STRING(300), allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  creado_en:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "ped_historial" });

aplicarRelaciones([
  { tipo: "hasMany", from: PedPedido, to: PedItem, foreignKey: "pedido_id", as: "items" },
  { tipo: "hasMany", from: PedPedido, to: PedHistorial, foreignKey: "pedido_id", as: "historial" },
]);
