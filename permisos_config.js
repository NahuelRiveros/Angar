// Permisos del personal, compartidos por la API y la interfaz. Qué rol tiene cada
// permiso se guarda en la base (rol_permiso) y se edita en el panel de permisos;
// acá solo vive la lista de lo que el sistema sabe controlar.
export const permisosConfig = {
  // Tienen todos los permisos siempre y no aparecen como editables: nadie queda afuera por error.
  rolesTotales: ["super_admin", "admin"],
  // No son roles del personal: no se listan en el panel ni se asignan desde "Personal".
  rolesFuera: ["cliente", "profesional"],
  grupos: [
    { codigo: "pedidos", nombre: "Pedidos" },
    { codigo: "cobros", nombre: "Cobros" },
    { codigo: "catalogo", nombre: "Catálogo" },
    { codigo: "contenido", nombre: "Contenido de la tienda" },
    { codigo: "equipo", nombre: "Equipo" },
  ],
  // `porDefecto`: roles que lo reciben la primera vez que el permiso aparece en la base.
  // Después manda lo que se tilde en el panel. `requiere`: sin esos no hay pantalla
  // donde usarlo, así que se otorgan juntos.
  permisos: [
    { codigo: "pedidos.ver", grupo: "pedidos", nombre: "Ver pedidos", descripcion: "Notas de pedido, comprobantes, lista de carga, exportar y resumen del panel.", porDefecto: ["supervisor", "vendedor"] },
    { codigo: "pedidos.gestionar", grupo: "pedidos", nombre: "Cambiar estados", descripcion: "Confirmar, preparar, entregar, cancelar o reabrir pedidos.", porDefecto: ["supervisor", "vendedor"], requiere: ["pedidos.ver"] },
    { codigo: "cobros.gestionar", grupo: "cobros", nombre: "Registrar cobros", descripcion: "Registrar y anular cobros; aceptar o rechazar comprobantes.", porDefecto: ["supervisor"], requiere: ["pedidos.ver"] },
    // Antes solo el dueño veía estos montos: de entrada no lo tiene ningún rol.
    { codigo: "ventas.ver", grupo: "cobros", nombre: "Ver ventas y saldos", descripcion: "Ventas del día y del mes y saldo por cobrar en el inicio del panel.", porDefecto: [] },
    { codigo: "productos.editar", grupo: "catalogo", nombre: "Editar artículos y stock", descripcion: "Artículos, familias, categorías, marcas y stock.", porDefecto: ["supervisor"] },
    { codigo: "precios.editar", grupo: "catalogo", nombre: "Cambiar precios", descripcion: "Precios de los artículos, ajuste masivo, listas de precios e importación.", porDefecto: ["supervisor"] },
    { codigo: "contenido.editar", grupo: "contenido", nombre: "Editar el home", descripcion: "Contenido del home, cinta de anuncios e imágenes.", porDefecto: [] },
    { codigo: "usuarios.gestionar", grupo: "equipo", nombre: "Gestionar personal", descripcion: "Altas, bajas, contraseñas y rol de cada persona del equipo.", porDefecto: [] },
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
