import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";
import { fiscalConfig } from "../../../../../core/fiscal_config.js";

/**
 * Datos para facturarle a una persona (USU-40). Uno por persona (1:1) y opcional: el registro no
 * los pide; se completan cuando el sistema los necesita (ej. el primer pedido con factura).
 * Valores y validaciones en core/fiscal_config.js, compartido con la web.
 */
export const PersonaFiscal = defineModel("PersonaFiscal", {
  persona_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: "persona", key: "id" },
    onDelete: "CASCADE",
  },
  condicion_iva: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [fiscalConfig.condicionesIva.map((c) => c.value)] },
  },
  // CUIT "20-12345678-6" o, solo para consumidor final, DNI en números (normalizarDocumento).
  cuit:             { type: DataTypes.STRING(13), allowNull: false },
  // Vacía = se factura a nombre y apellido de la persona.
  razon_social:     { type: DataTypes.STRING(150), allowNull: true },
  domicilio_fiscal: { type: DataTypes.STRING(200), allowNull: true },

  creado_en:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "persona_fiscal",
});
