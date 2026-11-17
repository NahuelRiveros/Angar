import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Datos personales de cualquier individuo del sistema. Puede tener un usuario (cómo entra al
 * sistema) y datos fiscales (persona_fiscal, para facturarle). El documento es opcional: un
 * cliente que se registra en la tienda no lo carga; el personal sí (lo pide "Personal").
 */
export const Persona = defineModel("Persona", {
  tipo_documento_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
  // Único entre los cargados; vacío (NULL) puede haber muchos.
  documento:          { type: DataTypes.STRING(20), allowNull: true },
  email:              { type: DataTypes.STRING(150), allowNull: true },
  celular:            { type: DataTypes.STRING(30), allowNull: true },
  celular_emergencia: { type: DataTypes.STRING(30), allowNull: true },

  creado_en:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  // Soft delete: NULL = activo. Fecha = dado de baja definitiva del sistema.
  // Todas las queries deben filtrar: WHERE eliminado_en IS NULL
  eliminado_en:  { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "persona",
  // SIS-51: los únicos de texto van como índice con nombre fijo: con `unique: true` en la columna,
  // cada sync({ alter: true }) agregaba otra restricción igual.
  indexes: [
    { name: "persona_documento_key", unique: true, fields: ["documento"] },
    { name: "persona_email_key", unique: true, fields: ["email"] },
    { fields: ["documento"] },
    { fields: ["email"] },
    { fields: ["apellido", "nombre"] },
  ],
});
