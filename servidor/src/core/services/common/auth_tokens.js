import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { clientConfig } from "../../../../../proyecto/client_config.js";
import { permisosConfig } from "../../../../../core/permisos_config.js";
export const passwordVersion = (hash) => createHash("sha256").update(hash).digest("hex");

// Sesión (USU-06): el cliente compra seguido y no tiene acceso al panel, así que dura más; quien
// tiene cualquier rol del personal (aunque también sea cliente) tiene la corta.
export const tipoSesion = (roles = []) => roles.some((rol) => !permisosConfig.rolesFuera.includes(rol)) ? "personal" : "cliente";
export const duracionSesionSegundos = (tipo) => tipo === "cliente"
  ? clientConfig.auth.sesionClienteDias * 24 * 3600
  : clientConfig.auth.sesionPersonalHoras * 3600;
/** USU-09: una sesión abierta como cliente no vale para quien hoy es personal. Las de antes (sin tipo) siguen hasta vencer. */
export const sesionVigente = (tipoDelToken, rolesActuales) => !(tipoDelToken === "cliente" && tipoSesion(rolesActuales) === "personal");
export function createResetToken(user, secret, minutes) {
  return jwt.sign({ purpose: "password-reset" }, secret + user.contrasena, { algorithm: "HS256", subject: String(user.id), audience: "password-reset", expiresIn: minutes * 60 });
}
export function verifyResetToken(token, user, secret) {
  const result = jwt.verify(token, secret + user.contrasena, { algorithms: ["HS256"], audience: "password-reset", subject: String(user.id) });
  if (result.purpose !== "password-reset") throw new Error("Invalid purpose");
  return result;
}
