/**
 * Helpers de paginación compartidos. Pensados para usarse tanto desde
 * crud_service.js (queries por modelo) como desde servicios con SQL crudo
 * que necesiten el mismo cálculo de page/limit/offset.
 */

export function normalizarPaginacion({ page, limit, maxLimit = 100, defaultLimit = 20 } = {}) {
  const p = Math.min(1000000, Math.max(1, Math.floor(Number(page)) || 1));
  const l = Math.min(maxLimit, Math.max(1, Math.floor(Number(limit)) || defaultLimit));
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
}

export function armarPaginacion({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
