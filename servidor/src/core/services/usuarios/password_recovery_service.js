import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Persona, Usuario } from "../../models/index.js";
import { sequelize } from "../../database/sequelize.js";
import { env } from "../../configuracion_servidor/env.js";
import { clientConfig } from "../../../../../proyecto/client_config.js";
import { createResetToken, verifyResetToken } from "../common/auth_tokens.js";
import { enviarEmail, mailConfigured } from "../common/mail_service.js";
const invalid = () => Object.assign(new Error("El enlace no es válido o venció. Solicitá uno nuevo."), { status: 400 });
export async function requestPasswordReset(email) {
  if (!mailConfigured()) throw Object.assign(new Error("La recuperación por email no está disponible. Contactá a la empresa."), { status: 503 });
  const persona = await Persona.findOne({ where: { email: String(email ?? "").trim().toLowerCase() } });
  const user = persona && await Usuario.findOne({ where: { persona_id: persona.id, activo: true, eliminado_en: null } });
  if (user) {
    const token = createResetToken(user, env.JWT_SECRET, clientConfig.auth.resetMinutes);
    const url = new URL("/reset-password", env.VERCEL_FRONTEND_URL);
    // Fragmento: no se transmite en logs HTTP ni Referer.
    url.hash = new URLSearchParams({ token }).toString();
    await enviarEmail({ to: persona.email, subject: "Recuperá el acceso a tu cuenta",
      text: `Abrí este enlace para elegir una nueva contraseña: ${url.href}\nVence en ${clientConfig.auth.resetMinutes} minutos. Si no lo solicitaste, ignorá este mensaje.` });
  }
  return { ok: true, mensaje: "Si existe una cuenta con ese email, recibirás un enlace para recuperar el acceso." };
}
export async function resetPassword(token, password) {
  if (typeof token !== "string" || typeof password !== "string" || password.length < clientConfig.auth.passwordMinLength || Buffer.byteLength(password, "utf8") > clientConfig.auth.passwordMaxLength) {
    throw Object.assign(new Error(`Usá al menos ${clientConfig.auth.passwordMinLength} caracteres y como máximo ${clientConfig.auth.passwordMaxLength} bytes.`), { status: 400 });
  }
  const decoded = jwt.decode(token);
  if (!decoded?.sub || !/^\d+$/.test(decoded.sub)) throw invalid();
  return sequelize.transaction(async (t) => {
    const user = await Usuario.findByPk(decoded.sub, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user || !user.activo || user.eliminado_en) throw invalid();
    try { verifyResetToken(token, user, env.JWT_SECRET); } catch { throw invalid(); }
    // La nueva contraseña invalida este enlace y todas las sesiones previas.
    await user.update({ contrasena: await bcrypt.hash(password, 10) }, { transaction: t });
    return { ok: true, mensaje: "Contraseña actualizada. Ingresá con tu nueva contraseña." };
  });
}
