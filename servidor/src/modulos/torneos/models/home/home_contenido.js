import { DataTypes } from "sequelize";
import { defineModel } from "../../../../core/models/common/define_model.js";

/**
 * Bloque de contenido (imagen o video) del home, configurable sin tocar código.
 * Cada fila = un archivo alojado en Cloudinary. `orden` define cómo se muestra
 * dentro de su área; una "galería" es simplemente varias filas de la misma área.
 * cloudinary_public_id se guarda para poder borrar/reemplazar el archivo en
 * Cloudinary cuando se elimina o actualiza el registro.
 */
export const HomeContenido = defineModel("HomeContenido", {
  area_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "home_area", key: "id" },
  },

  tipo_media: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [["imagen", "video"]] } },
  titulo:     { type: DataTypes.STRING(150), allowNull: true },
  descripcion: { type: DataTypes.TEXT, allowNull: true },

  cloudinary_url:       { type: DataTypes.STRING(500), allowNull: false },
  cloudinary_public_id: { type: DataTypes.STRING(255), allowNull: false },

  orden:  { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

  creado_en:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "home_contenido",
  indexes: [
    { fields: ["area_id"] },
    { fields: ["activo"] },
    { fields: ["orden"] },
  ],
});
