import { Router } from "express";
import multer from "multer";
import { catalogImportConfig as config } from "../../../../catalog_import_config.js";
import { previsualizarImportacionController, validarImportacionController, detalleImportacionController, historialImportacionController, ejecutarImportacionController, cancelarImportacionController, informeImportacionController, plantillaImportacionController } from "../../controllers/distribuidora/importacion_distribuidora_controller.js";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { requireModuloHabilitado } from "../../middleware/modulo_middleware.js";
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: config.maxBytes, files: 1, fields: 4, fieldSize: 65536 },
  fileFilter: (_req, file, cb) => cb(/\.(xlsx|csv)$/i.test(file.originalname) ? null : Object.assign(new Error("Solo se admiten .xlsx o CSV. Convertí los .xls a .xlsx."), { status: 400 }), true),
});
let reading = 0;
function capacity(_req, res, next) {
  if (reading >= 2) return res.status(429).json({ ok: false, mensaje: "Hay otros archivos en lectura. Reintentá en unos segundos." });
  reading++;
  let released = false;
  const release = () => { if (!released) { released = true; reading--; } };
  res.once("finish", release); res.once("close", release); next();
}
export const importacionDistribuidoraRouter = Router();
const router = importacionDistribuidoraRouter;
router.use(requireAuth, requireModuloHabilitado("eccomerce_distribuidora"), requirePermiso("productos.editar"));
// La importación también escribe precios: hacen falta los dos permisos.
router.use(requirePermiso("precios.editar"));
router.get("/plantilla", plantillaImportacionController);
router.get("/historial", historialImportacionController);
router.post("/previsualizar", capacity, upload.single("archivo"), previsualizarImportacionController);
router.post("/validar", capacity, upload.single("archivo"), validarImportacionController);
router.get("/:id/informe", informeImportacionController);
router.get("/:id", detalleImportacionController);
router.post("/:id/lote", ejecutarImportacionController);
router.post("/:id/cancelar", cancelarImportacionController);
// Cliente anterior: nunca ejecutar un archivo sin la nueva validación/revisión.
router.post("/ejecutar", (_req, res) => res.status(409).json({ ok: false, mensaje: "Actualizá la página y validá el archivo antes de importar." }));
router.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : error.status || 400).json({ ok: false, mensaje: error.code === "LIMIT_FILE_SIZE" ? "El archivo supera 20 MB." : error.status ? error.message : "Archivo o formulario de importación inválido." });
});
