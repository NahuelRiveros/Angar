import { Router } from "express";
import multer from "multer";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { cobroConfig } from "../../../../cobro_config.js";
import {
  miSuscripcionController, empezarController, misPagosController, crearPagoController, webhookController,
  listarController, pagosDeUsuarioController, extenderController, fijarController,
  avisarTransferenciaController, comprobanteController, listarTransferenciasController,
  aprobarTransferenciaController, rechazarTransferenciaController,
} from "../../controllers/suscripciones/suscripcion_controller.js";

export const suscripcionRouter = Router();

// En memoria y con tope: el formato real lo valida el servicio por el contenido del archivo.
const recibirComprobante = (req, res, next) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: cobroConfig.comprobante.maxBytes, files: 1, fields: 5 },
}).single("comprobante")(req, res, (err) => {
  if (!err) return next();
  const mensaje = err.code === "LIMIT_FILE_SIZE"
    ? `El comprobante puede pesar hasta ${Math.round(cobroConfig.comprobante.maxBytes / 1024 / 1024)} MB.`
    : "No pudimos leer el archivo. Probá con otro.";
  return res.status(400).json({ ok: false, codigo: "COMPROBANTE_INVALIDO", mensaje });
});

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
