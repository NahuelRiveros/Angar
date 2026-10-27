import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { Persona, Usuario, UsuarioRol, Rol, TipoDocumento } from "../../models/index.js";
import { permisosConfig } from "../../../../permisos_config.js";

const normalizarEmail = (v) => String(v ?? "").trim().toLowerCase();
const normalizarDocumento = (v) => String(v ?? "").replace(/[.\s]/g, "").trim();

// Roles que se pueden asignar desde "Personal": todos los del personal, incluidos los
// creados en el panel de permisos. "admin" solo lo asigna un super_admin (se valida
// en crearStaff y cambiarRolStaff); super_admin y los roles de cliente, nunca.
const ROLES_NO_ASIGNABLES = ["super_admin", ...permisosConfig.rolesFuera];
const ROL_POR_DEFECTO = "soporte";

/** Roles para el selector de "Personal": código y nombre visible. */
export async function listarRolesAsignables() {
  const roles = await Rol.findAll({ where: { codigo: { [Op.notIn]: ROLES_NO_ASIGNABLES } }, attributes: ["codigo", "descripcion"], order: [["id", "ASC"]] });
  return roles.map((r) => ({ codigo: r.codigo, nombre: r.descripcion }));
}
const codigosAsignables = async () => (await listarRolesAsignables()).map((r) => r.codigo);

const ahoraArgentina = () =>
  sequelize.literal(`TIMEZONE('America/Argentina/Cordoba', CURRENT_TIMESTAMP)`);

async function usuarioEsAdmin(usuarioId) {
  const rolAdmin = await Rol.findOne({ where: { codigo: "admin" } });
  if (!rolAdmin) return false;
  const tiene = await UsuarioRol.findOne({ where: { usuario_id: usuarioId, rol_id: rolAdmin.id } });
  return Boolean(tiene);
}

export async function listarStaff() {
  const rolesPersonal = await Rol.findAll({ where: { codigo: { [Op.notIn]: ROLES_NO_ASIGNABLES } } });
  if (!rolesPersonal.length) return [];

  // Ocultar de "Personal" a cualquier usuario que además tenga super_admin
  // (ej. la cuenta seed, que también carga el rol admin para acceder a esta sección).
  const rolSuperAdmin = await Rol.findOne({ where: { codigo: "super_admin" } });
  const superAdminUsuarioIds = rolSuperAdmin
    ? (await UsuarioRol.findAll({ where: { rol_id: rolSuperAdmin.id }, attributes: ["usuario_id"] }))
        .map((r) => r.usuario_id)
    : [];

  const relaciones = await UsuarioRol.findAll({
    where: {
      rol_id: { [Op.in]: rolesPersonal.map((r) => r.id) },
      ...(superAdminUsuarioIds.length ? { usuario_id: { [Op.notIn]: superAdminUsuarioIds } } : {}),
    },
    include: [
      {
        model: Usuario,
        as: "usuario",
        where: { eliminado_en: null },
        required: true,
        include: [
          {
            model: Persona,
            as: "persona",
            attributes: ["id", "nombre", "apellido", "email", "documento", "actualizado_en"],
          },
        ],
        attributes: ["id", "persona_id", "activo", "actualizado_en", "ultimo_login"],
      },
      {
        model: Rol,
        as: "rol",
        attributes: ["id", "codigo", "descripcion"],
      },
    ],
    order: [["id", "DESC"]],
  });

  return relaciones.map((rel) => ({
    gym_usuario_rol_id:    rel.id,
    gym_usuario_id:        rel.usuario?.id,
    gym_usuario_activo:    rel.usuario?.activo,
    gym_usuario_fechacambio: rel.usuario?.actualizado_en,
    gym_usuario_ultimo_login: rel.usuario?.ultimo_login,

    gym_persona_id:        rel.usuario?.persona?.id,
    gym_persona_nombre:    rel.usuario?.persona?.nombre,
    gym_persona_apellido:  rel.usuario?.persona?.apellido,
    gym_persona_email:     rel.usuario?.persona?.email,
    gym_persona_documento: rel.usuario?.persona?.documento,
    gym_persona_fechacambio: rel.usuario?.persona?.actualizado_en,

    rol_id:          rel.rol?.id,
    rol_codigo:      rel.rol?.codigo,
    rol_descripcion: rel.rol?.descripcion,
  }));
}

