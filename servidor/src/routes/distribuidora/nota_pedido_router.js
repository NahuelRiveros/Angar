import { orderConfig } from "../../../../order_config.js";
import { Router } from "express";
import multer from "multer";
import {
  crearNotaPedidoController, listarMisNotasController, listarTodasController,
  cambiarEstadoController, cancelarMiNotaController, registrarPagoController, anularPagoController,
  exportarNotaPedidoController,
} from "../../controllers/distribuidora/nota_pedido_controller.js";
import {
  subirComprobanteController, enlaceComprobanteController, aceptarComprobanteController, rechazarComprobanteController,
} from "../../controllers/distribuidora/comprobantes_controller.js";
import { listaCargaController } from "../../controllers/distribuidora/lista_carga_controller.js";
import { requireAuth, requireRole } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

// El tipo real se comprueba por contenido en el servicio; acá solo se corta lo que excede el tamaño.
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: orderConfig.receipts.maxBytes, files: 1, fields: 2 } });

export const notaPedidoRouter = Router();
notaPedidoRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));
notaPedidoRouter.use(requireAuth);

const ROLES_VENTAS = orderConfig.managementRoles;
const ROLES_COBRO = orderConfig.paymentRoles;

// Rutas específicas ANTES de "/:id".
notaPedidoRouter.get("/todas", requireRole(...ROLES_VENTAS), listarTodasController);
notaPedidoRouter.get("/lista-carga", requireRole(...ROLES_VENTAS), listaCargaController);

notaPedidoRouter.get("/", listarMisNotasController);
notaPedidoRouter.post("/", crearNotaPedidoController);
// Sin rol de gestión: el servicio solo encuentra pedidos del usuario de la sesión.
notaPedidoRouter.post("/:id/cancelar", cancelarMiNotaController);
notaPedidoRouter.post("/:id/comprobantes", subida.single("archivo"), subirComprobanteController);
// Dueño del pedido o equipo de gestión: lo decide el servicio.
notaPedidoRouter.get("/:id/comprobantes/:comprobanteId/enlace", enlaceComprobanteController);
notaPedidoRouter.post("/:id/comprobantes/:comprobanteId/aceptar", requireRole(...ROLES_COBRO), aceptarComprobanteController);
notaPedidoRouter.post("/:id/comprobantes/:comprobanteId/rechazar", requireRole(...ROLES_COBRO), rechazarComprobanteController);
notaPedidoRouter.put("/:id/estado", requireRole(...ROLES_VENTAS), cambiarEstadoController);
notaPedidoRouter.get("/:id/export", requireRole(...ROLES_VENTAS), exportarNotaPedidoController);
notaPedidoRouter.post("/:id/pagos", requireRole(...ROLES_COBRO), registrarPagoController);
notaPedidoRouter.post("/:id/pagos/:pagoId/anular", requireRole(...ROLES_COBRO), anularPagoController);

notaPedidoRouter.use((error, _req, res, next) => {
  if (res.headersSent || !(error instanceof multer.MulterError)) return next(error);
  const grande = error.code === "LIMIT_FILE_SIZE";
  return res.status(grande ? 413 : 400).json({ ok: false, codigo: grande ? "ARCHIVO_GRANDE" : "ARCHIVO_INVALIDO", mensaje: grande ? "El archivo supera los 5 MB." : "Adjuntá un solo archivo en el campo indicado." });
});
