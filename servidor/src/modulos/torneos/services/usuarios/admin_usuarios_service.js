import bcrypt from "bcrypt";
import { sequelize } from "../../../../core/database/sequelize.js";
import { Op } from "sequelize";
import { Persona, Usuario, UsuarioRol, Rol } from "../../models/index.js";

const normalizarEmail = (v) => String(v ?? "").trim().toLowerCase();
const normalizarDocumento = (v) => String(v ?? "").replace(/[.\s]/g, "").trim();

export async function crearUsuarioConRoles(data) {
  const personaId  = data.persona_id ? Number(data.persona_id) : null;
  const email      = normalizarEmail(data.email);
  const documento  = data.documento ? normalizarDocumento(data.documento) : null;
  const password   = String(data.password ?? "").trim();
  const roles      = Array.isArray(data.roles) ? data.roles.map(Number) : [];

  if (!password || password.length < 4)
    return { ok: false, codigo: "PASSWORD_INVALIDO", mensaje: "Password obligatorio (mínimo 4 caracteres)" };
  if (!roles.length)
    return { ok: false, codigo: "ROLES_REQUERIDOS", mensaje: "Debés enviar roles: [1] admin, [2] staff" };

  return sequelize.transaction(async (t) => {
    let persona = null;

    if (personaId) {
      persona = await Persona.findByPk(personaId, { transaction: t });
      if (!persona)
        return { ok: false, codigo: "PERSONA_NO_EXISTE", mensaje: "No existe persona_id" };
    } else {
      if (!email && !documento)
        return { ok: false, codigo: "FALTAN_DATOS", mensaje: "Enviá persona_id o email/documento" };

      persona = email
        ? await Persona.findOne({ where: { email }, transaction: t })
        : null;

      if (!persona && documento)
        persona = await Persona.findOne({ where: { documento }, transaction: t });

      if (!persona) {
        const nombre  = String(data.nombre ?? "").trim();
        const apellido = String(data.apellido ?? "").trim();
        if (!nombre || !apellido)
          return { ok: false, codigo: "FALTAN_DATOS_PERSONA", mensaje: "Si no existe persona, enviá nombre y apellido" };

        persona = await Persona.create(
          { nombre, apellido, email: email || null, documento: documento ? String(documento) : null },
          { transaction: t }
        );
      }
    }

    const yaUsuario = await Usuario.findOne({ where: { persona_id: persona.id }, transaction: t });
    if (yaUsuario)
      return { ok: false, codigo: "YA_TIENE_USUARIO", mensaje: "Esa persona ya tiene un usuario" };

    const hash = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create(
      { persona_id: persona.id, contrasena: hash, activo: true, actualizado_en: new Date() },
      { transaction: t }
    );

    const rolesDb = await Rol.findAll({ where: { id: roles }, transaction: t });
    if (rolesDb.length !== roles.length)
      return { ok: false, codigo: "ROL_INVALIDO", mensaje: "Alguno de los roles enviados no existe" };

    for (const rolId of roles) {
      await UsuarioRol.create(
        { usuario_id: usuario.id, rol_id: rolId, actualizado_en: new Date() },
        { transaction: t }
      );
    }

    return {
      ok: true,
      codigo: "USUARIO_CREADO",
      mensaje: "Usuario creado correctamente",
      usuario: {
        usuario_id:  usuario.id,
        persona_id:  persona.id,
        email:          persona.email,
        nombre:         persona.nombre,
        apellido:       persona.apellido,
        roles:          rolesDb.map((r) => ({ id: r.id, codigo: r.codigo })),
      },
    };
  });
}

function parseBool(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).toLowerCase().trim();
  if (["true", "1", "yes", "si"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  return null;
}

function parseIntSafe(v, def) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : def;
}

export async function listarUsuarios({ buscar, rol, activo, page, limit }) {
  const pagina = Math.max(1, parseIntSafe(page, 1));
  const limite = Math.min(100, Math.max(1, parseIntSafe(limit, 20)));
  const offset = (pagina - 1) * limite;

  const activoBool  = parseBool(activo);
  const q           = String(buscar ?? "").trim();
  const wherePersona = q
    ? {
        [Op.or]: [
          { nombre:   { [Op.iLike]: `%${q}%` } },
          { apellido: { [Op.iLike]: `%${q}%` } },
          { email:    { [Op.iLike]: `%${q}%` } },
        ],
      }
    : undefined;

  const whereUsuario = {};
  if (activoBool !== null) whereUsuario.activo = activoBool;

  const rolCod    = String(rol ?? "").trim().toLowerCase();
  const filtrarRol = rolCod ? { codigo: rolCod } : null;

  const includeRoles = {
    model:    Rol,
    as:       "roles",
    attributes: ["id", "codigo", "descripcion"],
    through:  { attributes: [] },
    required: !!filtrarRol,
    ...(filtrarRol ? { where: filtrarRol } : {}),
  };

  const { rows, count } = await Usuario.findAndCountAll({
    where: whereUsuario,
    attributes: ["id", "persona_id", "activo", "ultimo_login", "actualizado_en"],
    include: [
      {
        model: Persona,
        as: "persona",
        attributes: ["id", "nombre", "apellido", "email", "documento"],
        required: true,
        ...(wherePersona ? { where: wherePersona } : {}),
      },
      includeRoles,
    ],
    order: [["id", "DESC"]],
    limit: limite,
    offset,
    distinct: true,
  });

  return {
    ok: true,
    page: pagina,
    limit: limite,
    total: count,
    items: rows.map((u) => ({
      usuario_id:  u.id,
      activo:      u.activo,
      ultimo_login: u.ultimo_login,
      persona: {
        persona_id: u.persona?.id,
        nombre:     u.persona?.nombre,
        apellido:   u.persona?.apellido,
        email:      u.persona?.email,
        documento:  u.persona?.documento,
      },
      roles: (u.roles ?? []).map((r) => ({
        id:          r.id,
        codigo:      r.codigo,
        descripcion: r.descripcion,
      })),
    })),
  };
}
