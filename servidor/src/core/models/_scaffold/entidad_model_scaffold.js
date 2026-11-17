/**
 * PLANTILLA — modelo Sequelize con baja lógica (patrón "catálogo simple" del
 * proyecto: nombre + orden + fecha_alta/fecha_baja). Ver models/productos/talle.js
 * o models/productos/color.js para un ejemplo real ya funcionando.
 *
 * No se importa desde ningún lado (carpeta `_scaffold/`, no forma parte del
 * árbol real) — es un punto de partida para copiar.
 *
 * Cómo usarla:
 *   1. Copiá este archivo a `models/<dominio>/mi_entidad.js` y renombrá
 *      "Entidad" → tu entidad real (ej: "Talle", tabla "talle").
 *   2. Ajustá las columnas — sacá/agregá lo que no aplique.
 *   3. Registrala en `models/index.js`: import, `aplicarRelaciones([...])`
 *      si tiene FKs, y el export final.
 *   4. Agregala a `database/bootstrap.js` en el array `modelos_en_orden`,
 *      DESPUÉS de cualquier modelo que referencie (mirá los comentarios de
 *      "Nivel" ahí para ubicarla bien).
 */

import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

export const Entidad = defineModel("Entidad", {
  nombre: { type: DataTypes.STRING(100), allowNull: false },

  // TODO: sacar si la entidad no necesita orden manual en listados/selectores
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

  // TODO: FK de ejemplo — copiar un bloque así por cada referencia a otra
  // tabla. `references` es documentación para Postgres; la asociación
  // Sequelize (belongsTo/hasMany) se declara aparte en models/index.js.
  // otra_entidad_id: {
  //   type: DataTypes.INTEGER,
  //   allowNull: false, // o true si es opcional
  //   references: { model: "otra_entidad", key: "id" },
  // },

  fecha_alta: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_baja: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: "entidad", // TODO: nombre real de tabla
  indexes: [
    // TODO: descomentar si nombre debe ser único entre los activos
    // { unique: true, fields: ["nombre"], where: { fecha_baja: null }, name: "entidad_nombre_activo_unique" },
  ],
});
