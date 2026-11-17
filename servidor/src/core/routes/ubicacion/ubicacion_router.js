import { Router } from "express";
import {
  listarProvinciasController,
  listarDepartamentosController,
  listarLocalidadesController,
} from "../../controllers/ubicacion/ubicacion_controller.js";

// Público y sin auth a propósito: es división política fija (provincia →
// departamento → localidad), la necesitan tanto el registro como el perfil
// de cliente para armar el select en cascada.
export const ubicacionRouter = Router();

// Nunca cambia en runtime (se carga una sola vez de un JSON al arrancar el
// proceso, ver ubicacion_service.js) — cacheable fuerte en el navegador para
// no volver a pedirlo cada vez que se abre el formulario de perfil/checkout.
// Un redeploy que actualice los JSON fuente sirve la respuesta nueva bajo la
// misma URL recién cuando ese cache expire; 1 día es un buen balance dado lo
// poco frecuente que es tocar esta data.
ubicacionRouter.use((_req, res, next) => { res.set("Cache-Control", "public, max-age=86400"); next(); });

ubicacionRouter.get("/provincias", listarProvinciasController);
ubicacionRouter.get("/departamentos", listarDepartamentosController);
ubicacionRouter.get("/localidades", listarLocalidadesController);
