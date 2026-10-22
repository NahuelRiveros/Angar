import { Router } from "express";
import multer from "multer";
import { subirImagenController, eliminarImagenController } from "../controllers/common/upload_controller.js";
import { requireAuth, requirePermiso } from "../middleware/auth_middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith("image/");
    cb(ok ? null : new Error("Solo se permiten imágenes"), ok);
  },
});

export const uploadRouter = Router();

uploadRouter.post("/imagen", requireAuth, requirePermiso("contenido.editar", "productos.editar"), upload.single("imagen"), subirImagenController);
uploadRouter.delete("/imagen", requireAuth, requirePermiso("contenido.editar", "productos.editar"), eliminarImagenController);
