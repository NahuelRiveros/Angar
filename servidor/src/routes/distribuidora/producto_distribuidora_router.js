import { clientConfig } from "../../../../client_config.js";
import { Router } from "express";
import {
  listarProductosController, obtenerProductoController, crearProductoController,
  actualizarProductoController, cambiarEstadoProductoController, eliminarProductoController,
  ajustarPreciosMasivoController, listarOfertasController, preciosEnListasController,
} from "../../controllers/distribuidora/producto_distribuidora_controller.js";
import { requireAuth, requirePermiso, optionalAuth } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

export const productoDistribuidoraRouter = Router();
productoDistribuidoraRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));
// Catálogo entero solo para logueados (decisión de negocio) — a diferencia
// de indumentaria, no hay GET público acá.
productoDistribuidoraRouter.use((req, res, next) => req.method === "GET" && clientConfig.distribuidora.publicCatalog ? optionalAuth(req, res, next) : requireAuth(req, res, next));

// Rutas específicas ANTES de "/:id" — si no, Express las matchea como id.
productoDistribuidoraRouter.post("/ajustar-precios", requirePermiso("precios.editar"), ajustarPreciosMasivoController);

productoDistribuidoraRouter.get("/ofertas", listarOfertasController); // antes de "/:id"
productoDistribuidoraRouter.get("/:id/precios-listas", requirePermiso("productos.editar", "precios.editar"), preciosEnListasController);
productoDistribuidoraRouter.get("/", listarProductosController);
productoDistribuidoraRouter.get("/:id", obtenerProductoController);
productoDistribuidoraRouter.post("/", requirePermiso("productos.editar"), crearProductoController);
productoDistribuidoraRouter.put("/:id", requirePermiso("productos.editar"), actualizarProductoController);
productoDistribuidoraRouter.put("/:id/estado", requirePermiso("productos.editar"), cambiarEstadoProductoController);
productoDistribuidoraRouter.delete("/:id", requirePermiso("productos.editar"), eliminarProductoController);
