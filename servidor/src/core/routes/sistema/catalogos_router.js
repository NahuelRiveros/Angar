import { Router } from "express";
import { catalogosController } from "../../controllers/sistema/catalogos_controller.js";

export const catalogosRouter = Router();

catalogosRouter.get("/", catalogosController);
 