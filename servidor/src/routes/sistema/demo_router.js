import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth_middleware.js";
import { torneosDemoExistentes, crearTorneosDemo, borrarTorneosDemo } from "../../services/demo/demo_torneos_service.js";

// Torneos de muestra para enseñar cómo se ve MiPadel: solo el super admin los crea o los borra.
export const demoRouter = Router();
demoRouter.use(requireAuth, requireRole("super_admin"));

const fallo = (res, mensaje) => (e) => {
  console.error("demo:", e.message);
  res.status(500).json({ ok: false, codigo: "DEMO_FALLO", mensaje });
};
const resumen = (torneos) => torneos.map((t) => ({ id: t.id, nombre: t.nombre, estado: t.estado }));

demoRouter.get("/", (req, res) =>
  torneosDemoExistentes().then((t) => res.json({ ok: true, data: resumen(t) })).catch(fallo(res, "No pudimos ver los torneos demo.")));

// Si ya existen, no crea nada (lo dice el mensaje).
demoRouter.post("/", (req, res) =>
  crearTorneosDemo({ log: () => {} })
    .then(async (r) => res.json({ ok: true, mensaje: r.creados ? "Torneos demo creados." : "Los torneos demo ya existían.", data: resumen(await torneosDemoExistentes()) }))
    .catch(fallo(res, "No pudimos crear los torneos demo.")));

// En cascada (partidos, zonas, parejas, premios y categorías), solo de los torneos demo.
demoRouter.delete("/", (req, res) =>
  borrarTorneosDemo().then((n) => res.json({ ok: true, mensaje: `Torneos demo borrados: ${n}.`, data: [] })).catch(fallo(res, "No pudimos borrar los torneos demo.")));
