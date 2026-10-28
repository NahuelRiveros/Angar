import { Router } from "express";
import { requireAuth } from "../../middleware/auth_middleware.js";
import { recibirComprobante } from "../../middleware/comprobante_middleware.js";
import {
  anotarseController, misInscripcionesController, cancelarMiaController, subirComprobanteController, comprobanteInscripcionController, torneosPublicosController, torneoPublicoController, categoriaPublicaController,
} from "../../controllers/torneos/juego_controller.js";
import { miPerfilController, perfilPublicoController, participantesController, responderInvitacionController } from "../../controllers/jugadores/jugador_controller.js";

// Cualquier cuenta (jugador) sobre sus propias inscripciones. No pide plan: anotarse es gratis.
export const inscripcionJugadorRouter = Router();
inscripcionJugadorRouter.use(requireAuth);
inscripcionJugadorRouter.post("/", anotarseController);
inscripcionJugadorRouter.get("/mias", misInscripcionesController);
inscripcionJugadorRouter.post("/:inscripcionId/cancelar", cancelarMiaController);
// Pago de la inscripción: cualquiera de los dos de la pareja manda el comprobante y lo puede volver a ver.
inscripcionJugadorRouter.post("/:inscripcionId/comprobante", recibirComprobante, subirComprobanteController);
inscripcionJugadorRouter.get("/:inscripcionId/comprobante", comprobanteInscripcionController);
// El compañero invitado por código: { acepta: true | false }.
inscripcionJugadorRouter.post("/:inscripcionId/invitacion", responderInvitacionController);

// Sin cuenta: torneos publicados (nunca borradores) y su ficha.
export const torneoPublicoRouter = Router();
torneoPublicoRouter.get("/", torneosPublicosController);
torneoPublicoRouter.get("/:torneoId", torneoPublicoController);
torneoPublicoRouter.get("/:torneoId/categorias/:categoriaId", categoriaPublicaController);
torneoPublicoRouter.get("/:torneoId/participantes", participantesController);

// Perfil del jugador: el propio (con sesión) y el público por código (sin cuenta, solo datos deportivos).
export const jugadorRouter = Router();
jugadorRouter.get("/yo", requireAuth, miPerfilController);
jugadorRouter.get("/:codigo", perfilPublicoController);
