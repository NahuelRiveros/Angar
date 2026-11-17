import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Secciones funcionales del sistema (usuarios, stock, home, etc.).
 * Agrupa permisos y sirve para renderizar el panel de gestión de roles en la UI.
 * El campo `orden` define el orden de aparición en ese panel.
 */
export const Modulo = defineModel("Modulo", {
  codigo:      { type: DataTypes.STRING(50), allowNull: false },
  descripcion: { type: DataTypes.STRING(150), allowNull: false },
  // Orden de aparición en el panel de gestión de roles
  orden:       { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "modulo",
  // SIS-51: los únicos de texto van como índice con nombre fijo: con `unique: true` en la columna,
  // cada sync({ alter: true }) agregaba otra restricción igual.
  indexes: [
    { name: "modulo_codigo_key", unique: true, fields: ["codigo"] },
    { fields: ["orden"] },
  ],
});
