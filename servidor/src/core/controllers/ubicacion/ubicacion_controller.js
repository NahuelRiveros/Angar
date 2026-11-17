import { listarProvincias, listarDepartamentos, listarLocalidades } from "../../services/ubicacion/ubicacion_service.js";

export function listarProvinciasController(_req, res) {
  return res.json({ ok: true, data: listarProvincias() });
}

export function listarDepartamentosController(req, res) {
  const { provincia_id } = req.query;
  return res.json({ ok: true, data: listarDepartamentos(provincia_id) });
}

export function listarLocalidadesController(req, res) {
  const { provincia_id, departamento_id } = req.query;
  return res.json({ ok: true, data: listarLocalidades({ provincia_id, departamento_id }) });
}