export async function crearStaff({ email, password, nombre, apellido, documento, rol_codigo, solicitanteEsSuperAdmin }) {
  const emailN    = normalizarEmail(email);
  const pass      = String(password ?? "").trim();
  const doc       = normalizarDocumento(documento);
  const nombreN   = String(nombre ?? "").trim();
  const apellidoN = String(apellido ?? "").trim();
  const rolCodigo = (await codigosAsignables()).includes(rol_codigo) ? rol_codigo : ROL_POR_DEFECTO;

  if (rolCodigo === "admin" && !solicitanteEsSuperAdmin)
    return { ok: false, codigo: "SIN_PERMISO", mensaje: "Solo un super administrador puede crear otro admin" };

  if (!emailN || !pass || !nombreN || !apellidoN || !doc)
    return { ok: false, codigo: "FALTAN_DATOS", mensaje: "Requiere: email, password, nombre, apellido y documento" };
  if (pass.length < 4)
    return { ok: false, codigo: "PASSWORD_INVALIDA", mensaje: "La contraseña debe tener al menos 4 caracteres" };
  if (!/^\d+$/.test(doc))
    return { ok: false, codigo: "DOCUMENTO_INVALIDO", mensaje: "El documento debe contener solo números" };

  return await sequelize.transaction(async (t) => {
    const rolStaff = await Rol.findOne({ where: { codigo: rolCodigo }, transaction: t });
    if (!rolStaff)
      return { ok: false, codigo: "SIN_ROL", mensaje: `No existe el rol '${rolCodigo}' en la tabla rol` };

    let persona = await Persona.findOne({
      where: { [Op.or]: [{ email: emailN }, { documento: doc }] },
      transaction: t,
    });

    if (persona) {
      const usuarioExistente = await Usuario.findOne({
        where: { persona_id: persona.id },
        transaction: t,
      });

      if (usuarioExistente) {
        const yaTieneRol = await UsuarioRol.findOne({
          where: { usuario_id: usuarioExistente.id, rol_id: rolStaff.id },
          transaction: t,
        });

        if (yaTieneRol)
          return { ok: false, codigo: "ROL_YA_ASIGNADO", mensaje: `La persona ya tiene un usuario con rol ${rolCodigo}` };

        await UsuarioRol.create(
          { usuario_id: usuarioExistente.id, rol_id: rolStaff.id, actualizado_en: ahoraArgentina() },
          { transaction: t }
        );

        return {
          ok: true, codigo: "ROL_ASIGNADO",
          mensaje: `Se asignó el rol ${rolCodigo} a un usuario existente`,
          usuario_id: usuarioExistente.id, persona_id: persona.id,
          email: persona.email, rol: rolCodigo,
        };
      }

      const hash = await bcrypt.hash(pass, 10);
      const nuevoUsuario = await Usuario.create(
        { persona_id: persona.id, contrasena: hash, activo: true, actualizado_en: ahoraArgentina() },
        { transaction: t }
      );

      await UsuarioRol.create(
        { usuario_id: nuevoUsuario.id, rol_id: rolStaff.id, actualizado_en: ahoraArgentina() },
        { transaction: t }
      );

      return {
        ok: true, codigo: "USUARIO_CREADO", mensaje: "Usuario creado correctamente",
        usuario_id: nuevoUsuario.id, persona_id: persona.id, email: persona.email, rol: rolCodigo,
      };
    }

    const tipoDocumentoDni = await TipoDocumento.findOne({ where: { descripcion: "DNI" }, transaction: t });
    persona = await Persona.create(
      {
        nombre: nombreN, apellido: apellidoN, email: emailN, documento: doc,
        tipo_documento_id: tipoDocumentoDni?.id ?? null,
        actualizado_en: ahoraArgentina(),
      },
      { transaction: t }
    );

    const hash = await bcrypt.hash(pass, 10);
    const usuario = await Usuario.create(
      { persona_id: persona.id, contrasena: hash, activo: true, actualizado_en: ahoraArgentina() },
      { transaction: t }
    );

    await UsuarioRol.create(
      { usuario_id: usuario.id, rol_id: rolStaff.id, actualizado_en: ahoraArgentina() },
      { transaction: t }
    );

    return {
      ok: true, codigo: "USUARIO_CREADO", mensaje: "Usuario creado correctamente",
      usuario_id: usuario.id, persona_id: persona.id, email: persona.email, rol: rolCodigo,
    };
  });
}

