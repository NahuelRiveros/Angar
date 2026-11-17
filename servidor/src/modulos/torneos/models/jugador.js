import { DataTypes } from "sequelize";
import { defineModel } from "../../../core/models/common/define_model.js";

/**
 * Lo que una cuenta tiene de jugador (MIG-04): su código público (MP-7K3QX) para que lo inviten
 * como compañero y para su perfil, y si quiere avisos por mail. Uno por usuario; lo crea el hook
 * de models/index.js al crear la cuenta y el arranque completa las que no lo tienen.
 */
export const Jugador = defineModel("Jugador", {
  usuario_id: { type: DataTypes.INTEGER, allowNull: false, unique: "jugador_usuario_id_key", references: { model: "usuario", key: "id" }, onDelete: "CASCADE" },
  codigo: { type: DataTypes.STRING(10), allowNull: false, unique: "jugador_codigo_key" },
  recibir_mails: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: "jugador",
});
