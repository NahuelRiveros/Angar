import { Rol, ModuloNegocio, Modulo } from "../../models/index.js";

export async function seed_rbac() {
  // Roles genéricos, sin nombres de un rubro. "profesional" se conserva porque
  // personal y stock lo siguen aceptando en sus permisos.
  const roles = [
    { codigo: "super_admin", descripcion: "Super administrador de la plataforma" },
    { codigo: "admin",       descripcion: "Administrador del negocio" },
    { codigo: "staff",       descripcion: "Personal" },
    { codigo: "profesional", descripcion: "Profesional" },
    // Rol que se asigna automáticamente al auto-registrarse desde /register
    // (POST /auth/register) — clientes externos de un módulo con catálogo
    // propio (hoy: eccomerce_distribuidora), no personal interno.
    { codigo: "cliente",     descripcion: "Cliente" },
    // Acceso acotado a pedidos (ver/procesar notas de pedido) SIN tocar
    // catálogo — separado de "staff" a propósito para poder darle este
    // acceso a alguien sin darle también alta/baja de productos.
    { codigo: "vendedor",    descripcion: "Vendedor" },
  ];
  for (const rol of roles) {
    await Rol.findOrCreate({ where: { codigo: rol.codigo }, defaults: rol });
  }

  // Módulos de negocio (gate real de licencia, ver requireModuloHabilitado) —
  // findOrCreate no pisa el habilitado si un cliente ya lo togleó antes.
  const modulosNegocio = [
    { codigo: "stock",                  descripcion: "Kiosco y stock",          habilitado: true },
    { codigo: "eccomerce_indumentaria", descripcion: "Tienda de indumentaria",  habilitado: true },
    { codigo: "eccomerce_distribuidora", descripcion: "Distribuidora",          habilitado: true },
  ];
  for (const modulo of modulosNegocio) {
    await ModuloNegocio.findOrCreate({ where: { codigo: modulo.codigo }, defaults: modulo });
  }

  // Secciones del panel de gestión de roles — reflejan las áreas reales de la app (routes/)
  const modulos = [
    { codigo: "usuarios",     descripcion: "Usuarios y staff",               orden: 2 },
    { codigo: "stock",        descripcion: "Kiosco y stock",                 orden: 5 },
    { codigo: "home",         descripcion: "Contenido del home",             orden: 9 },
    { codigo: "suscripcion",  descripcion: "Suscripción del software",       orden: 10 },
  ];
  for (const modulo of modulos) {
    await Modulo.findOrCreate({ where: { codigo: modulo.codigo }, defaults: modulo });
  }
}
