import { Router } from "express";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { recibirComprobante } from "../../middleware/comprobante_middleware.js";
import {
  miSuscripcionController, empezarController, misPagosController, crearPagoController, webhookController,
  listarController, pagosDeUsuarioController, extenderController, fijarController,
  avisarTransferenciaController, comprobanteController, listarTransferenciasController,
  aprobarTransferenciaController, rechazarTransferenciaController,
} from "../../controllers/suscripciones/suscripcion_controller.js";

export const suscripcionRouter = Router();

// Público: aviso de MercadoPago (el estado del pago se consulta a MercadoPago).
suscripcionRouter.post("/webhook", webhookController);

// El organizador (o quien quiere serlo) sobre su propio plan.
suscripcionRouter.get("/mia", requireAuth, miSuscripcionController);
suscripcionRouter.post("/empezar", requireAuth, empezarController);
suscripcionRouter.get("/mia/pagos", requireAuth, misPagosController);
suscripcionRouter.post("/pagar", requireAuth, crearPagoController);
suscripcionRouter.post("/transferencia", requireAuth, recibirComprobante, avisarTransferenciaController);
// Dueño del pago o equipo con suscripciones.ver (lo decide el servicio).
suscripcionRouter.get("/comprobantes/:pagoId", requireAuth, comprobanteController);

// Equipo de la plataforma.
suscripcionRouter.get("/admin", requireAuth, requirePermiso("suscripciones.ver"), listarController);
suscripcionRouter.get("/admin/:usuarioId/pagos", requireAuth, requirePermiso("suscripciones.ver"), pagosDeUsuarioController);
suscripcionRouter.post("/admin/:usuarioId/extender", requireAuth, requirePermiso("suscripciones.gestionar"), extenderController);
suscripcionRouter.post("/admin/:usuarioId/fijar", requireAuth, requirePermiso("suscripciones.gestionar"), fijarController);
suscripcionRouter.get("/admin/transferencias", requireAuth, requirePermiso("suscripciones.ver"), listarTransferenciasController);
suscripcionRouter.post("/admin/transferencias/:pagoId/aprobar", requireAuth, requirePermiso("suscripciones.gestionar"), aprobarTransferenciaController);
suscripcionRouter.post("/admin/transferencias/:pagoId/rechazar", requireAuth, requirePermiso("suscripciones.gestionar"), rechazarTransferenciaController);
