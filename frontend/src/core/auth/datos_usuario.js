import { nombreRol, permisosConfig } from "../../../../core/permisos_config.js";

// Cómo se muestra quien tiene la sesión: lo comparten el navbar de la tienda y el panel.
export const nombreCompleto = (usuario) => [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || usuario?.email || "Usuario";

/** Primer nombre ("Eva" de "Eva María"); sin nombre, lo mismo que nombreCompleto. */
export const nombrePila = (usuario) => String(usuario?.nombre ?? "").trim().split(/\s+/)[0] || nombreCompleto(usuario);

export const iniciales = (nombre) => String(nombre ?? "").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";

/** Rol del equipo para mostrar ("Encargado"); vacío para un cliente. Con varios, primero uno del sistema. */
export function rolVisible(usuario) {
  const delEquipo = (usuario?.roles ?? []).filter((r) => !permisosConfig.rolesFuera.includes(r));
  const principal = delEquipo.find((r) => permisosConfig.nombresRol[r]) ?? delEquipo[0];
  return principal ? nombreRol(principal) : "";
}
