import { tienePermiso } from "../../../../permisos_config.js";

/**
 * Regla única de menús y rutas. Sin requisitos, pasa. Si no, alcanza con uno de
 * los `roles` (super admin, cliente) o con uno de los `permisos`; con `todos`,
 * hacen falta todos los permisos. El servidor vuelve a autorizar cada acción:
 * esto solo evita mostrar lo que va a fallar.
 */
export function cumpleAcceso(usuario, { roles = [], permisos = [], todos = false } = {}) {
  if (!roles.length && !permisos.length) return true;
  if (roles.some((rol) => (usuario?.roles ?? []).includes(rol))) return true;
  if (!permisos.length) return false;
  return todos ? permisos.every((p) => tienePermiso(usuario, p)) : tienePermiso(usuario, ...permisos);
}
