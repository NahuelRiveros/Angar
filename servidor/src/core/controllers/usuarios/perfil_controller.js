import { guardarFiscal, obtenerFiscal } from "../../services/usuarios/perfil_fiscal_service.js";

// Cada uno ve y edita solo sus datos: la persona sale de la sesión, nunca de la URL.

export async function obtenerFiscalController(req, res) {
  return res.json({ ok: true, data: await obtenerFiscal(req.user.persona_id) });
}

export async function guardarFiscalController(req, res) {
  const data = await guardarFiscal(req.user.persona_id, req.datos.body);
  return res.json({ ok: true, codigo: "FISCAL_GUARDADO", mensaje: "Datos de facturación guardados.", data });
}
