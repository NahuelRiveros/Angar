import { Router } from "express";
import { guardarFiscalController, obtenerFiscalController } from "../../controllers/usuarios/perfil_controller.js";
import { requireAuth } from "../../middleware/auth_middleware.js";
import { validar } from "../../middleware/validar.js";
import { esquemaFiscal } from "../../services/usuarios/perfil_fiscal_service.js";

export const perfilRouter = Router();

perfilRouter.use(requireAuth);
perfilRouter.get("/fiscal", obtenerFiscalController);
perfilRouter.put("/fiscal", validar({ body: esquemaFiscal }), guardarFiscalController);
