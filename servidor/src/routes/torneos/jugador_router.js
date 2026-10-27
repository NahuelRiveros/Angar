import { Router } from "express";
import { requireAuth } from "../../middleware/auth_middleware.js";
import {
  anotarseController, misInscripcionesController, cancelarMiaController, torneosPublicosController, torneoPublicoController, categoriaPublicaController,
} from "../../controllers/torneos/juego_controller.js";

// Cualquier cuenta (jugador) sobre sus propias inscripciones. No pide plan: anotarse es gratis.
export const inscripcionJugadorRouter = Router();
inscripcionJugadorRouter.use(requireAuth);
inscripcionJugadorRouter.post("/", anotarseController);
inscripcionJugadorRouter.get("/mias", misInscripcionesController);
inscripcionJugadorRouter.post("/:inscripcionId/cancelar", cancelarMiaController);

// Sin cuenta: torneos publicados (nunca borradores) y su ficha.
export const torneoPublicoRouter = Router();
torneoPublicoRouter.get("/", torneosPublicosController);
torneoPublicoRouter.get("/:torneoId", torneoPublicoController);
torneoPublicoRouter.get("/:torneoId/categorias/:categoriaId", categoriaPublicaController);
