import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";

/**
 * Pareja anotada en una categoría. Online la anota un jugador con cuenta (usuario_id) y queda
 * pendiente; la que carga el organizador entra confirmada. Los nombres van en texto porque el
 * compañero puede no tener cuenta.
 */
export const Inscripcion = defineModel("Inscripcion", {
  torneo_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "torneo", key: "id" } },
  categoria_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "torneo_categoria", key: "id" } },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "usuario", key: "id" } },
  // Compañero registrado invitado por su código. La inscripción espera ("esperando") hasta que acepta.
  usuario2_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "usuario", key: "id" } },
  jugador1_nombre: { type: DataTypes.STRING(80), allowNull: false },
  jugador2_nombre: { type: DataTypes.STRING(80), allowNull: false },
  // Para que el organizador pueda escribirle a la pareja. No se muestra en la vista pública.
  telefono: { type: DataTypes.STRING(40), allowNull: true },
  nota: { type: DataTypes.STRING(300), allowNull: true },
  // online | organizador
  origen: { type: DataTypes.STRING(20), allowNull: false },
  // esperando | pendiente | confirmada | rechazada | cancelada (ver ESTADOS_INSCRIPCION)
  estado: { type: DataTypes.STRING(20), allowNull: false },
  motivo_rechazo: { type: DataTypes.STRING(300), allowNull: true },
  cabeza_de_serie: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // Número al azar que recibe al entrar en una zona: último desempate de la tabla y de los mejores
  // terceros. Se guarda para que la tabla dé siempre lo mismo; nunca se muestra.
  sorteo: { type: DataTypes.INTEGER, allowNull: true },
  zona_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "zona", key: "id" } },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "inscripcion",
  indexes: [
    { fields: ["categoria_id", "estado"] },
    { fields: ["usuario_id"] },
    { fields: ["usuario2_id"] },
    // Un jugador no puede tener dos inscripciones vivas en la misma categoría (lo frena la base),
    // ni como el que anota ni como el compañero invitado.
    { name: "inscripcion_usuario_categoria_viva", unique: true, fields: ["usuario_id", "categoria_id"], where: { estado: ["esperando", "pendiente", "confirmada"] } },
    { name: "inscripcion_usuario2_categoria_viva", unique: true, fields: ["usuario2_id", "categoria_id"], where: { estado: ["esperando", "pendiente", "confirmada"] } },
  ],
});
