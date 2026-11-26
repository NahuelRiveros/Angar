import { Router } from "express";
import multer from "multer";
import { subirImagenController, eliminarImagenController } from "../controllers/common/upload_controller.js";
import { permisosConfig } from "../../../../core/permisos_config.js";
import { requireAuth, requirePermiso } from "../middleware/auth_middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith("image/");
    cb(ok ? null : new Error("Solo se permiten imágenes"), ok);
  },
});

// SIS-33: además de los de siempre, los permisos de módulos prendidos que trabajan con fotos.
const PUEDE_SUBIR = ["contenido.editar", "productos.editar", ...permisosConfig.permisos.filter((p) => p.subeImagenes).map((p) => p.codigo)];

export const uploadRouter = Router();

uploadRouter.post("/imagen", requireAuth, requirePermiso(...PUEDE_SUBIR), upload.single("imagen"), subirImagenController);
uploadRouter.delete("/imagen", requireAuth, requirePermiso(...PUEDE_SUBIR), eliminarImagenController);
