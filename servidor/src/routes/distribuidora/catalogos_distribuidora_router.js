import { clientConfig } from "../../../../client_config.js";
import { Router } from "express";
import {
  listarCategoriasController, crearCategoriaController, actualizarCategoriaController, eliminarCategoriaController,
  fusionarCategoriaController, moverCategoriasController,
} from "../../controllers/distribuidora/catalogos_distribuidora_controller.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

export const catalogosDistribuidoraRouter = Router();
catalogosDistribuidoraRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));

// A diferencia de indumentaria, acá el GET también requiere login — el
// catálogo entero es solo para clientes logueados (decisión de negocio).
catalogosDistribuidoraRouter.get("/categorias", (req, res, next) => clientConfig.distribuidora.publicCatalog ? next() : requireAuth(req, res, next), listarCategoriasController);
catalogosDistribuidoraRouter.post("/categorias", requireAuth, requirePermiso("productos.editar"), crearCategoriaController);
// Antes de "/categorias/:id" para que "mover" no se lea como un id.
catalogosDistribuidoraRouter.patch("/categorias/mover", requireAuth, requirePermiso("productos.editar"), moverCategoriasController);
catalogosDistribuidoraRouter.post("/categorias/:id/fusionar", requireAuth, requirePermiso("productos.editar"), fusionarCategoriaController);
catalogosDistribuidoraRouter.put("/categorias/:id", requireAuth, requirePermiso("productos.editar"), actualizarCategoriaController);
catalogosDistribuidoraRouter.delete("/categorias/:id", requireAuth, requirePermiso("productos.editar"), eliminarCategoriaController);
