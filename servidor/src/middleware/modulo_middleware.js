import { moduloNegocioHabilitado } from "../services/sistema/modulo_negocio_service.js";

/**
 * Gate de licencia por módulo de negocio (ej. eccomerce_distribuidora) — a diferencia de
 * requireRole(), esto bloquea a CUALQUIER rol, incluido admin, si el módulo
 * está apagado para esta instalación. Va antes o junto a requireRole en la
 * cadena de middleware del router.
 */
export function requireModuloHabilitado(codigo) {
  return async (req, res, next) => {
    try {
      const habilitado = await moduloNegocioHabilitado(codigo);
      if (!habilitado) {
        return res.status(403).json({
          ok: false,
          codigo: "MODULO_DESHABILITADO",
          mensaje: "Este módulo no está habilitado para esta cuenta",
        });
      }
      return next();
    } catch (err) {
      next(err);
    }
  };
}
