import { Rol, Modulo, RolPermiso, UsuarioRol } from "../../models/index.js";
import { sequelize } from "../sequelize.js";
import { permisosConfig } from "../../../../../core/permisos_config.js";

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

/**
 * "profesional" era del gimnasio y la kinesiología (PER-13). Se borra si nadie lo tiene;
 * si alguien lo tiene, se conserva y se avisa para resolverlo a mano: borrarlo dejaría
 * a esa persona sin rol.
 */
export async function retirarRolProfesional() {
  return sequelize.transaction(async (t) => {
    const rol = await Rol.findOne({ where: { codigo: "profesional" }, transaction: t, lock: t.LOCK.UPDATE });
    if (!rol) return { borrado: false, personas: 0 };
    const personas = await UsuarioRol.count({ where: { rol_id: rol.id }, transaction: t });
    if (personas) {
      console.warn(`⚠️  El rol "profesional" ya no se usa, pero lo tienen ${personas} persona(s): cambiales el rol en "Personal".`);
      return { borrado: false, personas };
    }
    await RolPermiso.destroy({ where: { rol_id: rol.id }, transaction: t });
    await rol.destroy({ transaction: t });
    return { borrado: true, personas: 0 };
  });
}

/**
 * Roles del sistema (supervisor = catálogo, pedidos y cobros; vendedor = solo pedidos; cliente =
 * quien se registra en la tienda). PER-14: si cambia su nombre en permisos_config.js, se actualiza
 * en la base; los roles creados en el panel no se tocan.
 */
export async function sembrarRolesDelSistema() {
  for (const [codigo, descripcion] of Object.entries(permisosConfig.nombresRol)) {
    const [rol] = await Rol.findOrCreate({ where: { codigo }, defaults: { codigo, descripcion } });
    if (rol.descripcion !== descripcion) await rol.update({ descripcion });
  }
}

export async function seed_rbac() {
  await renombrarStaffASupervisor();
  await retirarRolProfesional();
  await sembrarRolesDelSistema();

  // Secciones del panel de gestión de roles — reflejan las áreas reales de la app (routes/)
  const modulos = [
    { codigo: "usuarios",     descripcion: "Usuarios y staff",               orden: 2 },
    { codigo: "suscripcion",  descripcion: "Suscripción del software",       orden: 10 },
  ];
  for (const modulo of modulos) {
    await Modulo.findOrCreate({ where: { codigo: modulo.codigo }, defaults: modulo });
  }
}
