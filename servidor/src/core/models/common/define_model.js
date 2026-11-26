import { DataTypes } from "sequelize";
import { sequelize, DB_SCHEMA } from "../../database/sequelize.js";

const PK_AUTOINCREMENTAL = { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true };

/**
 * sequelize.define() con los defaults que se repiten en las ~40 tablas de
 * este proyecto: mismo schema, timestamps manuales (cada modelo declara sus
 * propias columnas creado_en/actualizado_en) e "id" autoincremental salvo
 * que el modelo traiga su propia clave primaria (ej. stk_existencia, cuya
 * clave es variante_id).
 */
export function defineModel(nombre, attributes, opciones = {}) {
  const tienePropia = Object.values(attributes).some((a) => a.primaryKey);
  const attrs = attributes.id || tienePropia ? attributes : { id: PK_AUTOINCREMENTAL, ...attributes };

  return sequelize.define(nombre, attrs, {
    schema: DB_SCHEMA,
    timestamps: false,
    ...opciones,
  });
}
