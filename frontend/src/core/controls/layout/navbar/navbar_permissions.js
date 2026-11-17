import { cumpleAcceso } from "../../acceso/acceso.js";
function rolesOf(user) {
  const roles = user?.roles?.length ? user.roles : [user?.rol_nombre || user?.rol || user?.role || user?.tipoDesc || user?.tipo];
  return roles.filter(Boolean).map((r) => String(r).trim().toLowerCase());
}
function visible(item, user) {
  if (item.ocultarSiAuth && user || item.requiereAuth && !user) return false;
  return cumpleAcceso({ ...user, roles: rolesOf(user) }, { roles: (item.roles ?? []).map((r) => String(r).toLowerCase()), permisos: item.permisos, todos: item.todosLosPermisos });
}
function filterItems(items, user) {
  return (items ?? []).filter((item) => visible(item, user)).map((item) => item.children
    ? { ...item, children: filterItems(item.children, user) } : item).filter((item) => !item.children || item.children.length);
}
export function filtrarNavbarPorRol(config, usuario) {
  return {
    ...config,
    links: filterItems(config.links, usuario),
    accountLinks: filterItems(config.accountLinks, usuario),
    dropdowns: (config.dropdowns ?? []).filter((d) => visible(d, usuario)).map((d) => ({
      ...d, label: (usuario ? d.labelAuth : d.labelNoAuth) ?? d.label ?? "",
      items: filterItems(d.items, usuario),
    })).filter((d) => d.items.length),
  };
}
