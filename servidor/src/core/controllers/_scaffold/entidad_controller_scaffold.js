/**
 * PLANTILLA — controller delgado. Ejemplo real: controllers/sistema/banner_promocion_controller.js.
 *
 * Solo traduce HTTP ↔ service: lee req.datos (ya validado por `validar`), llama al service y responde
 * { ok, codigo, mensaje, data }. Sin try/catch: Express 5 manda los errores al manejador central de
 * app.js, que responde los ErrorApp con su código y el resto con un 500 genérico.
 *
 * Cómo usarla: copiá a `controllers/<dominio>/mi_entidad_controller.js` y cambiá el import.
 */
import {
  listarEntidades, crearEntidad, actualizarEntidad, eliminarEntidad,
} from "../../services/_scaffold/entidad_service_scaffold.js"; // TODO: service real

export async function listarEntidadesController(_req, res) {
  return res.json({ ok: true, data: await listarEntidades() });
}

export async function crearEntidadController(req, res) {
  const data = await crearEntidad(req.datos.body);
  return res.status(201).json({ ok: true, codigo: "ENTIDAD_CREADA", mensaje: "Entidad creada.", data });
}

export async function actualizarEntidadController(req, res) {
  const data = await actualizarEntidad(req.datos.params.id, req.datos.body);
  return res.json({ ok: true, codigo: "ENTIDAD_ACTUALIZADA", mensaje: "Entidad actualizada.", data });
}

export async function eliminarEntidadController(req, res) {
  await eliminarEntidad(req.datos.params.id);
  return res.json({ ok: true, codigo: "ENTIDAD_ELIMINADA", mensaje: "Entidad eliminada." });
}
