import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Categoría de un torneo: de la lista (nivel 1-8 + rama) o con nombre propio
 * ("Suma 13", "+45"). El nombre que se muestra lo arma nombreCategoria() de torneo_config.js.
 */
export const TorneoCategoria = defineModel("TorneoCategoria", {
  torneo_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "torneo", key: "id" },
    onDelete: "CASCADE",
  },
  nivel: { type: DataTypes.SMALLINT, allowNull: true },
  // caballeros | damas | mixto
  rama: { type: DataTypes.STRING(20), allowNull: true },
  nombre_personalizado: { type: DataTypes.STRING(60), allowNull: true },
  // Tope de parejas inscriptas; vacío = sin tope.
  cupo_parejas: { type: DataTypes.SMALLINT, allowNull: true },
  orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  // Formato de zonas y llave (valores posibles en ZONAS y FORMATOS_PARTIDO de torneo_config.js).
  parejas_por_zona:    { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 3 },
  clasifican_por_zona: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 2 },
  formato_zona:        { type: DataTypes.STRING(20), allowNull: false, defaultValue: "un_set_6" },
  formato_llave:       { type: DataTypes.STRING(20), allowNull: false, defaultValue: "mejor_de_3_stb" },
  creado_en:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "torneo_categoria",
  indexes: [{ fields: ["torneo_id", "orden"] }],
});
