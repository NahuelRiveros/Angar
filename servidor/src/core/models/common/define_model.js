import { DataTypes } from "sequelize";
import { sequelize, DB_SCHEMA } from "../../database/sequelize.js";

const PK_AUTOINCREMENTAL = { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true };

/**
 * sequelize.define() con los defaults que se repiten en las ~40 tablas de
 * este proyecto: mismo schema, timestamps manuales (cada modelo declara sus
 * propias columnas creado_en/actualizado_en) e "id" autoincremental salvo
 * que el modelo ya traiga su propia primary key (todas la tienen hoy, pero
 * queda como escape hatch por si alguna vez hace falta una distinta).
 */
export function defineModel(nombre, attributes, opciones = {}) {
  const attrs = attributes.id ? attributes : { id: PK_AUTOINCREMENTAL, ...attributes };

  return sequelize.define(nombre, attrs, {
    schema: DB_SCHEMA,
    timestamps: false,
    ...opciones,
  });
}