export async function actualizarStaff(usuarioId, data) {
  const emailN    = normalizarEmail(data.email);
  const doc       = normalizarDocumento(data.documento);
  const nombreN   = String(data.nombre ?? "").trim();
  const apellidoN = String(data.apellido ?? "").trim();

  if (!nombreN || !apellidoN || !emailN || !doc)
    return { ok: false, codigo: "FALTAN_DATOS", mensaje: "Requiere: nombre, apellido, email y documento" };
  if (!/^\d+$/.test(doc))
    return { ok: false, codigo: "DOCUMENTO_INVALIDO", mensaje: "El documento debe contener solo números" };

  return await sequelize.transaction(async (t) => {
    const usuario = await Usuario.findByPk(usuarioId, {
      include: [{ model: Persona, as: "persona" }],
      transaction: t,
    });

    if (!usuario || !usuario.persona)
      return { ok: false, codigo: "NO_ENCONTRADO", mensaje: "Staff no encontrado" };

    const otraConEmail = await Persona.findOne({
      where: { email: emailN, id: { [Op.ne]: usuario.persona.id } },
      transaction: t,
    });
    if (otraConEmail)
      return { ok: false, codigo: "EMAIL_DUPLICADO", mensaje: "Ya existe una persona con ese email" };

    const otraConDoc = await Persona.findOne({
      where: { documento: doc, id: { [Op.ne]: usuario.persona.id } },
      transaction: t,
    });
    if (otraConDoc)
      return { ok: false, codigo: "DOCUMENTO_DUPLICADO", mensaje: "Ya existe una persona con ese documento" };

    await usuario.persona.update(
      { nombre: nombreN, apellido: apellidoN, email: emailN, documento: doc, actualizado_en: ahoraArgentina() },
      { transaction: t }
    );
    await usuario.update({ actualizado_en: ahoraArgentina() }, { transaction: t });

    return {
      ok: true, codigo: "STAFF_ACTUALIZADO", mensaje: "Staff actualizado correctamente",
      usuario_id: usuario.id, persona_id: usuario.persona.id,
    };
  });
}

export async function cambiarPasswordStaff(usuarioId, nuevaPassword, solicitanteEsSuperAdmin) {
  const pass = String(nuevaPassword ?? "").trim();

  if (!pass || pass.length < 4)
    return { ok: false, codigo: "PASSWORD_INVALIDA", mensaje: "La contraseña debe tener al menos 4 caracteres" };

  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario || usuario.eliminado_en)
    return { ok: false, codigo: "NO_ENCONTRADO", mensaje: "Staff no encontrado" };

  if (!solicitanteEsSuperAdmin && (await usuarioEsAdmin(usuarioId)))
    return { ok: false, codigo: "SIN_PERMISO", mensaje: "Solo un super administrador puede cambiar la contraseña de un admin" };

  const hash = await bcrypt.hash(pass, 10);
  await usuario.update({ contrasena: hash, actualizado_en: ahoraArgentina() });

  return { ok: true, codigo: "PASSWORD_ACTUALIZADA", mensaje: "Contraseña actualizada correctamente" };
}

