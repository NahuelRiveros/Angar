import { Rol, ModuloNegocio, Modulo, RolPermiso, UsuarioRol } from "../../models/index.js";
import { sequelize } from "../sequelize.js";

/**
 * "staff" pasó a llamarse "supervisor". Se renombra una sola vez conservando sus
 * usuarios; si por algún motivo ya existían los dos, se pasan los usuarios y se
 * borra el viejo. Sin "staff" en la base, es una consulta que no encuentra nada.
 */
export async function renombrarStaffASupervisor() {
  await sequelize.transaction(async (t) => {
    const staff = await Rol.findOne({ where: { codigo: "staff" }, transaction: t, lock: t.LOCK.UPDATE });
    if (!staff) return;
    const supervisor = await Rol.findOne({ where: { codigo: "supervisor" }, transaction: t });
    if (!supervisor) { await staff.update({ codigo: "supervisor", descripcion: "Supervisor" }, { transaction: t }); return; }
    for (const { usuario_id } of await UsuarioRol.findAll({ where: { rol_id: staff.id }, transaction: t })) {
      await UsuarioRol.findOrCreate({ where: { usuario_id, rol_id: supervisor.id }, transaction: t });
    }
    await UsuarioRol.destroy({ where: { rol_id: staff.id }, transaction: t });
    await RolPermiso.destroy({ where: { rol_id: staff.id }, transaction: t });
    await staff.destroy({ transaction: t });
  });
}

export async function seed_rbac() {
  await renombrarStaffASupervisor();
  // Roles genéricos, sin nombres de un rubro. "profesional" se conserva porque
  // personal y stock lo siguen aceptando en sus permisos.
  const roles = [
    { codigo: "super_admin", descripcion: "Super administrador de la plataforma" },
    { codigo: "admin",       descripcion: "Administrador del negocio" },
    // Antes "staff" (ver renombrarStaffASupervisor): todo lo del catálogo, pedidos y cobros.
    { codigo: "supervisor",  descripcion: "Supervisor" },
    { codigo: "profesional", descripcion: "Profesional" },
    // Rol que se asigna automáticamente al auto-registrarse desde /register
    // (POST /auth/register) — clientes externos de un módulo con catálogo
    // propio (hoy: eccomerce_distribuidora), no personal interno.
    { codigo: "cliente",     descripcion: "Cliente" },
    // Acceso acotado a pedidos (ver/procesar notas de pedido) SIN tocar
    // catálogo, stock, precios ni cobros. Sus permisos se editan en el panel.
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
