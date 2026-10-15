import express from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";
import { env, limpiarValor } from "./configuracion_servidor/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// frontend/dist — se usa solo en modo local (NODE_ENV !== "production")
const rutaFrontend = path.resolve(__dirname, "../../frontend/dist");

// ── CORS ────────────────────────────────────────────────────────────────────
// Orígenes permitidos explícitos. En local (sin CORS_ORIGIN) se permiten
// solo los orígenes de desarrollo conocidos.
// Vite toma el siguiente puerto libre (5173, 5174, 5175...) si el anterior
// ya está ocupado por otra instancia del dev server — se listan varios.
const CORS_DEV = [
  "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
  "http://localhost:3001", "http://localhost:4000",
];

// El navegador manda el origen sin "/" final ni comillas: se normaliza cada
// dirección para que un error al copiarla en Render no bloquee la tienda.
export function parsearOrigenes(valor) {
  return (valor ?? "")
    .split(",")
    .map((s) => limpiarValor(s).replace(/\/+$/, ""))
    .filter(Boolean);
}

const origenesConfigurados = parsearOrigenes(env.CORS_ORIGIN);
const corsOrigin = origenesConfigurados.length ? origenesConfigurados : CORS_DEV;

export function createApp() {
  const app = express();
  // A la vista en los logs de Render: si la tienda no puede usar la API, lo primero es mirar esto.
  if (env.NODE_ENV !== "test") console.log(`🌐 Orígenes permitidos (CORS_ORIGIN): ${corsOrigin.join(", ")}`);
  const rechazados = new Set();

  app.use(helmet());

  // Reduce respuestas JSON/estáticos hasta un 70% — va ANTES de rutas
  app.use(compression());

  // "combined" en prod guarda IP + User-Agent; "dev" es legible en consola
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (corsOrigin.includes(origin)) return callback(null, true);
      // Una vez por dirección: el navegador solo dice "CORS"; acá queda cuál fue y qué corregir.
      if (!rechazados.has(origin)) {
        rechazados.add(origin);
        console.warn(`⚠️  Pedido desde ${origin} rechazado: no está en CORS_ORIGIN (${corsOrigin.join(", ")}).`);
      }
      const error = new Error(`CORS: origen no permitido — ${origin}`);
      error.codigo = "CORS_NO_PERMITIDO";
      callback(error);
    },
    credentials: true,
  }));

  // ── API ──────────────────────────────────────────────────────────────────
  app.use("/api", routes);

  // ── Modo LOCAL: servir el frontend desde frontend/dist/ ──────────────────
  // En producción el frontend vive en Vercel — acá no hace falta.
  // En local el launcher puede hacer "Build frontend" y usar localhost:3001.
  if (env.NODE_ENV !== "production" && existsSync(rutaFrontend)) {
    app.use(express.static(rutaFrontend));

    // SPA fallback: cualquier ruta que no sea /api → index.html
    app.use((_req, res) => {
      res.sendFile(path.join(rutaFrontend, "index.html"));
    });

  } else {
    // ── Modo PRODUCCIÓN (Render): API pura ───────────────────────────────
    // El frontend está en Vercel, no servimos archivos estáticos.

    app.get("/", (_req, res) => {
      res.json({
        ok: true,
        nombre: "Dynamic Gym API",
        entorno: env.NODE_ENV,
        salud: "/api/health",
        frontend: "https://dynamic-gym.vercel.app",
      });
    });

    app.use((_req, res) => {
      res.status(404).json({
        ok: false,
        codigo: "NOT_FOUND",
        mensaje: "Ruta no encontrada. El API vive bajo /api/",
      });
    });
  }

  // ── Error handler global ─────────────────────────────────────────────────
  app.use((err, _req, res, _next) => {
    if (err?.type === "entity.parse.failed") {
      return res.status(400).json({
        ok: false,
        codigo: "JSON_INVALIDO",
        mensaje: "Body JSON inválido",
      });
    }
    if (err?.codigo === "CORS_NO_PERMITIDO") {
      return res.status(403).json({
        ok: false,
        codigo: err.codigo,
        mensaje: "Este sitio no tiene permiso para usar la API",
      });
    }
    console.error(err);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR",
      mensaje: "Error interno del servidor",
    });
  });

  return app;
}
