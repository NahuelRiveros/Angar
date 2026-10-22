import { Router } from "express";
import {
  listarBannerPublicoController, listarBannerAdminController, crearBannerAnuncioController,
  actualizarBannerAnuncioController, cambiarEstadoBannerAnuncioController, eliminarBannerAnuncioController,
} from "../../controllers/sistema/banner_anuncio_controller.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";

export const bannerAnuncioRouter = Router();

// Público — lo consume la cinta de anuncios en toda la app, sin login.
bannerAnuncioRouter.get("/", listarBannerPublicoController);

// Gestión — admin (mismo nivel que "Contenido del home", no hace falta ser super_admin).
bannerAnuncioRouter.use(requireAuth, requirePermiso("contenido.editar"));
bannerAnuncioRouter.get("/admin", listarBannerAdminController);
bannerAnuncioRouter.post("/", crearBannerAnuncioController);
bannerAnuncioRouter.put("/:id", actualizarBannerAnuncioController);
bannerAnuncioRouter.patch("/:id/estado", cambiarEstadoBannerAnuncioController);
bannerAnuncioRouter.delete("/:id", eliminarBannerAnuncioController);
