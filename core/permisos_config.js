import * as rubros from "../proyecto/permisos_rubros.js";

const PERMISOS_DE_RUBROS = rubros.PERMISOS_DE_RUBROS ?? [];
// Opcional en proyecto/permisos_rubros.js (PER-37): roles propios del rubro que no usan permisos del
// personal (como "cliente") y el rol que recibe quien se registra. Sin esto: "cliente".
const ROLES_DE_RUBROS = rubros.ROLES_DE_RUBROS ?? {};

// Permisos del personal, compartidos por la API y la interfaz. Qué rol tiene cada
// permiso se guarda en la base (rol_permiso) y se edita en el panel de permisos;
// acá solo vive la lista de lo que el sistema sabe controlar (spec: docs/specs/core/permisos.md):
// los del core en este archivo y los de cada rubro en proyecto/permisos_rubros.js.
//
// `porDefecto`: roles que lo reciben la primera vez que el permiso aparece en la base.
// Después manda lo que se tilde en el panel. `requiere`: sin esos no hay pantalla
// donde usarlo, así que se otorgan juntos.
//
// ⚠️ No cambiar un `codigo` existente: el arranque borra los que salen de la lista y,
// con ellos, lo que se haya tildado en el panel (PER-31).

// ── CORE: vale para cualquier proyecto ──────────────────────────────────────
export const permisosConfig = {
  // Tienen todos los permisos siempre y no aparecen como editables: nadie queda afuera por error.
  rolesTotales: ["super_admin", "admin"],
  // No son roles del personal: no se listan en el panel ni se asignan desde "Personal".
  rolesFuera: ["cliente", ...Object.keys(ROLES_DE_RUBROS.fuera ?? {})],
  // USU-14 / PER-37: rol de quien se registra (o entra por primera vez con Google).
  rolAlRegistrarse: ROLES_DE_RUBROS.alRegistrarse ?? "cliente",
  // PER-14: nombre que se ve de cada rol del sistema. El código no se cambia nunca: lo usan el
  // programa y las sesiones abiertas. Los roles creados en el panel muestran el nombre que se les dio.
  nombresRol: {
    super_admin: "Administrador del sistema",
    admin: "Gerente general",
    supervisor: "Encargado",
    vendedor: "Vendedor",
    cliente: "Cliente",
    ...ROLES_DE_RUBROS.fuera,
  },
  grupos: [
    ...PERMISOS_DE_RUBROS.flatMap((rubro) => rubro.grupos),
    { codigo: "contenido", nombre: "Contenido de la tienda" },
    { codigo: "equipo", nombre: "Equipo" },
  ],
  permisos: [
    ...PERMISOS_DE_RUBROS.flatMap((rubro) => rubro.permisos),
    { codigo: "contenido.editar", grupo: "contenido", nombre: "Editar banners", descripcion: "Carrusel del inicio, cinta de anuncios e imágenes.", porDefecto: [] },
    { codigo: "usuarios.gestionar", grupo: "equipo", nombre: "Gestionar personal", descripcion: "Altas, bajas, contraseñas y rol de cada persona del equipo.", porDefecto: [] },
    { codigo: "permisos.gestionar", grupo: "equipo", nombre: "Roles y permisos", descripcion: "Crear roles y decidir qué puede hacer cada uno.", porDefecto: [] },
  ],
};

export const CODIGOS_PERMISO = permisosConfig.permisos.map((p) => p.codigo);

/** Nombre visible de un rol; los creados en el panel: "repositor_de_gondola" → "Repositor de gondola". */
export const nombreRol = (codigo) => permisosConfig.nombresRol[codigo]
  ?? String(codigo ?? "").replace(/_/g, " ").replace(/^./, (letra) => letra.toUpperCase());

/** Los permisos pedidos más los que requieren, en el orden de la lista y sin desconocidos. */
export function conRequeridos(codigos = []) {
  const elegidos = new Set(codigos);
  for (const permiso of permisosConfig.permisos) {
    if (elegidos.has(permiso.codigo)) for (const requerido of permiso.requiere ?? []) elegidos.add(requerido);
  }
  return CODIGOS_PERMISO.filter((codigo) => elegidos.has(codigo));
}

/** Los que dependen de este: al quitarlo, se quitan también (quedarían sin pantalla). */
export const dependientesDe = (codigo) => permisosConfig.permisos.filter((p) => p.requiere?.includes(codigo)).map((p) => p.codigo);

/** Permisos efectivos de quien tiene estos roles, a partir de lo asignado en la base. */
export function permisosEfectivos(roles = [], asignados = []) {
  if (roles.some((r) => permisosConfig.rolesTotales.includes(r))) return [...CODIGOS_PERMISO];
  return conRequeridos(asignados);
}

/** true si el usuario tiene AL MENOS uno de los permisos pedidos. */
export function tienePermiso(usuario, ...codigos) {
  const propios = usuario?.permisos ?? [];
  return codigos.some((codigo) => propios.includes(codigo));
}
