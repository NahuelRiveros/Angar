import jwt from "jsonwebtoken";
import { obtenerEstado } from "../services/sistema/software_suscripcion_service.js";
import { env } from "../configuracion_servidor/env.js";

// ── Cache en memoria — evita golpear la DB en cada request ───────────────────
let _cache   = null;
let _cacheTs = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 minutos

// Rutas que SIEMPRE pasan (GET y POST) aunque la suscripción esté vencida
const RUTAS_SIEMPRE_LIBRES = [
  "/auth",        // login / logout / me
  "/suscripcion", // ver estado y renovar
  "/health",      // health check
  "/catalogos",   // listas desplegables (necesarias para ver formularios)
];

export async function verificarSuscripcion(req, res, next) {
  // Los GET siempre pasan — el dueño siempre puede ver sus datos
  if (req.method === "GET") return next();

  const ruta = req.path;
  if (RUTAS_SIEMPRE_LIBRES.some((r) => ruta.startsWith("/" + r) || ruta === "/" + r)) {
    return next();
  }

  try {
    const ahora = Date.now();
    if (!_cache || ahora - _cacheTs > CACHE_MS) {
      _cache   = await obtenerEstado();
      _cacheTs = ahora;
    }

    if (_cache?.bloqueado) {
      // Admin siempre puede operar aunque la suscripción esté vencida
      const authHeader = req.headers["authorization"] || "";
      if (authHeader.startsWith("Bearer ")) {
        try {
          jwt.verify(authHeader.slice(7), env.JWT_SECRET);
          return next();
        } catch {
          // token inválido/expirado → caer al bloqueo normal
        }
      }
      return res.status(402).json({
        ok:      false,
        codigo:  "SUSCRIPCION_VENCIDA",
        mensaje: "Plan vencido. Renovalo para registrar nuevos datos.",
      });
    }

    return next();
  } catch {
    // Si falla la consulta → dejar pasar (no bloquear por error técnico)
    return next();
  }
}

// Llamar después de extender/fijar para que el bloqueo se levante al instante
export function invalidarCacheSuscripcion() {
  _cache   = null;
  _cacheTs = 0;
}
