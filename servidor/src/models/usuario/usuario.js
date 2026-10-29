import { DataTypes } from "sequelize";
import { defineModel } from "../common/define_model.js";
import { generarCodigoJugador } from "../../services/common/codigo_jugador.js";

/**
 * Credenciales de acceso al sistema (admins y staff).
 * Relación 1:1 con persona — persona_id es UNIQUE.
 * No toda persona tiene usuario; solo quienes operan el sistema.
 */
export const Usuario = defineModel("Usuario", {
  persona_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: "persona", key: "id" },
  },

  // Alternativa al email para iniciar sesión. Opcional; se guarda en minúsculas
  // (reglas en services/common/nombre_usuario.js).
  nombre_usuario: { type: DataTypes.STRING(30), allowNull: true, unique: true },

  // Código público del jugador (MP-7K3QX): para invitarlo como compañero y ver su perfil.
  // Lo pone el hook de abajo al crear la cuenta; las cuentas viejas lo reciben al arrancar el servidor.
  codigo_jugador: { type: DataTypes.STRING(10), allowNull: true, unique: true },

  // "sub" de Google: fijo aunque la persona cambie el email de su cuenta de Google.
  google_id:     { type: DataTypes.STRING(255), allowNull: true, unique: true },
  // Avisos por mail al jugador (confirmaciones, rechazos, horarios). La campanita llega igual.
  recibir_mails: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

  // Hash bcrypt — nunca almacenar texto plano
  contrasena:    { type: DataTypes.STRING(255), allowNull: false },
  activo:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ultimo_login:  { type: DataTypes.DATE, allowNull: true },

  creado_en:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  // activo=false: suspendido temporalmente (puede reactivarse)
  // eliminado_en no null: baja definitiva — no puede iniciar sesión ni reactivarse
  eliminado_en:  { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "usuario",
  indexes: [
    { fields: ["persona_id"] },
  ],
  // Cubre todas las formas de crear una cuenta (registro, Google, equipo, super admin).
  hooks: { beforeCreate: (usuario) => { usuario.codigo_jugador ??= generarCodigoJugador(); } },
});
