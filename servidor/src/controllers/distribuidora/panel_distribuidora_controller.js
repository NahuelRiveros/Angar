import { obtenerResumenPanel } from "../../services/distribuidora/panel_distribuidora_service.js";

export async function resumenPanelController(req, res) {
  try {
    return res.json({ ok: true, data: await obtenerResumenPanel(req.user) });
  } catch (error) {
    console.error("Error al armar el resumen del panel:", error);
    return res.status(500).json({ ok: false, mensaje: "No se pudo cargar el resumen del panel" });
  }
}
