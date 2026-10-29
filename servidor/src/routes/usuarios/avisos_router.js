import { Router } from "express";
import { requireAuth } from "../../middleware/auth_middleware.js";
import { misAvisos, marcarAvisosLeidos, cambiarRecibirMails } from "../../services/avisos/avisos_jugador_service.js";

// Novedades de la campanita y preferencia de mails: cada usuario sobre lo suyo.
export const avisosRouter = Router();
avisosRouter.use(requireAuth);

const responder = (mensaje, accion) => async (req, res) => {
  try {
    return res.json({ ok: true, data: await accion(req) });
  } catch (e) {
    if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, codigo: e.codigo, mensaje: e.message });
    console.error("avisos:", e.message);
    return res.status(500).json({ ok: false, codigo: "ERROR_INTERNO", mensaje });
  }
};

avisosRouter.get("/", responder("No pudimos cargar tus avisos.", (req) => misAvisos(req.user)));
avisosRouter.post("/leidos", responder("No pudimos marcar los avisos.", async (req) => ({ marcados: await marcarAvisosLeidos(req.user) })));
avisosRouter.put("/preferencias", responder("No pudimos guardar la preferencia.", (req) => cambiarRecibirMails(req.user, req.body?.recibir_mails)));
