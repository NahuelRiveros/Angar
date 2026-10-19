import { Router } from "express";
import {
  listarListasController, obtenerListaController, crearListaController, actualizarListaController, eliminarListaController,
  listarPreciosController, guardarPreciosController, importarPreciosController,
} from "../../controllers/distribuidora/listas_precio_controller.js";
import { requireAuth, requireRole } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";

// Listas de precios regionales: solo admin (definen lo que se le cobra a cada zona).
export const listasPrecioRouter = Router();
listasPrecioRouter.use(requireModuloHabilitado("eccomerce_distribuidora"));
listasPrecioRouter.use(requireAuth, requireRole("admin"));

listasPrecioRouter.get("/", listarListasController);
listasPrecioRouter.post("/", crearListaController);
listasPrecioRouter.get("/:id", obtenerListaController);
listasPrecioRouter.put("/:id", actualizarListaController);
listasPrecioRouter.delete("/:id", eliminarListaController);
listasPrecioRouter.get("/:id/precios", listarPreciosController);
listasPrecioRouter.put("/:id/precios", guardarPreciosController);
listasPrecioRouter.post("/:id/precios/importar", importarPreciosController);
