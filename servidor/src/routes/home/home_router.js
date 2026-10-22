import { Router } from "express";
import multer from "multer";
import {
  listarAreasController,
  obtenerContenidoPublicoController,
  listarContenidoAdminController,
  crearContenidoController,
  actualizarContenidoController,
  cambiarEstadoContenidoController,
  eliminarContenidoController,
  obtenerConfigPublicaController,
  listarTextosAdminController,
  actualizarTextosController,
  listarPilaresAdminController,
  crearPilarController,
  actualizarPilarController,
  cambiarEstadoPilarController,
  eliminarPilarController,
  listarContactosAdminController,
  crearContactoController,
  actualizarContactoController,
  cambiarEstadoContactoController,
  eliminarContactoController,
  actualizarLayoutAreaController,
} from "../../controllers/home/home_controller.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
    cb(ok ? null : new Error("Solo se permiten imágenes o videos"), ok);
  },
});

export const homeRouter = Router();

// Público — lo consume la landing page, sin login
homeRouter.get("/contenido", obtenerContenidoPublicoController);
homeRouter.get("/config", obtenerConfigPublicaController);

// Gestión — solo admin
homeRouter.use(requireAuth, requirePermiso("contenido.editar"));
homeRouter.get("/areas", listarAreasController);
homeRouter.get("/contenido/admin", listarContenidoAdminController);
homeRouter.post("/contenido", upload.single("archivo"), crearContenidoController);
homeRouter.put("/contenido/:id", actualizarContenidoController);
homeRouter.patch("/contenido/:id/estado", cambiarEstadoContenidoController);
homeRouter.delete("/contenido/:id", eliminarContenidoController);
homeRouter.patch("/areas/:id/layout", actualizarLayoutAreaController);

homeRouter.get("/textos", listarTextosAdminController);
homeRouter.put("/textos", actualizarTextosController);

homeRouter.get("/pilares", listarPilaresAdminController);
homeRouter.post("/pilares", crearPilarController);
homeRouter.put("/pilares/:id", actualizarPilarController);
homeRouter.patch("/pilares/:id/estado", cambiarEstadoPilarController);
homeRouter.delete("/pilares/:id", eliminarPilarController);

homeRouter.get("/contactos", listarContactosAdminController);
homeRouter.post("/contactos", crearContactoController);
homeRouter.put("/contactos/:id", actualizarContactoController);
homeRouter.patch("/contactos/:id/estado", cambiarEstadoContactoController);
homeRouter.delete("/contactos/:id", eliminarContactoController);
