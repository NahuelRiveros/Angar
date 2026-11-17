import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { deploymentConfig } from "../../../deployment_config.js";

// En tu PC solo se lee servidor/.env.local (PostgreSQL local): así nunca se toca producción por error.
// En Render las variables vienen de su panel. dotenv no pisa lo que ya está cargado.
dotenv.config({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)), quiet: true });

// El panel de Render guarda el valor tal cual: si se pega con comillas o espacios
// ("https://…"), quedarían como parte del texto. dotenv ya los quita en el .env local.
export const limpiarValor = (valor) =>
  typeof valor === "string" ? valor.trim().replace(/^(["'])(.*)\1$/, "$2").trim() : valor;

// Se limpia process.env (no solo `env`) porque sequelize.js lee BD_ESQUEMA directo.
for (const [clave, valor] of Object.entries(process.env)) process.env[clave] = limpiarValor(valor);

const esProduccion = process.env.NODE_ENV === "production";

/**
 * El nombre nuevo (claro, en español) o, si falta, el anterior: un Render que todavía tiene los
 * nombres viejos sigue andando. Los nombres viejos los marca scripts/verificar_env.mjs.
 */
const leer = (nuevo, anterior) => process.env[nuevo] || (anterior && process.env[anterior]) || "";

/**
 * Verifica variables críticas en producción.
 * En desarrollo devuelve el valor por defecto si no está seteada.
 */
function requerirEnProd(nombre, anterior, defaultDev = "") {
  const valor = leer(nombre, anterior);

  if (!valor) {
    if (esProduccion) {
      console.error(`\n❌  Variable de entorno REQUERIDA faltante: "${nombre}"`);
      console.error(`    Configurala en el panel de Render → Environment.\n`);
      process.exit(1);
    }
    return defaultDev;
  }

  return valor;
}

const urlBaseDatos = leer("BD_URL_SUPABASE", "BD_URL");
// BD_SSL y DB_SSL son nombres anteriores: solo hacen falta para forzar el SSL a mano.
const sslManual = leer("BD_SSL", "DB_SSL");

export const env = {
  PORT:     process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",

  // ── Base de datos (Supabase en producción, Postgres local en tu PC) ──
  // BD_URL_SUPABASE: connection string completo; si queda vacío se usan las DB_* sueltas (tu PC).
  BD_URL:       urlBaseDatos,
  DB_HOST:      process.env.DB_HOST      || "localhost",
  DB_PORT:      Number(process.env.DB_PORT || 5432),
  DB_NAME:      process.env.DB_NAME      || "mipadel",
  DB_USER:      process.env.DB_USER      || "postgres",
  DB_PASS:      process.env.DB_PASS      || "",          // ← NUNCA hardcodear
  // Con base remota siempre SSL (Supabase lo pide); en tu PC, sin SSL.
  DB_SSL:       sslManual ? sslManual.toLowerCase() === "true" : Boolean(urlBaseDatos),

  // ── Seguridad ──────────────────────────────────────────────────
  // En producción es OBLIGATORIO. En dev usa el valor del .env.local.
  JWT_SECRET:   requerirEnProd("CLAVE_SESIONES", "JWT_SECRET", "DEV_SECRET_SOLO_LOCAL_NO_USAR_EN_PROD"),

  // ── CORS ───────────────────────────────────────────────────────
  // Opcional: en producción, si está vacío, se permite solo URL_FRONTEND_VERCEL (app.js).
  // Sirve para sumar otros orígenes, separados por coma (ej. un dominio propio).
  CORS_ORIGIN:  process.env.CORS_ORIGIN || "",

  // ── Seed secret ────────────────────────────────────────────────
  SEED_SECRET:  process.env.SEED_SECRET || "",

  // ── MercadoPago (suscripción de los organizadores) ─────────────
  // Obtenelo en https://www.mercadopago.com.ar/developers/panel/app
  // Sandbox: usa el token de TEST para pruebas, PROD para producción.
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || "",

  // URL COMPLETA del backend en Render (para que MP envíe el webhook).
  // Ejemplo: "https://mipadel.onrender.com" (EJEMPLO)
  // En local: dejar vacío (el webhook no llegará, pero el flujo funciona).
  RENDER_APP_URL: leer("URL_API_RENDER", "RENDER_APP_URL"),

  // URL COMPLETA del frontend en Vercel: links de los correos, vuelta de MP y CORS.
  // Ejemplo: "https://mipadel.vercel.app" (EJEMPLO)
  VERCEL_FRONTEND_URL: leer("URL_FRONTEND_VERCEL", "VERCEL_FRONTEND_URL") || (esProduccion ? deploymentConfig.frontendUrl : "http://localhost:5173"),

  // ── Plan de los organizadores ──────────────────────────────────
  // Precio de 30 días en ARS, sin centavos. 0 o vacío = pago con MercadoPago deshabilitado.
  PRECIO_SUSCRIPCION_MENSUAL: Number(process.env.PRECIO_SUSCRIPCION_MENSUAL || 0),

  // ── Email por API de Brevo (producción en Render) ──────────────
  // Con CLAVE_API_BREVO cargada se usa Brevo y se ignora el SMTP.
  // CORREO_REMITENTE tiene que estar verificado como remitente en Brevo.
  CLAVE_API_BREVO:  process.env.CLAVE_API_BREVO  || "",
  CORREO_REMITENTE: process.env.CORREO_REMITENTE || "",
  NOMBRE_REMITENTE: process.env.NOMBRE_REMITENTE || "",

  // ── Email / SMTP (opcional, solo para probar correos desde tu PC) ──
  SMTP_HOST:   process.env.SMTP_HOST   || "smtp.gmail.com",
  SMTP_PORT:   Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
  SMTP_USER:   process.env.SMTP_USER   || "",
  SMTP_PASS:   process.env.SMTP_PASS   || "",
  SMTP_FROM:   process.env.SMTP_FROM   || "",

  // ── Cloudinary (subida de imágenes: home, logos y fotos de torneos) ─────
  // Obligatorio en producción — a diferencia de MP/SMTP (que degradan sin
  // romper nada visible), sin esto CUALQUIER subida de imagen falla en
  // tiempo de ejecución con un error de auth de Cloudinary poco claro. Mejor
  // que el server no arranque en Render si falta, a que falle recién cuando
  // alguien intente subir una foto.
  CLOUDINARY_CLOUD_NAME: requerirEnProd("CLOUDINARY_NOMBRE_CUENTA", "CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY:    requerirEnProd("CLOUDINARY_CLAVE_API", "CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: requerirEnProd("CLOUDINARY_SECRETO_API", "CLOUDINARY_API_SECRET"),

  // ── Google (botón "Continuar con Google") ───────────────────────
  // Client ID público de Google Cloud (el mismo que VITE_GOOGLE_ID_CLIENTE).
  // Vacío = ingreso con Google deshabilitado. No se usa el client secret.
  GOOGLE_CLIENT_ID: leer("GOOGLE_ID_CLIENTE", "GOOGLE_CLIENT_ID"),

  // ── Seed: usuario super admin (se crea una sola vez; ver seed_super_admin.js) ──
  // Solo usuario y contraseña: el email es siempre SUPERADMIN_EMAIL_FIJO, para recuperar el acceso.
  SUPERADMIN_USUARIO:    process.env.SUPERADMIN_USUARIO || "",
  SUPERADMIN_CONTRASENA: leer("SUPERADMIN_CONTRASENA", "SUPERADMIN_PASSWORD"),

  // ── Avisos por correo (nuevo organizador, inscripciones, comprobantes) ──
  // Van a SUPERADMIN_EMAIL_FIJO y al organizador de cada torneo. "no" los apaga (los tests y la demo lo hacen).
  AVISOS_POR_CORREO: String(process.env.AVISOS_POR_CORREO || "si").toLowerCase() !== "no",

  // ── Torneos demo ──────────────────────────────────────────────
  // "si": al arrancar (cada deploy) crea los torneos DEMO si todavía no existen. Vacío o "no": nada.
  DEMO_AL_INICIAR: ["si", "true"].includes(String(process.env.DEMO_AL_INICIAR || "").toLowerCase()),
};

/** El mismo en todos los proyectos: recupera el acceso del super admin y recibe los avisos del equipo. */
export const SUPERADMIN_EMAIL_FIJO = "nahuel42425@gmail.com";
