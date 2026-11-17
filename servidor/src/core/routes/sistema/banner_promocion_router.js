import { Router } from "express";
import {
  listarVigentesController, listarTodosController, crearController,
  actualizarController, cambiarEstadoController, eliminarController,
} from "../../controllers/sistema/banner_promocion_controller.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { validar } from "../../middleware/validar.js";
import { esquemaBanner, esquemaEstado, esquemaId } from "../../services/sistema/banner_reglas.js";

export const bannerPromocionRouter = Router();

// SIS-37: ver los vigentes no pide ingresar; todo lo demás pide "Editar banners".
bannerPromocionRouter.get("/", listarVigentesController);

bannerPromocionRouter.use(requireAuth, requirePermiso("contenido.editar"));
bannerPromocionRouter.get("/admin", listarTodosController);
bannerPromocionRouter.post("/", validar({ body: esquemaBanner }), crearController);
bannerPromocionRouter.put("/:id", validar({ params: esquemaId, body: esquemaBanner }), actualizarController);
bannerPromocionRouter.patch("/:id/estado", validar({ params: esquemaId, body: esquemaEstado }), cambiarEstadoController);
bannerPromocionRouter.delete("/:id", validar({ params: esquemaId }), eliminarController);
