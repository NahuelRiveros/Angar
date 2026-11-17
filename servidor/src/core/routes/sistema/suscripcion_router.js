/**
 * suscripcion_router.js
 *
 * Endpoints de suscripción al software DistribuCG.
 *
 * Rutas autenticadas (admin):
 *   GET  /api/suscripcion/estado          — estado actual + días restantes
 *   POST /api/suscripcion/crear-pago      — crea preferencia MP y devuelve URL
 *   GET  /api/suscripcion/pagos           — historial de pagos
 *
 * Rutas públicas:
 *   POST /api/suscripcion/webhook         — callback de MercadoPago
 *
 * Rutas protegidas por SEED_SECRET (solo Nahuel vía Postman):
 *   POST /api/suscripcion/setup           — crea tablas + suscripcion inicial
 *   POST /api/suscripcion/admin/extender  — agrega N días al vencimiento
 *   POST /api/suscripcion/admin/fijar     — fija una fecha de vencimiento exacta
 *   GET  /api/suscripcion/admin/estado    — lee estado sin necesitar login
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth_middleware.js";
import {
  setupController,
  estadoController,
  crearPagoController,
  webhookController,
  pagosController,
  superEstadoController,
  superExtenderController,
  superFijarController,
  adminEstadoController,
  adminExtenderController,
  adminFijarController,
} from "../../controllers/sistema/suscripcion_controller.js";

export const suscripcionRouter = Router();

// ── Setup (una sola vez por instalación) ─────────────────────────────────────
suscripcionRouter.post("/setup", setupController);

// ── Estado actual ─────────────────────────────────────────────────────────────
suscripcionRouter.get("/estado", requireAuth, requireRole("admin"), estadoController);

// ── Crear preferencia de pago ─────────────────────────────────────────────────
suscripcionRouter.post("/crear-pago", requireAuth, requireRole("admin"), crearPagoController);

// ── Webhook de MercadoPago (público) ──────────────────────────────────────────
suscripcionRouter.post("/webhook", webhookController);

// ── Historial de pagos ────────────────────────────────────────────────────────
suscripcionRouter.get("/pagos", requireAuth, requireRole("admin"), pagosController);

// ════════════════════════════════════════════════════════════════════════════
//  RUTAS SUPER_ADMIN — requieren JWT + rol super_admin
//  Sin SEED_SECRET: usan el token de sesión normal
// ════════════════════════════════════════════════════════════════════════════

// GET /api/suscripcion/super/estado
suscripcionRouter.get("/super/estado", requireAuth, requireRole("super_admin"), superEstadoController);

// POST /api/suscripcion/super/extender   Body: { "dias": 30 }
suscripcionRouter.post("/super/extender", requireAuth, requireRole("super_admin"), superExtenderController);

// POST /api/suscripcion/super/fijar   Body: { "fecha": "YYYY-MM-DD" }
suscripcionRouter.post("/super/fijar", requireAuth, requireRole("super_admin"), superFijarController);

// ════════════════════════════════════════════════════════════════════════════
//  RUTAS DE ADMINISTRACIÓN — solo Nahuel (protegidas por SEED_SECRET)
//  Usar vía Postman con header:  x-seed-token: <SEED_SECRET>
// ════════════════════════════════════════════════════════════════════════════

// GET /api/suscripcion/admin/estado — ver estado sin login
suscripcionRouter.get("/admin/estado", adminEstadoController);

// POST /api/suscripcion/admin/extender — extender N días a partir del vencimiento actual
// Body: { "dias": 30 }
suscripcionRouter.post("/admin/extender", adminExtenderController);

// POST /api/suscripcion/admin/fijar — fijar fecha de vencimiento exacta (pruebas o casos especiales)
// Body: { "fecha": "2026-12-31" }
suscripcionRouter.post("/admin/fijar", adminFijarController);
