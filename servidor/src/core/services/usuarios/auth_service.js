import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { UniqueConstraintError } from "sequelize";
import { duracionSesionSegundos, passwordVersion, tipoSesion } from "../common/auth_tokens.js";
import { clasificarIdentificador } from "../common/nombre_usuario.js";
import { verificarCredencialGoogle } from "../common/google_auth.js";
import { ErrorApp } from "../common/errores.js";
import { clientConfig } from "../../../../../proyecto/client_config.js";
import { permisosConfig } from "../../../../../core/permisos_config.js";
import { env } from "../../configuracion_servidor/env.js";
import { sequelize } from "../../database/sequelize.js";
import { Persona, Usuario, UsuarioRol, Rol } from "../../models/index.js";

// La entrada llega validada por auth_esquemas.js. Acá quedan las reglas que necesitan la base.
// Los errores se lanzan como ErrorApp y los responde el manejador central (app.js).

const credencialesInvalidas = () => new ErrorApp("CREDENCIALES_INVALIDAS", "Email, usuario o contraseña incorrectos", 401);
const googleInvalido = () => new ErrorApp("GOOGLE_INVALIDO", "No pudimos verificar tu cuenta de Google. Intentá de nuevo.", 401);
const nombreUsuarioDuplicado = () => new ErrorApp("NOMBRE_USUARIO_DUPLICADO", "Ese usuario ya está en uso. Probá con otro.", 400);
const registroDeshabilitado = () => new ErrorApp("REGISTRO_DESHABILITADO", "El registro público no está habilitado.", 403);

const cuentaBloqueada = (usuario) => !usuario || usuario.eliminado_en || usuario.activo === false;

function crearToken({ usuario_id, persona_id, roles, contrasena }) {
  if (!env.JWT_SECRET) throw new Error("Falta JWT_SECRET en .env");
  const sesion = tipoSesion(roles);
  return jwt.sign({ sub: String(usuario_id), persona_id, roles, sesion, pv: passwordVersion(contrasena) }, env.JWT_SECRET, {
    expiresIn: duracionSesionSegundos(sesion),
  });
}

/** Busca persona y usuario por email o por nombre de usuario (USU-01). */
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
  const { persona, usuario } = await buscarCuenta(identificador);
  // USU-04: sin cuenta, sin usuario, dada de baja o desactivada responde igual que una contraseña
  // incorrecta: nadie puede averiguar si una cuenta existe.
  if (!persona || cuentaBloqueada(usuario)) throw credencialesInvalidas();
  if (!await bcrypt.compare(password, usuario.contrasena ?? "")) throw credencialesInvalidas();
  return abrirSesion({ persona, usuario });
}

