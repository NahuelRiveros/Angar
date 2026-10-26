import "dotenv/config.js";
import { deploymentConfig } from "../../../deployment_config.js";

// El panel de Render guarda el valor tal cual: si se pega con comillas o espacios
// ("https://…"), quedarían como parte del texto. dotenv ya los quita en el .env local.
export const limpiarValor = (valor) =>
  typeof valor === "string" ? valor.trim().replace(/^(["'])(.*)\1$/, "$2").trim() : valor;

// Se limpia process.env (no solo `env`) porque sequelize.js lee DB_SCHEMA directo.
for (const [clave, valor] of Object.entries(process.env)) process.env[clave] = limpiarValor(valor);

const esProduccion = process.env.NODE_ENV === "production";

/**
 * Verifica variables críticas en producción.
 * En desarrollo devuelve el valor por defecto si no está seteada.
 */
function requerirEnProd(nombre, defaultDev = "") {
  const valor = process.env[nombre];

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

export const env = {
  PORT:     process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",

  // ── Base de datos (Supabase en producción, Postgres local en dev) ──
  // BD_URL: connection string completo; si queda vacío se usan las DB_* sueltas.
  BD_URL:       process.env.BD_URL || "",
  DB_HOST:      process.env.DB_HOST      || "localhost",
  DB_PORT:      Number(process.env.DB_PORT || 5432),
  DB_NAME:      process.env.DB_NAME      || "dynamicgym",
  DB_USER:      process.env.DB_USER      || "postgres",
  DB_PASS:      process.env.DB_PASS      || "",          // ← NUNCA hardcodear
  DB_SSL:       String(process.env.DB_SSL || "").toLowerCase() === "true",

  // ── Seguridad ──────────────────────────────────────────────────
  // En producción es OBLIGATORIO. En dev usa el valor del .env local.
  JWT_SECRET:   requerirEnProd("JWT_SECRET", "DEV_SECRET_SOLO_LOCAL_NO_USAR_EN_PROD"),

  // ── CORS ───────────────────────────────────────────────────────
  // Ejemplo: "https://mi-tienda.vercel.app"
  // Dejarlo vacío = permite todos los orígenes (OK si el front vive en el mismo servidor)
  CORS_ORIGIN:  process.env.CORS_ORIGIN || "",

  // ── Seed secret ────────────────────────────────────────────────
  SEED_SECRET:  process.env.SEED_SECRET || "",

  // ── MercadoPago (suscripción al software) ──────────────────────
  // Obtenelo en https://www.mercadopago.com.ar/developers/panel/app
  // Sandbox: usa el token de TEST para pruebas, PROD para producción.
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || "",

  // URL COMPLETA del backend en Render (para que MP envíe el webhook).
  // Ejemplo: "https://distribucg.onrender.com"
  // En local: dejar vacío (el webhook no llegará, pero el flujo funciona).
  RENDER_APP_URL: process.env.RENDER_APP_URL || "",

  // URL COMPLETA del frontend en Vercel (para la redirección post-pago de MP).
  // Ejemplo: "https://distribu-cg.vercel.app"
  VERCEL_FRONTEND_URL: process.env.VERCEL_FRONTEND_URL || (esProduccion ? deploymentConfig.frontendUrl : "http://localhost:5173"),

  // ── Plan del software ──────────────────────────────────────────
  // Precio mensual en ARS (sin centavos). Ej: 10000 = $10.000
  SOFTWARE_PRECIO: Number(process.env.SOFTWARE_PRECIO || 0),
  // Nombre visible del cliente / gimnasio en la factura MP.
  SOFTWARE_CLIENTE: process.env.SOFTWARE_CLIENTE || "DistribuCG",

  // ── Email por API de Brevo (producción en Render) ──────────────
  // Con CLAVE_API_BREVO cargada se usa Brevo y se ignora el SMTP.
  // CORREO_REMITENTE tiene que estar verificado como remitente en Brevo.
  CLAVE_API_BREVO:  process.env.CLAVE_API_BREVO  || "",
  CORREO_REMITENTE: process.env.CORREO_REMITENTE || "",
  NOMBRE_REMITENTE: process.env.NOMBRE_REMITENTE || "",

  // ── Facturación electrónica ARCA (preparado, todavía sin uso) ──
  // Opcionales: vacías, la facturación queda apagada y el servidor arranca igual.
  // Ver configuracion_servidor/arca.js y docs/facturacion-arca.md.
  ARCA_CUIT_EMISOR:       process.env.ARCA_CUIT_EMISOR       || "",
  ARCA_PUNTO_VENTA:       process.env.ARCA_PUNTO_VENTA       || "",
  ARCA_CERTIFICADO_PEM:   process.env.ARCA_CERTIFICADO_PEM   || "",
  ARCA_CLAVE_PRIVADA_PEM: process.env.ARCA_CLAVE_PRIVADA_PEM || "",
  ARCA_PRODUCCION:        String(process.env.ARCA_PRODUCCION || "").toLowerCase() === "true",

  // ── Email / SMTP (desarrollo local) ────────────────────────────
  SMTP_HOST:   process.env.SMTP_HOST   || "smtp.gmail.com",
  SMTP_PORT:   Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
  SMTP_USER:   process.env.SMTP_USER   || "",
  SMTP_PASS:   process.env.SMTP_PASS   || "",
  SMTP_FROM:   process.env.SMTP_FROM   || "",

  // ── Cloudinary (subida de imágenes: home, marcas, fotos de producto) ─────
  // Obligatorio en producción — a diferencia de MP/SMTP (que degradan sin
  // romper nada visible), sin esto CUALQUIER subida de imagen falla en
  // tiempo de ejecución con un error de auth de Cloudinary poco claro. Mejor
  // que el server no arranque en Render si falta, a que falle recién cuando
  // alguien intente subir una foto.
  CLOUDINARY_CLOUD_NAME: requerirEnProd("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY:    requerirEnProd("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: requerirEnProd("CLOUDINARY_API_SECRET"),

  // ── Google (botón "Continuar con Google") ───────────────────────
  // Client ID público de Google Cloud (el mismo que VITE_GOOGLE_CLIENT_ID).
  // Vacío = ingreso con Google deshabilitado. No se usa el client secret.
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",

  // ── Catálogo de demostración ─────────────────────────────────────
  // true = en cada arranque completa el catálogo del seed y pone precios inventados
  // (ver database/seed/catalogo_demo.js). Nunca se aplica en el esquema gc_dist.
  CATALOGO_DEMO_AL_INICIAR: String(process.env.CATALOGO_DEMO_AL_INICIAR || "").toLowerCase() === "true",

  // ── Seed: usuario super admin ────────────────────────────────────
  SUPERADMIN_NOMBRE:   process.env.SUPERADMIN_NOMBRE   || "",
  SUPERADMIN_APELLIDO: process.env.SUPERADMIN_APELLIDO || "",
  SUPERADMIN_DNI:       process.env.SUPERADMIN_DNI       || "",
  SUPERADMIN_EMAIL:     process.env.SUPERADMIN_EMAIL     || "",
  SUPERADMIN_PASSWORD:  process.env.SUPERADMIN_PASSWORD  || "",
};
