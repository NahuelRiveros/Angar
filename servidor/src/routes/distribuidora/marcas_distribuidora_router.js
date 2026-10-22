import { Router } from "express";
import {
  listarMarcasController, resumenMarcasController, obtenerMarcaController, crearMarcaController,
  actualizarMarcaController, unificarMarcasController, eliminarMarcaController,
} from "../../controllers/distribuidora/marcas_distribuidora_controller.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

// Gestión de marcas: solo personal de catálogo (mismos roles que artículos y categorías).
export const marcasDistribuidoraRouter = Router();
marcasDistribuidoraRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));
marcasDistribuidoraRouter.use(requireAuth, requirePermiso("productos.editar"));

marcasDistribuidoraRouter.get("/", listarMarcasController);
marcasDistribuidoraRouter.get("/gestion", resumenMarcasController);
marcasDistribuidoraRouter.post("/unificar", unificarMarcasController);
marcasDistribuidoraRouter.get("/:id", obtenerMarcaController);
marcasDistribuidoraRouter.post("/", crearMarcaController);
marcasDistribuidoraRouter.put("/:id", actualizarMarcaController);
marcasDistribuidoraRouter.delete("/:id", eliminarMarcaController);
