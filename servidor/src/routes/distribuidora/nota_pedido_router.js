import { orderConfig } from "../../../../order_config.js";
import { Router } from "express";
import {
  crearNotaPedidoController, listarMisNotasController, listarTodasController,
  cambiarEstadoController, cancelarMiNotaController, registrarPagoController, anularPagoController,
  exportarNotaPedidoController,
} from "../../controllers/distribuidora/nota_pedido_controller.js";
import { listaCargaController } from "../../controllers/distribuidora/lista_carga_controller.js";
import { requireAuth, requireRole } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

export const notaPedidoRouter = Router();
notaPedidoRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));
notaPedidoRouter.use(requireAuth);

const ROLES_VENTAS = orderConfig.managementRoles;

// Rutas específicas ANTES de "/:id".
notaPedidoRouter.get("/todas", requireRole(...ROLES_VENTAS), listarTodasController);
notaPedidoRouter.get("/lista-carga", requireRole(...ROLES_VENTAS), listaCargaController);

notaPedidoRouter.get("/", listarMisNotasController);
notaPedidoRouter.post("/", crearNotaPedidoController);
// Sin rol de gestión: el servicio solo encuentra pedidos del usuario de la sesión.
notaPedidoRouter.post("/:id/cancelar", cancelarMiNotaController);
notaPedidoRouter.put("/:id/estado", requireRole(...ROLES_VENTAS), cambiarEstadoController);
notaPedidoRouter.get("/:id/export", requireRole(...ROLES_VENTAS), exportarNotaPedidoController);
notaPedidoRouter.post("/:id/pagos", requireRole(...ROLES_VENTAS), registrarPagoController);
notaPedidoRouter.post("/:id/pagos/:pagoId/anular", requireRole(...ROLES_VENTAS), anularPagoController);
