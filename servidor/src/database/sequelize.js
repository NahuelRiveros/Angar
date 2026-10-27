import { Sequelize } from "sequelize";
import { env } from "../configuracion_servidor/env.js";

// mipadel en producción, mipadel_test para pruebas. Solo minúsculas: el
// search_path de abajo va sin comillas y Postgres pasaría mayúsculas a minúsculas.
export const DB_SCHEMA = process.env.DB_SCHEMA || "mipadel_test";
if (!/^[a-z][a-z0-9_]*$/.test(DB_SCHEMA)) {
  throw new Error(`DB_SCHEMA inválido ("${DB_SCHEMA}"): usar solo minúsculas, números y _ (ej. mipadel)`);
}

// Neon pooler no soporta search_path como parámetro de startup.
// Se establece vía afterConnect para compatibilidad con pooler y conexión directa.
const dialectOptions = {
  ...(env.DB_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : {}),
};

// ── Pool de conexiones ────────────────────────────────────────────────────
// Evita abrir/cerrar la DB en cada request.
// En Render free tier el DB tiene límite de 25 conexiones → max: 5 es seguro.
// min: 0 porque Neon suspende el compute tras un rato inactivo: una conexión
// "min" que se mantiene abierta para siempre queda colgada (stale) del lado
// del pool sin que Sequelize se entere, y el primer request tras el
// autosuspend explota con 500 (funciona recién al reintentar/F5). Con min:0
// el pool descarta conexiones ociosas (idle: 10000) y abre una nueva por
// request cuando hace falta.
const poolConfig = {
  max: 5,
  min: 0,
  acquire: 30000,
  idle: 10000,
};

const baseConfig = {
  dialect: "postgres",
  logging: false,
  dialectOptions,
  pool: poolConfig,
  // Reintenta automáticamente si la conexión murió del lado de Neon
  // (autosuspend / idle timeout) en vez de devolver 500 al front.
  retry: {
    max: 3,
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /ConnectionTimedOutError/,
      /TimeoutError/,
      /Connection terminated unexpectedly/i,
      /terminating connection/i,
      /server closed the connection unexpectedly/i,
      /ECONNRESET/,
      /ETIMEDOUT/,
    ],
  },
};

// Sin esto, un host suelto en BD_URL rompe adentro de Sequelize con
// "Cannot read properties of null". El valor no se muestra: lleva la contraseña.
if (env.BD_URL && !/^postgres(ql)?:\/\/[^@\s]+@[^\s]+$/.test(env.BD_URL)) {
  throw new Error(
    "BD_URL tiene que ser la dirección COMPLETA de la base (postgresql://usuario:contraseña@host:5432/postgres), " +
    "no solo el host. En Supabase: Connect → Session pooler."
  );
}

export const sequelize = env.BD_URL
  ? new Sequelize(env.BD_URL, baseConfig)
  : new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
      ...baseConfig,
      host: env.DB_HOST,
      port: env.DB_PORT,
    });

sequelize.afterConnect(async (connection) => {
  await connection.query(`SET search_path TO ${DB_SCHEMA}, public`);
});

export async function conectarDB() {
  try {
    await sequelize.authenticate();
    await sequelize.query(`SET TIME ZONE 'America/Argentina/Cordoba'`);
    console.log("✅ Base de datos conectada");
  } catch (error) {
    console.error("❌ Error al conectar la base de datos:", error);
    throw error;
  }
}