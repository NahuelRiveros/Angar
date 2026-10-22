import jwt from "jsonwebtoken";
import { env } from "../configuracion_servidor/env.js";
import { QueryTypes } from "sequelize";
import { Usuario } from "../models/index.js";
import { sequelize } from "../database/sequelize.js";
import { passwordVersion } from "../services/common/auth_tokens.js";
import { permisosEfectivos, tienePermiso } from "../../../permisos_config.js";

// Roles y permisos en una sola consulta (antes era solo la de roles): se lee en cada
// pedido autenticado, así que un cambio de permisos rige sin volver a iniciar sesión.
async function rolesYPermisos(usuario_id) {
  const filas = await sequelize.query(`
    SELECT r.codigo AS rol, p.codigo AS permiso
    FROM usuario_rol ur
    JOIN rol r ON r.id = ur.rol_id
    LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
    LEFT JOIN permiso p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = :usuario_id`, { replacements: { usuario_id }, type: QueryTypes.SELECT });
  const roles = [...new Set(filas.map((f) => f.rol))];
  return { roles, permisos: permisosEfectivos(roles, filas.map((f) => f.permiso).filter(Boolean)) };
}
async function authenticate(req) {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const payload = jwt.verify(auth.slice(7), env.JWT_SECRET, { algorithms: ["HS256"] });
  const user = await Usuario.findByPk(payload.sub);
  if (!user || !user.activo || user.eliminado_en || payload.pv !== passwordVersion(user.contrasena)) return null;
  return { usuario_id: user.id, persona_id: user.persona_id, ...await rolesYPermisos(user.id) };
}
export async function requireAuth(req, res, next) {
  try {
    req.user = await authenticate(req);
    if (!req.user) return res.status(401).json({ ok: false, codigo: "NO_AUTH", mensaje: "Ingresá para continuar." });
    return next();
  } catch (e) {
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError" || e.name === "NotBeforeError")
      return res.status(401).json({ ok: false, codigo: "TOKEN_INVALIDO", mensaje: "Tu sesión venció. Ingresá nuevamente." });
    return next(e);
  }
}
export async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return requireAuth(req, res, next);
}
export function requireRole(...roles) {
  return (req, res, next) => (req.user?.roles ?? []).some((r) => roles.includes(r)) ? next()
    : res.status(403).json({ ok: false, codigo: "SIN_PERMISO", mensaje: "No tenés permisos" });
}
/** Exige AL MENOS uno de los permisos. Los roles de rolesTotales (admin) los tienen todos. */
export function requirePermiso(...codigos) {
  return (req, res, next) => tienePermiso(req.user, ...codigos) ? next()
    : res.status(403).json({ ok: false, codigo: "SIN_PERMISO", mensaje: "No tenés permiso para esta acción." });
}
