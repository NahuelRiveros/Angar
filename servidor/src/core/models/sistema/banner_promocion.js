import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Banners de la tienda (SIS-32): `carrusel` = imagen grande del home; `cinta` = texto en la franja
 * superior del sitio. Se muestran solos entre vigente_desde y vigente_hasta (días de Argentina,
 * ambos incluidos; null = sin límite). Reglas y validación en services/sistema/banner_reglas.js.
 */
export const BannerPromocion = defineModel("BannerPromocion", {
  tipo:   { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [["carrusel", "cinta"]] } },
  // Texto de la cinta, o descripción de la imagen del carrusel (lectores de pantalla).
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  imagen_url:         { type: DataTypes.STRING(500), allowNull: true },
  // Opcional (SIS-50): versión vertical para el celular.
  imagen_celular_url: { type: DataTypes.STRING(500), allowNull: true },
  enlace: { type: DataTypes.STRING(500), allowNull: true },
  orden:  { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  vigente_desde: { type: DataTypes.DATEONLY, allowNull: true },
  vigente_hasta: { type: DataTypes.DATEONLY, allowNull: true },

  creado_en:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "banner_promocion",
  indexes: [
    { fields: ["tipo", "activo"] },
  ],
});
