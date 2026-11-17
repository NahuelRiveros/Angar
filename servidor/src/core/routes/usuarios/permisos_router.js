import { Router } from "express";
import {
  listarPermisosController, crearRolController, guardarPermisosRolController, eliminarRolController,
} from "../../controllers/usuarios/permisos_controller.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";

export const permisosRouter = Router();
permisosRouter.use(requireAuth, requirePermiso("permisos.gestionar"));

permisosRouter.get("/", listarPermisosController);
permisosRouter.post("/roles", crearRolController);
permisosRouter.put("/roles/:id", guardarPermisosRolController);
permisosRouter.delete("/roles/:id", eliminarRolController);
