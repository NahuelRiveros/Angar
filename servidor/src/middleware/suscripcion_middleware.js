import { vigenciaDeUsuario } from "../services/suscripciones/suscripcion_service.js";

/**
 * Para las rutas que crean o editan algo de un organizador (va después de requireAuth).
 * Plan vencido = solo lectura: los GET no llevan este middleware. El super admin pasa
 * siempre para poder dar soporte.
 */
export async function requireSuscripcionVigente(req, res, next) {
  try {
    if ((req.user?.roles ?? []).includes("super_admin")) return next();
    const vigencia = await vigenciaDeUsuario(req.user.usuario_id);
    if (!vigencia) {
      return res.status(403).json({ ok: false, codigo: "NO_ES_ORGANIZADOR", mensaje: "Activá tu cuenta de organizador para crear torneos." });
    }
    if (!vigencia.vigente) {
      return res.status(402).json({ ok: false, codigo: "SUSCRIPCION_VENCIDA", mensaje: vigencia.mensaje });
    }
    req.suscripcion = vigencia;
    return next();
  } catch (e) {
    return next(e);
  }
}
