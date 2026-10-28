import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Torneo de un organizador. Estados y qué se edita en cada uno: torneo_config.js (raíz).
 * Las fechas son días (DATEONLY): el torneo "es el sábado", sin hora ni zona.
 */
export const Torneo = defineModel("Torneo", {
  organizador_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "usuario", key: "id" },
  },
  nombre:       { type: DataTypes.STRING(120), allowNull: false },
  descripcion:  { type: DataTypes.STRING(2000), allowNull: true },
  sede:         { type: DataTypes.STRING(120), allowNull: true },
  direccion:    { type: DataTypes.STRING(200), allowNull: true },
  localidad:    { type: DataTypes.STRING(120), allowNull: true },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true },
  fecha_fin:    { type: DataTypes.DATEONLY, allowNull: true },
  // Cómo comunicarse con la organización (WhatsApp, teléfono o email), en texto.
  contacto:     { type: DataTypes.STRING(120), allowNull: true },
  reglamento:   { type: DataTypes.TEXT, allowNull: true },
  // Cobro de la inscripción: monto general por pareja (cada categoría lo copia y puede cambiarlo)
  // y la cuenta donde transferir. Se muestran en la página pública del torneo.
  monto_inscripcion: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  cobro_titular: { type: DataTypes.STRING(80), allowNull: true },
  cobro_banco:   { type: DataTypes.STRING(60), allowNull: true },
  cobro_cbu:     { type: DataTypes.STRING(22), allowNull: true },
  cobro_alias:   { type: DataTypes.STRING(20), allowNull: true },
  estado:       { type: DataTypes.STRING(20), allowNull: false, defaultValue: "borrador" },
  creado_en:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "torneo",
  indexes: [{ fields: ["organizador_id", "creado_en"] }, { fields: ["estado"] }],
});