/** Token y datos de la sesión; compartido por el login con contraseña y el de Google. */
async function abrirSesion({ persona, usuario }) {
  const roles = (await usuario.getRoles({ attributes: ["codigo"], joinTableAttributes: [] })).map((r) => r.codigo);
  const token = crearToken({ usuario_id: usuario.id, persona_id: persona.id, roles, contrasena: usuario.contrasena });
  await usuario.update({ ultimo_login: new Date() });

  return {
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
 * Auto-registro público: siempre con el rol "cliente" (USU-14). Distinto de crearStaff
 * (admin_staff_service.js), que es para el personal cargado desde el panel.
 */
export async function registrarCliente({ nombre, apellido, email, password, nombre_usuario }) {
  if (!clientConfig.auth.publicRegistration) throw registroDeshabilitado();
  if (await Persona.findOne({ where: { email } })) {
    throw new ErrorApp("EMAIL_DUPLICADO", "Ya existe una cuenta con ese email", 400);
  }
  if (nombre_usuario && await Usuario.findOne({ where: { nombre_usuario } })) throw nombreUsuarioDuplicado();

  try {
    return await crearCliente({ nombre, apellido, email, password, nombre_usuario });
  } catch (error) {
    // Dos registros simultáneos con el mismo usuario: la base frena el segundo. Se mira el nombre
    // de la restricción porque `error.fields` queda vacío si Postgres responde en español.
    if (error instanceof UniqueConstraintError && error.parent?.constraint?.includes("nombre_usuario")) throw nombreUsuarioDuplicado();
    throw error;
  }
}

/**
 * "Continuar con Google": la cuenta se reconoce por su google_id; la primera vez se vincula a la
 * cuenta con ese email (solo si Google lo verificó) o se crea un cliente nuevo sin contraseña
 * usable (puede crearla con "Olvidé mi contraseña"). `verificar` se reemplaza solo en los tests.
 */
export async function loginConGoogle({ credencial }, { verificar = verificarCredencialGoogle } = {}) {
  if (!env.GOOGLE_CLIENT_ID) throw new ErrorApp("GOOGLE_NO_CONFIGURADO", "El ingreso con Google no está habilitado.", 503);

  let datos;
  try { datos = await verificar(credencial); } catch { throw googleInvalido(); }
  if (!datos?.google_id) throw googleInvalido();
  // USU-21: sin esto, alguien podría crear una cuenta de Google con un email ajeno y entrar a esa cuenta.
  if (!datos.email_verificado || !datos.email) {
    throw new ErrorApp("GOOGLE_EMAIL_NO_VERIFICADO", "Tu cuenta de Google no tiene el email verificado. Ingresá con email y contraseña.", 401);
  }
  const email = String(datos.email).trim().toLowerCase();

  let usuario = await Usuario.findOne({ where: { google_id: datos.google_id } });
  let persona = usuario ? await Persona.findByPk(usuario.persona_id) : null;

  if (!usuario) {
    persona = await Persona.findOne({ where: { email } });
    if (persona) {
      // USU-22: se vincula la cuenta existente, salvo que ya tenga otro Google.
      usuario = await Usuario.findOne({ where: { persona_id: persona.id } });
      if (!usuario) throw googleInvalido();
      if (usuario.google_id) throw new ErrorApp("GOOGLE_OTRA_CUENTA", "Este email ya está vinculado a otra cuenta de Google.", 401);
      await usuario.update({ google_id: datos.google_id });
    } else {
      if (!clientConfig.auth.publicRegistration) throw registroDeshabilitado();
      try {
        await crearCliente({
          nombre: (String(datos.nombre ?? "").trim() || email.split("@")[0]).slice(0, 100),
          apellido: String(datos.apellido ?? "").trim().slice(0, 100),
          email,
          password: randomBytes(32).toString("hex"),
          nombre_usuario: null,
          googleId: datos.google_id,
        });
      } catch (error) {
        // Doble clic en el botón: otra petición creó la cuenta un instante antes.
        if (!(error instanceof UniqueConstraintError)) throw error;
      }
      usuario = await Usuario.findOne({ where: { google_id: datos.google_id } });
      if (!usuario) throw googleInvalido();
      persona = await Persona.findByPk(usuario.persona_id);
    }
  }

  if (cuentaBloqueada(usuario)) throw googleInvalido();
  return abrirSesion({ persona, usuario });
}

// El registro no pide documento: queda vacío hasta que haga falta (ej. para facturar).
async function crearCliente({ nombre, apellido, email, password, nombre_usuario, googleId = null }) {
  return sequelize.transaction(async (t) => {
    const rolCliente = await Rol.findOne({ where: { codigo: permisosConfig.rolAlRegistrarse }, transaction: t });
    if (!rolCliente) throw new Error(`Falta configurar el rol ${permisosConfig.rolAlRegistrarse}`);

    const persona = await Persona.create({ nombre, apellido, email }, { transaction: t });
    const usuario = await Usuario.create({
      persona_id: persona.id,
      contrasena: await bcrypt.hash(password, 10),
      activo: true,
      nombre_usuario,
      google_id: googleId,
    }, { transaction: t });
    await UsuarioRol.create({ usuario_id: usuario.id, rol_id: rolCliente.id }, { transaction: t });

    return { usuario_id: usuario.id };
  });
}

export async function obtenerPerfil(persona_id) {
  const persona = await Persona.findByPk(persona_id, { attributes: ["nombre", "apellido", "email"] });
  return {
    nombre: persona?.nombre ?? null,
    apellido: persona?.apellido ?? null,
    email: persona?.email ?? null,
  };
}
