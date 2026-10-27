import { Op } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { Modulo, Permiso, Rol, RolPermiso, UsuarioRol } from "../../models/index.js";
import { CODIGOS_PERMISO, conRequeridos, permisosConfig } from "../../../../permisos_config.js";

// Roles que el sistema necesita: se editan sus permisos pero no se borran.
export const ROLES_BASE = [...permisosConfig.rolesTotales, ...permisosConfig.rolesFuera, "soporte"];
const error = (mensaje, status = 400, codigo = "PERMISOS_INVALIDOS") => Object.assign(new Error(mensaje), { status, codigo });

/**
 * Deja la tabla `permiso` igual a permisos_config.js. Idempotente: corre en cada arranque.
 * Un permiso NUEVO se asigna a sus roles `porDefecto`; los existentes no se tocan,
 * así lo que se destildó en el panel no vuelve solo. Los que salieron de la lista se borran.
 */
export async function sincronizarPermisos() {
  return sequelize.transaction(async (t) => {
    const modulos = new Map();
    for (const [i, grupo] of permisosConfig.grupos.entries()) {
      const [modulo] = await Modulo.findOrCreate({ where: { codigo: grupo.codigo }, defaults: { descripcion: grupo.nombre, orden: 20 + i }, transaction: t });
      modulos.set(grupo.codigo, modulo.id);
    }
    const existentes = new Map((await Permiso.findAll({ transaction: t })).map((p) => [p.codigo, p]));
    const nuevos = [];
    for (const permiso of permisosConfig.permisos) {
      const datos = { modulo_id: modulos.get(permiso.grupo), accion: permiso.codigo.split(".")[1], descripcion: permiso.nombre };
      const actual = existentes.get(permiso.codigo);
      if (actual) await actual.update(datos, { transaction: t });
      else nuevos.push({ fila: await Permiso.create({ codigo: permiso.codigo, ...datos }, { transaction: t }), porDefecto: permiso.porDefecto });
    }
    const sobrantes = [...existentes.values()].filter((p) => !CODIGOS_PERMISO.includes(p.codigo)).map((p) => p.id);
    if (sobrantes.length) {
      await RolPermiso.destroy({ where: { permiso_id: { [Op.in]: sobrantes } }, transaction: t });
      await Permiso.destroy({ where: { id: { [Op.in]: sobrantes } }, transaction: t });
    }
    for (const { fila, porDefecto } of nuevos) {
      const roles = porDefecto.length ? await Rol.findAll({ where: { codigo: { [Op.in]: porDefecto } }, transaction: t }) : [];
      for (const rol of roles) await RolPermiso.findOrCreate({ where: { rol_id: rol.id, permiso_id: fila.id }, transaction: t });
    }
    return { nuevos: nuevos.length, borrados: sobrantes.length };
  });
}

/** Grilla del panel: roles del personal con sus permisos y cuántas personas tienen cada uno. */
export async function listarRolesConPermisos() {
  const roles = await Rol.findAll({
    where: { codigo: { [Op.notIn]: permisosConfig.rolesFuera } },
    include: [{ model: Permiso, as: "permisos", attributes: ["codigo"], through: { attributes: [] } }],
    order: [["id", "ASC"]],
  });
  const conteo = await UsuarioRol.findAll({
    attributes: ["rol_id", [sequelize.fn("COUNT", sequelize.col("usuario_id")), "cantidad"]],
    group: ["rol_id"], raw: true,
  });
  const usuariosPorRol = new Map(conteo.map((c) => [c.rol_id, Number(c.cantidad)]));
  return roles.map((rol) => {
    const total = permisosConfig.rolesTotales.includes(rol.codigo);
    return {
      id: rol.id, codigo: rol.codigo, nombre: rol.descripcion,
      permisos: total ? [...CODIGOS_PERMISO] : rol.permisos.map((p) => p.codigo).filter((c) => CODIGOS_PERMISO.includes(c)),
      editable: !total, borrable: !ROLES_BASE.includes(rol.codigo), usuarios: usuariosPorRol.get(rol.id) ?? 0,
    };
  });
}

async function rolEditable(rol_id, t) {
  const rol = await Rol.findByPk(rol_id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!rol || permisosConfig.rolesFuera.includes(rol.codigo)) return null;
  if (permisosConfig.rolesTotales.includes(rol.codigo)) throw error("Este rol tiene todos los permisos siempre: no se edita.", 409, "ROL_TOTAL");
  return rol;
}

/** Reemplaza los permisos del rol por la lista recibida (solo códigos conocidos) y lo que requieren. */
export async function guardarPermisosDeRol(rol_id, permisos) {
  if (!Array.isArray(permisos) || permisos.some((p) => typeof p !== "string")) throw error("Enviá la lista de permisos del rol.");
  const desconocidos = permisos.filter((p) => !CODIGOS_PERMISO.includes(p));
  if (desconocidos.length) throw error(`Permisos desconocidos: ${desconocidos.join(", ")}.`);
  return sequelize.transaction(async (t) => {
    const rol = await rolEditable(rol_id, t);
    if (!rol) return null;
    const filas = await Permiso.findAll({ where: { codigo: { [Op.in]: conRequeridos(permisos) } }, transaction: t });
    await RolPermiso.destroy({ where: { rol_id: rol.id }, transaction: t });
    await RolPermiso.bulkCreate(filas.map((p) => ({ rol_id: rol.id, permiso_id: p.id })), { transaction: t });
    return { id: rol.id, codigo: rol.codigo, permisos: filas.map((p) => p.codigo) };
  });
}

/** "Repositor de góndola" → "repositor_de_gondola": el código no cambia aunque después se renombre. */
export function codigoDeRol(nombre) {
  return String(nombre ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);
}

export async function crearRol({ nombre, permisos = [] }) {
  const limpio = String(nombre ?? "").trim().replace(/\s+/g, " ");
  if (limpio.length < 3 || limpio.length > 40) throw error("El nombre del rol tiene que tener entre 3 y 40 caracteres.");
  const codigo = codigoDeRol(limpio);
  if (codigo.length < 3) throw error("Usá letras o números en el nombre del rol.");
  if (ROLES_BASE.includes(codigo) ) throw error("Ese nombre está reservado para un rol del sistema.", 409, "ROL_EXISTENTE");
  const rol = await Rol.create({ codigo, descripcion: limpio }).catch((e) => {
    if (e.name === "SequelizeUniqueConstraintError") throw error("Ya existe un rol con ese nombre.", 409, "ROL_EXISTENTE");
    throw e;
  });
  if (permisos.length) await guardarPermisosDeRol(rol.id, permisos);
  return rol;
}

/** Solo roles creados desde el panel y sin personas asignadas: nadie se queda sin rol. */
export async function eliminarRol(rol_id) {
  return sequelize.transaction(async (t) => {
    const rol = await Rol.findByPk(rol_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!rol) return null;
    if (ROLES_BASE.includes(rol.codigo)) throw error("Los roles del sistema no se pueden borrar.", 409, "ROL_BASE");
    const usuarios = await UsuarioRol.count({ where: { rol_id: rol.id }, transaction: t });
    if (usuarios) throw error(`Hay ${usuarios} persona(s) con este rol. Cambiales el rol en "Personal" antes de borrarlo.`, 409, "ROL_EN_USO");
    await RolPermiso.destroy({ where: { rol_id: rol.id }, transaction: t });
    await rol.destroy({ transaction: t });
    return rol;
  });
}
