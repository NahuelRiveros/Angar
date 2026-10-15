import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { passwordVersion } from "../common/auth_tokens.js";
import { clasificarIdentificador, esNombreUsuarioValido, normalizarNombreUsuario } from "../common/nombre_usuario.js";
import { verificarCredencialGoogle } from "../common/google_auth.js";
import { clientConfig } from "../../../../client_config.js";
import jwt from "jsonwebtoken";
import { UniqueConstraintError } from "sequelize";
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

  return await abrirSesion({ persona, usuario });
}

/** Token y datos de la sesión; compartido por el login con contraseña y el de Google. */
async function abrirSesion({ persona, usuario }) {
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
const NOMBRE_USUARIO_DUPLICADO = { ok: false, codigo: "NOMBRE_USUARIO_DUPLICADO", mensaje: "Ese usuario ya está en uso. Probá con otro." };

export async function registrarCliente({ nombre, apellido, email, password, nombre_usuario }) {
  const nombreN   = safeStr(nombre);
  const apellidoN = safeStr(apellido);
  const emailN    = safeStr(email).toLowerCase();
  const pass      = String(password ?? "");
  // Opcional: si queda vacío, la cuenta ingresa solo con el email.
  const usuarioN  = normalizarNombreUsuario(nombre_usuario) || null;
  if (!clientConfig.auth.publicRegistration) return { ok: false, codigo: "REGISTRO_DESHABILITADO", mensaje: "El registro público no está habilitado." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailN)) return { ok: false, codigo: "EMAIL_INVALIDO", mensaje: "Ingresá un email válido" };

  if (!nombreN || !apellidoN || !emailN || !pass) {
    return { ok: false, codigo: "FALTAN_DATOS", mensaje: "Requiere: nombre, apellido, email y password" };
  }
  if (pass.length < clientConfig.auth.passwordMinLength || Buffer.byteLength(pass, "utf8") > clientConfig.auth.passwordMaxLength) {
    return { ok: false, codigo: "PASSWORD_INVALIDA", mensaje: `La contraseña debe tener entre ${clientConfig.auth.passwordMinLength} caracteres y ${clientConfig.auth.passwordMaxLength} bytes` };
  }

  if (usuarioN && !esNombreUsuarioValido(usuarioN)) {
    return { ok: false, codigo: "NOMBRE_USUARIO_INVALIDO", mensaje: "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo" };
  }

  const yaExiste = await Persona.findOne({ where: { email: emailN } });
  if (yaExiste) {
    return { ok: false, codigo: "EMAIL_DUPLICADO", mensaje: "Ya existe una cuenta con ese email" };
  }
  if (usuarioN && await Usuario.findOne({ where: { nombre_usuario: usuarioN } })) return NOMBRE_USUARIO_DUPLICADO;

  try {
    return await crearCliente({ nombreN, apellidoN, emailN, pass, usuarioN });
  } catch (error) {
    // Dos registros simultáneos con el mismo usuario: la base frena el segundo.
    // Se mira el nombre de la restricción: `error.fields` queda vacío si Postgres responde en español.
    if (error instanceof UniqueConstraintError && error.parent?.constraint?.includes("nombre_usuario")) return NOMBRE_USUARIO_DUPLICADO;
    throw error;
  }
}

const GOOGLE_INVALIDO = { ok: false, codigo: "GOOGLE_INVALIDO", mensaje: "No pudimos verificar tu cuenta de Google. Intentá de nuevo." };

/**
 * "Continuar con Google": la misma cuenta se reconoce por su google_id; si es la
 * primera vez, se vincula a la cuenta con ese email (solo si Google lo verificó)
 * o se crea un cliente nuevo, sin contraseña usable (puede crearla con
 * "Olvidé mi contraseña"). `verificar` se reemplaza solo en los tests.
 */
export async function loginConGoogle({ credencial }, { verificar = verificarCredencialGoogle } = {}) {
  if (!env.GOOGLE_CLIENT_ID) return { ok: false, codigo: "GOOGLE_NO_CONFIGURADO", mensaje: "El ingreso con Google no está habilitado." };

  let datos;
  try { datos = await verificar(credencial); } catch { return GOOGLE_INVALIDO; }
  if (!datos?.google_id) return GOOGLE_INVALIDO;
  // Sin esto, alguien podría crear una cuenta de Google con un email ajeno y entrar a esa cuenta.
  if (!datos.email_verificado || !datos.email) {
    return { ok: false, codigo: "GOOGLE_EMAIL_NO_VERIFICADO", mensaje: "Tu cuenta de Google no tiene el email verificado. Ingresá con email y contraseña." };
  }
  const email = safeStr(datos.email).toLowerCase();

  let usuario = await Usuario.findOne({ where: { google_id: datos.google_id } });
  let persona = usuario ? await Persona.findByPk(usuario.persona_id) : null;

  if (!usuario) {
    persona = await Persona.findOne({ where: { email } });
    if (persona) {
      usuario = await Usuario.findOne({ where: { persona_id: persona.id } });
      if (!usuario) return { ok: false, codigo: "SIN_USUARIO", mensaje: "La persona no tiene usuario habilitado" };
      if (usuario.google_id) return { ok: false, codigo: "GOOGLE_OTRA_CUENTA", mensaje: "Este email ya está vinculado a otra cuenta de Google." };
      await usuario.update({ google_id: datos.google_id });
    } else {
      if (!clientConfig.auth.publicRegistration) return { ok: false, codigo: "REGISTRO_DESHABILITADO", mensaje: "El registro público no está habilitado." };
      try {
        await crearCliente({
          nombreN: (safeStr(datos.nombre) || email.split("@")[0]).slice(0, 100),
          apellidoN: safeStr(datos.apellido).slice(0, 100),
          emailN: email,
          pass: randomBytes(32).toString("hex"),
          usuarioN: null,
          googleId: datos.google_id,
        });
      } catch (error) {
        // Doble clic en el botón: otra petición creó la cuenta un instante antes.
        if (!(error instanceof UniqueConstraintError)) throw error;
      }
      usuario = await Usuario.findOne({ where: { google_id: datos.google_id } });
      if (!usuario) return GOOGLE_INVALIDO;
      persona = await Persona.findByPk(usuario.persona_id);
    }
  }

  if (usuario.eliminado_en) return GOOGLE_INVALIDO;
  if (usuario.activo === false) return { ok: false, codigo: "USUARIO_INACTIVO", mensaje: "Usuario inactivo" };
  return await abrirSesion({ persona, usuario });
}

async function crearCliente({ nombreN, apellidoN, emailN, pass, usuarioN, googleId = null }) {
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
      { persona_id: persona.id, contrasena: hash, activo: true, nombre_usuario: usuarioN, google_id: googleId },
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