export async function cambiarEstadoStaff(usuarioId, activo, solicitanteEsSuperAdmin) {
  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario || usuario.eliminado_en)
    return { ok: false, codigo: "NO_ENCONTRADO", mensaje: "Staff no encontrado" };

  if (!solicitanteEsSuperAdmin && (await usuarioEsAdmin(usuarioId)))
    return { ok: false, codigo: "SIN_PERMISO", mensaje: "Solo un super administrador puede activar o desactivar a un admin" };

  await usuario.update({ activo, actualizado_en: ahoraArgentina() });

  return {
    ok: true, codigo: "ESTADO_ACTUALIZADO",
    mensaje: activo ? "Staff activado correctamente" : "Staff desactivado correctamente",
  };
}

export async function cambiarRolStaff(usuarioRolId, nuevoRolCodigo, solicitanteEsSuperAdmin) {
  const asignables = await codigosAsignables();
  if (!asignables.includes(nuevoRolCodigo))
    return { ok: false, codigo: "ROL_INVALIDO", mensaje: "Rol inválido" };

  const relacion = await UsuarioRol.findByPk(usuarioRolId, { include: [{ model: Rol, as: "rol" }] });
  if (!relacion)
    return { ok: false, codigo: "NO_ENCONTRADO", mensaje: "Relación de rol no encontrada" };

  const rolActual = relacion.rol?.codigo;
  if (!asignables.includes(rolActual))
    return { ok: false, codigo: "NO_PERMITIDO", mensaje: "No se puede modificar este rol desde acá" };

  if ((rolActual === "admin" || nuevoRolCodigo === "admin") && !solicitanteEsSuperAdmin)
    return { ok: false, codigo: "SIN_PERMISO", mensaje: "Solo un super administrador puede asignar o quitar el rol admin" };

  if (rolActual === nuevoRolCodigo)
    return { ok: true, codigo: "SIN_CAMBIOS", mensaje: "El usuario ya tiene ese rol" };

  const nuevoRol = await Rol.findOne({ where: { codigo: nuevoRolCodigo } });
  if (!nuevoRol)
    return { ok: false, codigo: "SIN_ROL", mensaje: `No existe el rol '${nuevoRolCodigo}' en la tabla rol` };

  const yaTiene = await UsuarioRol.findOne({ where: { usuario_id: relacion.usuario_id, rol_id: nuevoRol.id } });
  if (yaTiene)
    return { ok: false, codigo: "ROL_YA_ASIGNADO", mensaje: "El usuario ya tiene ese rol asignado" };

  await relacion.update({ rol_id: nuevoRol.id, actualizado_en: ahoraArgentina() });

  return {
    ok: true, codigo: "ROL_ACTUALIZADO", mensaje: "Rol actualizado correctamente",
    usuario_id: relacion.usuario_id, rol: nuevoRolCodigo,
  };
}

export async function eliminarStaff(usuarioId, solicitanteEsSuperAdmin, solicitanteUsuarioId) {
  if (Number(usuarioId) === Number(solicitanteUsuarioId))
    return { ok: false, codigo: "AUTOELIMINACION", mensaje: "No podés eliminar tu propio usuario" };

  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario || usuario.eliminado_en)
    return { ok: false, codigo: "NO_ENCONTRADO", mensaje: "Staff no encontrado" };

  if (!solicitanteEsSuperAdmin && (await usuarioEsAdmin(usuarioId)))
    return { ok: false, codigo: "SIN_PERMISO", mensaje: "Solo un super administrador puede eliminar a un admin" };

  await usuario.update({ eliminado_en: ahoraArgentina(), activo: false, actualizado_en: ahoraArgentina() });

  return { ok: true, codigo: "STAFF_ELIMINADO", mensaje: "Usuario eliminado correctamente" };
}
