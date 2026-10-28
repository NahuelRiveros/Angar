import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth_middleware.js";
import { resumenRegistrados } from "../../services/usuarios/registrados_service.js";

// Usuarios registrados (cantidad y nombres): solo el super admin, ni siquiera el resto del equipo.
export const registradosRouter = Router();

registradosRouter.get("/", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    return res.json({ ok: true, ...await resumenRegistrados({ page: req.query.page, limit: req.query.limit }) });
  } catch (e) {
    console.error("registrados:", e.message);
    return res.status(500).json({ ok: false, codigo: "ERROR_INTERNO", mensaje: "No pudimos cargar los usuarios registrados." });
  }
});
