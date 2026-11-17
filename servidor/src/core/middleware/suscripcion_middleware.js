import jwt from "jsonwebtoken";
import { obtenerEstado } from "../services/sistema/software_suscripcion_service.js";
import { env } from "../configuracion_servidor/env.js";
import { permisosConfig } from "../../../../core/permisos_config.js";
import { rolesYPermisos } from "./auth_middleware.js";

// ── Cache en memoria — evita golpear la DB en cada request ───────────────────
let _cache   = null;
let _cacheTs = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 minutos

// Rutas que SIEMPRE pasan aunque la suscripción esté vencida: ingresar, pagar, salud y listas.
const RUTAS_SIEMPRE_LIBRES = ["/auth", "/suscripcion", "/health", "/catalogos"];

/**
 * Con el plan vencido se bloquea al personal (admin incluido) para crear o modificar: es quien
 * tiene que pagar. El super admin nunca, para poder arreglar o extender; clientes y visitantes
 * tampoco, para no cortarle las ventas al negocio (SIS-05, docs/specs/core/sistema.md).
 */
export function debeBloquear({ bloqueado, metodo, ruta, roles = [] }) {
  if (!bloqueado || metodo === "GET") return false;
  if (RUTAS_SIEMPRE_LIBRES.some((libre) => ruta === libre || ruta.startsWith(libre + "/"))) return false;
  if (roles.includes("super_admin")) return false;
  return roles.some((rol) => !permisosConfig.rolesFuera.includes(rol));
}

async function rolesDelPedido(req) {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return [];
  try {
    const { sub } = jwt.verify(auth.slice(7), env.JWT_SECRET, { algorithms: ["HS256"] });
    return (await rolesYPermisos(sub)).roles;
  } catch {
    return []; // sesión inválida o vencida: se trata como visitante (la ruta igual pide ingresar)
  }
}

export async function verificarSuscripcion(req, res, next) {
  if (req.method === "GET") return next();
  try {
    const ahora = Date.now();
    if (!_cache || ahora - _cacheTs > CACHE_MS) {
      _cache   = await obtenerEstado();
      _cacheTs = ahora;
    }
    // Los roles se leen solo con el plan vencido: lo normal es que no lo esté, y así no suma consultas.
    if (!_cache?.bloqueado) return next();
    const roles = await rolesDelPedido(req);
    if (!debeBloquear({ bloqueado: true, metodo: req.method, ruta: req.path, roles })) return next();
    return res.status(402).json({
      ok:      false,
      codigo:  "SUSCRIPCION_VENCIDA",
      mensaje: "Plan vencido. Renovalo para registrar nuevos datos.",
    });
  } catch {
    // Si falla la consulta → dejar pasar (no bloquear por error técnico, SIS-06)
    return next();
  }
}

// Llamar después de extender/fijar para que el bloqueo se levante al instante
export function invalidarCacheSuscripcion() {
  _cache   = null;
  _cacheTs = 0;
}
