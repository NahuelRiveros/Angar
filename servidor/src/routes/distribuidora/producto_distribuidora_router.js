import { clientConfig } from "../../../../client_config.js";
import { Router } from "express";
import {
  listarProductosController, obtenerProductoController, crearProductoController,
  actualizarProductoController, cambiarEstadoProductoController, eliminarProductoController,
  ajustarPreciosMasivoController,
} from "../../controllers/distribuidora/producto_distribuidora_controller.js";
import { requireAuth, requireRole, optionalAuth } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

export const productoDistribuidoraRouter = Router();
productoDistribuidoraRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));
// Catálogo entero solo para logueados (decisión de negocio) — a diferencia
// de indumentaria, no hay GET público acá.
productoDistribuidoraRouter.use((req, res, next) => req.method === "GET" && clientConfig.distribuidora.publicCatalog ? optionalAuth(req, res, next) : requireAuth(req, res, next));

// Rutas específicas ANTES de "/:id" — si no, Express las matchea como id.
productoDistribuidoraRouter.post("/ajustar-precios", requireRole("admin", "staff"), ajustarPreciosMasivoController);

productoDistribuidoraRouter.get("/", listarProductosController);
productoDistribuidoraRouter.get("/:id", obtenerProductoController);
productoDistribuidoraRouter.post("/", requireRole("admin", "staff"), crearProductoController);
productoDistribuidoraRouter.put("/:id", requireRole("admin", "staff"), actualizarProductoController);
productoDistribuidoraRouter.put("/:id/estado", requireRole("admin", "staff"), cambiarEstadoProductoController);
productoDistribuidoraRouter.delete("/:id", requireRole("admin", "staff"), eliminarProductoController);
