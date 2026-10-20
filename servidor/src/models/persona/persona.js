import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Datos personales de cualquier individuo del sistema.
 * Una persona puede tener un usuario asociado (personal o cliente).
 * La búsqueda por documento es la operación más frecuente (kiosco de ingresos).
 */
export const Persona = defineModel("Persona", {
  tipo_documento_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "tipo_documento", key: "id" },
  },
  sexo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "sexo", key: "id" },
  },
  tipo_persona_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "tipo_persona", key: "id" },
  },

  nombre:             { type: DataTypes.STRING(100), allowNull: false },
  apellido:           { type: DataTypes.STRING(100), allowNull: false },
  fecha_nacimiento:   { type: DataTypes.DATEONLY, allowNull: true },
  documento:          { type: DataTypes.STRING(20), allowNull: false, unique: true },
  email:              { type: DataTypes.STRING(150), allowNull: true, unique: true },
  celular:            { type: DataTypes.STRING(30), allowNull: true },
  celular_emergencia: { type: DataTypes.STRING(30), allowNull: true },

  creado_en:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  // Soft delete: NULL = activo. Fecha = dado de baja definitiva del sistema.
  // Todas las queries deben filtrar: WHERE eliminado_en IS NULL
  eliminado_en:  { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "persona",
  indexes: [
    { fields: ["documento"] },
    { fields: ["email"] },
    { fields: ["apellido", "nombre"] },
  ],
});
