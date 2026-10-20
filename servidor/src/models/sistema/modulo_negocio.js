import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Módulos de negocio que se habilitan por separado (ej. distribuidora). Distinto
 * de `Modulo` (usuarios/modulo.js), que es el catálogo de secciones del panel
 * de permisos — acá `habilitado` es un gate real de licencia por instalación,
 * consultado por requireModuloHabilitado() incluso para admin.
 */
export const ModuloNegocio = defineModel("ModuloNegocio", {
  codigo:      { type: DataTypes.STRING(50), allowNull: false, unique: true },
  descripcion: { type: DataTypes.STRING(150), allowNull: false },
  habilitado:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  creado_en:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "modulo_negocio",
});
