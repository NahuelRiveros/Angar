import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Partido entre dos parejas, de zona (fase "zona") o de llave (fase "llave", con su ronda).
 * En la llave las parejas empiezan vacías y las completa el ganador del partido anterior.
 * sets: [[games pareja 1, games pareja 2], ...]; null mientras no se jugó. El formato se copia
 * al crearlo: cambiar el de la categoría no reinterpreta resultados ya cargados.
 */
export const Partido = defineModel("Partido", {
  categoria_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "torneo_categoria", key: "id" } },
  zona_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "zona", key: "id" } },
  fase: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "zona" },
  // Llave: 1 = primera ronda; la última es la final. Null en los de zona.
  ronda: { type: DataTypes.SMALLINT, allowNull: true },
  // Zona: orden de juego. Llave: posición dentro de la ronda (define a qué partido avanza el ganador).
  orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  pareja1_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "inscripcion", key: "id" } },
  pareja2_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "inscripcion", key: "id" } },
  formato: { type: DataTypes.STRING(20), allowNull: false },
  sets: { type: DataTypes.JSONB, allowNull: true },
  ganador_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "inscripcion", key: "id" } },
  // Programación opcional: día (YYYY-MM-DD), hora (HH:MM, hora argentina) y cancha en texto libre.
  fecha: { type: DataTypes.DATEONLY, allowNull: true },
  hora: { type: DataTypes.STRING(5), allowNull: true },
  cancha: { type: DataTypes.STRING(40), allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "partido",
  indexes: [{ fields: ["categoria_id", "fase"] }, { fields: ["zona_id", "orden"] }, { fields: ["categoria_id", "fase", "ronda", "orden"] }],
});
