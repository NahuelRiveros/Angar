// Permisos del personal, compartidos por la API y la interfaz. Qué rol tiene cada
// permiso se guarda en la base (rol_permiso) y se edita en el panel de permisos;
// acá solo vive la lista de lo que el sistema sabe controlar.
export const permisosConfig = {
  // Tienen todos los permisos siempre y no aparecen como editables: nadie queda afuera por error.
  rolesTotales: ["super_admin", "admin"],
  // No son roles del equipo de la plataforma: los organizadores manejan solo sus torneos
  // (dueño + suscripción) y los jugadores solo su cuenta. No se listan en el panel de permisos.
  rolesFuera: ["organizador", "jugador"],
  grupos: [
    { codigo: "plataforma", nombre: "Plataforma" },
    { codigo: "contenido", nombre: "Contenido del sitio" },
    { codigo: "equipo", nombre: "Equipo" },
  ],
  // `porDefecto`: roles que lo reciben la primera vez que el permiso aparece en la base.
  // Después manda lo que se tilde en el panel. `requiere`: sin esos no hay pantalla
  // donde usarlo, así que se otorgan juntos.
  permisos: [
    { codigo: "suscripciones.ver", grupo: "plataforma", nombre: "Ver suscripciones", descripcion: "Organizadores, vencimientos y pagos recibidos.", porDefecto: ["soporte"] },
    { codigo: "suscripciones.gestionar", grupo: "plataforma", nombre: "Activar o extender planes", descripcion: "Habilitar meses a mano (transferencias, cortesías).", porDefecto: [], requiere: ["suscripciones.ver"] },
    { codigo: "contenido.editar", grupo: "contenido", nombre: "Editar el home", descripcion: "Contenido del home, cinta de anuncios e imágenes.", porDefecto: [] },
    { codigo: "usuarios.gestionar", grupo: "equipo", nombre: "Gestionar el equipo", descripcion: "Altas, bajas, contraseñas y rol de cada persona del equipo.", porDefecto: [] },
    { codigo: "permisos.gestionar", grupo: "equipo", nombre: "Roles y permisos", descripcion: "Crear roles y decidir qué puede hacer cada uno.", porDefecto: [] },
  ],
};

export const CODIGOS_PERMISO = permisosConfig.permisos.map((p) => p.codigo);

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
