import { DataTypes } from "sequelize";
import { defineModel } from "../../models/common/define_model.js";

// Las tablas las crean las migraciones (carpeta migraciones/): un cambio acá necesita la suya.
// Spec: docs/specs/core/stock.md.
export const StkExistencia = defineModel("StkExistencia", {
  variante_id:    { type: DataTypes.INTEGER, primaryKey: true },
  cantidad:       { type: DataTypes.INTEGER, allowNull: false },
  minimo:         { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "stk_existencia" });

/** MST-02: no se edita ni se borra (lo impide la base). */
export const StkMovimiento = defineModel("StkMovimiento", {
  variante_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo:        { type: DataTypes.STRING(12), allowNull: false },
  cantidad:    { type: DataTypes.INTEGER, allowNull: false },
  saldo:       { type: DataTypes.INTEGER, allowNull: false },
  motivo:      { type: DataTypes.STRING(200), allowNull: true },
  pedido_id:   { type: DataTypes.INTEGER, allowNull: true },
  usuario_id:  { type: DataTypes.INTEGER, allowNull: true },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "stk_movimiento" });
