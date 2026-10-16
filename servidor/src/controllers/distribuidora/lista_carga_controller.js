import { armarListaCarga, leerIdsPedidos } from "../../services/distribuidora/lista_carga_service.js";

export async function listaCargaController(req, res) {
  try {
    const ids = leerIdsPedidos(req.query.ids);
    return res.json({ ok: true, data: await armarListaCarga(ids) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ ok: false, codigo: "DATOS_INVALIDOS", mensaje: error.message });
    console.error("Error al armar la lista de carga:", error);
    return res.status(500).json({ ok: false, mensaje: "No se pudo armar la lista de carga" });
  }
}
