import { Router } from "express";
import { requireAuth } from "../../middleware/auth_middleware.js";
import { requireSuscripcionVigente } from "../../middleware/suscripcion_middleware.js";
import {
  listarController, crearController, obtenerController, actualizarController, estadoController, eliminarController,
  crearCategoriaController, actualizarCategoriaController, eliminarCategoriaController, premiosController,
} from "../../controllers/torneos/torneo_controller.js";
import {
  listarInscripcionesController, cargarParejaController, editarParejaController, confirmarController, rechazarController, bajaController,
  verZonasController, generarZonasController, moverParejaController, resultadoController, borrarResultadoController, programarController,
  verLlaveController, armarLlaveController, deshacerLlaveController,
} from "../../controllers/torneos/juego_controller.js";

// Torneos del organizador logueado. Que el torneo sea suyo lo verifica el servicio.
export const torneoRouter = Router();
torneoRouter.use(requireAuth);

// Con el plan vencido se puede seguir viendo (solo lectura).
torneoRouter.get("/", listarController);
torneoRouter.get("/:torneoId", obtenerController);
torneoRouter.get("/:torneoId/inscripciones", listarInscripcionesController);
torneoRouter.get("/:torneoId/categorias/:categoriaId/zonas", verZonasController);
torneoRouter.get("/:torneoId/categorias/:categoriaId/llave", verLlaveController);

// Crear y editar exige el plan vigente.
const escribir = requireSuscripcionVigente;
torneoRouter.post("/", escribir, crearController);
torneoRouter.patch("/:torneoId", escribir, actualizarController);
torneoRouter.patch("/:torneoId/estado", escribir, estadoController);
torneoRouter.delete("/:torneoId", escribir, eliminarController);
torneoRouter.post("/:torneoId/categorias", escribir, crearCategoriaController);
torneoRouter.patch("/:torneoId/categorias/:categoriaId", escribir, actualizarCategoriaController);
torneoRouter.delete("/:torneoId/categorias/:categoriaId", escribir, eliminarCategoriaController);
torneoRouter.put("/:torneoId/categorias/:categoriaId/premios", escribir, premiosController);

// Inscripciones, zonas y resultados.
torneoRouter.post("/:torneoId/inscripciones", escribir, cargarParejaController);
torneoRouter.patch("/:torneoId/inscripciones/:inscripcionId", escribir, editarParejaController);
torneoRouter.post("/:torneoId/inscripciones/:inscripcionId/confirmar", escribir, confirmarController);
torneoRouter.post("/:torneoId/inscripciones/:inscripcionId/rechazar", escribir, rechazarController);
torneoRouter.post("/:torneoId/inscripciones/:inscripcionId/baja", escribir, bajaController);
torneoRouter.post("/:torneoId/categorias/:categoriaId/zonas/generar", escribir, generarZonasController);
torneoRouter.post("/:torneoId/categorias/:categoriaId/zonas/mover", escribir, moverParejaController);
torneoRouter.post("/:torneoId/categorias/:categoriaId/llave/armar", escribir, armarLlaveController);
torneoRouter.post("/:torneoId/categorias/:categoriaId/llave/deshacer", escribir, deshacerLlaveController);
torneoRouter.put("/:torneoId/partidos/:partidoId/resultado", escribir, resultadoController);
torneoRouter.delete("/:torneoId/partidos/:partidoId/resultado", escribir, borrarResultadoController);
torneoRouter.put("/:torneoId/partidos/:partidoId/programacion", escribir, programarController);
