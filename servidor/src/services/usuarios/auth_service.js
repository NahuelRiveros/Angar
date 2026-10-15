import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { passwordVersion } from "../common/auth_tokens.js";
import { clasificarIdentificador } from "../common/nombre_usuario.js";
import { clientConfig } from "../../../../client_config.js";
import jwt from "jsonwebtoken";
import { env } from "../../configuracion_servidor/env.js";
import { sequelize } from "../../database/sequelize.js";
import { Persona, Usuario, UsuarioRol, Rol, TipoDocumento } from "../../models/index.js";

function safeStr(v) {
  return String(v ?? "").trim();
}

function crearToken({ usuario_id, persona_id, roles, contrasena }) {
  const secret = env.JWT_SECRET;
  if (!secret) throw new Error("Falta JWT_SECRET en .env");

  return jwt.sign({ sub: String(usuario_id), persona_id, roles, pv: passwordVersion(contrasena) }, secret, {
    expiresIn: env.JWT_EXPIRES_IN ?? "24h",
  });
}

const CREDENCIALES_INVALIDAS = { ok: false, codigo: "CREDENCIALES_INVALIDAS", mensaje: "Email, usuario o contraseña incorrectos" };

/** Busca persona y usuario por email o por nombre de usuario. */
async function buscarCuenta(identificador) {
  const { tipo, valor, valido } = clasificarIdentificador(identificador);
  if (tipo === "email") {
    const persona = await Persona.findOne({ where: { email: valor } });
    const usuario = persona ? await Usuario.findOne({ where: { persona_id: persona.id } }) : null;
    return { persona, usuario };
  }
  if (!valido) return { persona: null, usuario: null };
  const usuario = await Usuario.findOne({ where: { nombre_usuario: valor } });
  const persona = usuario ? await Persona.findByPk(usuario.persona_id) : null;
  return { persona, usuario };
}

export async function login({ identificador, password }) {
  const pass = String(password ?? "");

  const { persona, usuario } = await buscarCuenta(identificador);
  if (!persona) return CREDENCIALES_INVALIDAS;

  if (!usuario) {
    return { ok: false, codigo: "SIN_USUARIO", mensaje: "La persona no tiene usuario habilitado" };
  }

  if (usuario.eliminado_en) return CREDENCIALES_INVALIDAS;

  if (usuario.activo === false) {
    return { ok: false, codigo: "USUARIO_INACTIVO", mensaje: "Usuario inactivo" };
  }

  const valido = await bcrypt.compare(pass, usuario.contrasena ?? "");
  if (!valido) return CREDENCIALES_INVALIDAS;

  const rolesRows = await usuario.getRoles({
    attributes: ["codigo"],
    joinTableAttributes: [],
  });

  const roles = rolesRows.map((r) => r.codigo);

  const token = crearToken({ usuario_id: usuario.id, persona_id: persona.id, roles, contrasena: usuario.contrasena });

  await usuario.update({ ultimo_login: new Date() });

  return {
    ok: true,
    codigo: "LOGIN_OK",
    mensaje: "Login correcto",
    token,
    usuario: {
      usuario_id: usuario.id,
      persona_id: persona.id,
      nombre: persona.nombre,
      apellido: persona.apellido,
      email: persona.email,
      nombre_usuario: usuario.nombre_usuario,
      roles,
    },
  };
}

/**
 * Auto-registro público (POST /auth/register) — siempre asigna el rol fijo
 * "cliente" (ver seed_rbac.js). Distinto de crearStaff (admin_staff_service.js),
 * que es para personal interno cargado por un admin.
 *
 * `documento` de Persona es NOT NULL + unique y el formulario de registro no
 * lo pide (no tiene sentido pedir DNI para un cliente mayorista) — se genera
 * un valor sintético único, no es un documento real.
 */
export async function registrarCliente({ nombre, apellido, email, password }) {
  const nombreN   = safeStr(nombre);
  const apellidoN = safeStr(apellido);
  const emailN    = safeStr(email).toLowerCase();
  const pass      = String(password ?? "");
  if (!clientConfig.auth.publicRegistration) return { ok: false, codigo: "REGISTRO_DESHABILITADO", mensaje: "El registro público no está habilitado." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailN)) return { ok: false, codigo: "EMAIL_INVALIDO", mensaje: "Ingresá un email válido" };

  if (!nombreN || !apellidoN || !emailN || !pass) {
    return { ok: false, codigo: "FALTAN_DATOS", mensaje: "Requiere: nombre, apellido, email y password" };
  }
  if (pass.length < clientConfig.auth.passwordMinLength || Buffer.byteLength(pass, "utf8") > clientConfig.auth.passwordMaxLength) {
    return { ok: false, codigo: "PASSWORD_INVALIDA", mensaje: `La contraseña debe tener entre ${clientConfig.auth.passwordMinLength} caracteres y ${clientConfig.auth.passwordMaxLength} bytes` };
  }

  const yaExiste = await Persona.findOne({ where: { email: emailN } });
  if (yaExiste) {
    return { ok: false, codigo: "EMAIL_DUPLICADO", mensaje: "Ya existe una cuenta con ese email" };
  }

  return await sequelize.transaction(async (t) => {
    const tipoDocumentoDni = await TipoDocumento.findOne({ where: { descripcion: "DNI" }, transaction: t });
    const documentoSintetico = `REG${randomBytes(8).toString("hex")}`;

    const persona = await Persona.create({
      nombre: nombreN, apellido: apellidoN, email: emailN,
      documento: documentoSintetico,
      tipo_documento_id: tipoDocumentoDni?.id ?? null,
    }, { transaction: t });

    const hash = await bcrypt.hash(pass, 10);
    const usuario = await Usuario.create(
      { persona_id: persona.id, contrasena: hash, activo: true },
      { transaction: t }
    );

    const rolCliente = await Rol.findOne({ where: { codigo: "cliente" }, transaction: t });
    if (!rolCliente) throw new Error("Falta configurar el rol cliente");
    if (rolCliente) {
      await UsuarioRol.create({ usuario_id: usuario.id, rol_id: rolCliente.id }, { transaction: t });
    }

    return { ok: true, codigo: "REGISTRO_OK", mensaje: "Cuenta creada correctamente", usuario_id: usuario.id };
  });
}

export async function obtenerPerfil(persona_id) {
  const persona = await Persona.findByPk(persona_id, {
    attributes: ["nombre", "apellido", "email"],
  });

  return {
    ok: true,
    persona: {
      nombre:   persona?.nombre   ?? null,
      apellido: persona?.apellido ?? null,
      email:    persona?.email    ?? null,
    },
  };
}

