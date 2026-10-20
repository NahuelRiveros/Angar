// ─────────────────────────────────────────────────────────────────────────────
// MÓDULOS DE NEGOCIO — cada instalación puede tener módulos de negocio que se
// habilitan por separado (ej. "eccomerce_distribuidora", "stock").
//
// El estado real (¿está habilitado el módulo "X" para esta instalación?) no
// vive acá — se togglea en vivo desde /super-admin/modulos y se guarda en el
// backend (tabla modulo_negocio), con el mismo gate aplicado también server-side
// para que apagar un módulo sea real y no solo cosmético.
//
// AuthContext lo trae una vez con GET /modulos/estado y lo expone como
// `modulosHabilitados`; este archivo solo define cómo interpretarlo. Todo lo
// que pertenece a un módulo se etiqueta con `modulo: "<codigo>"` en
// footer_config.js / navbar_config/*.js y se filtra con moduloHabilitado().
// ─────────────────────────────────────────────────────────────────────────────

/**
 * true si el módulo está habilitado para este cliente. Un ítem sin `modulo`
 * (null/undefined) se considera transversal y siempre visible (ej. Inicio, Login).
 * Si `modulosHabilitados` todavía no cargó (null), no se oculta de más.
 */
export function moduloHabilitado(modulo, modulosHabilitados) {
  if (modulo == null) return true;
  if (!modulosHabilitados) return true;
  return !!modulosHabilitados[modulo];
}
