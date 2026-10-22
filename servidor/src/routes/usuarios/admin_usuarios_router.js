import { Router } from "express";
import { crearUsuarioController ,listarUsuariosController } from "../../controllers/usuarios/admin_usuarios_controller.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";

export const adminUsuariosRouter = Router();

adminUsuariosRouter.use(requireAuth, requirePermiso("usuarios.gestionar"));

adminUsuariosRouter.post("/", crearUsuarioController);
adminUsuariosRouter.get("/", listarUsuariosController);