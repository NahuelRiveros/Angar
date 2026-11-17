/**
 * PLANTILLA — router. Ejemplo real: routes/sistema/banner_promocion_router.js.
 *
 * Cómo usarla:
 *   1. Copiá a `routes/<dominio>/mi_entidad_router.js` y cambiá los imports.
 *   2. Elegí el permiso (core/permisos_config.js o proyecto/permisos_rubros.js). Se controla por
 *      permiso, no por rol: así el dueño decide desde "Roles y permisos" quién puede.
 *   3. Registralo en `routes/index.js` (o en el modulo.js del rubro).
 *   4. Las rutas fijas (ej. "/stock-bajo") van ANTES que "/:id", si no Express toma "stock-bajo" como id.
 */
import { Router } from "express";
import {
  listarEntidadesController, crearEntidadController,
  actualizarEntidadController, eliminarEntidadController,
} from "../../controllers/_scaffold/entidad_controller_scaffold.js"; // TODO: controller real
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { validar } from "../../middleware/validar.js";
import { esquemaEntidad, esquemaId } from "../../services/_scaffold/entidad_esquemas_scaffold.js"; // TODO: esquemas reales

export const entidadRouter = Router();

// TODO: si es un catálogo público (la tienda lo necesita sin ingresar), mover este GET arriba del use().
entidadRouter.use(requireAuth);
entidadRouter.get("/", listarEntidadesController);
entidadRouter.post("/", requirePermiso("entidad.editar"), validar({ body: esquemaEntidad }), crearEntidadController);
entidadRouter.put("/:id", requirePermiso("entidad.editar"), validar({ params: esquemaId, body: esquemaEntidad }), actualizarEntidadController);
entidadRouter.delete("/:id", requirePermiso("entidad.editar"), validar({ params: esquemaId }), eliminarEntidadController);
