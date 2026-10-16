import { obtenerPerfil, guardarPerfil } from "../../services/distribuidora/perfil_cliente_service.js";
import { validarDatosCliente } from "../../services/common/datos_cliente.js";

export async function obtenerMiPerfilController(req, res) {
  try {
    return res.json({ ok: true, data: await obtenerPerfil(req.user.usuario_id) });
  } catch (error) {
    console.error("Error al obtener perfil de cliente:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al obtener el perfil" });
  }
}

export async function guardarMiPerfilController(req, res) {
  try {
    const { datos, error } = validarDatosCliente(req.body ?? {});
    if (error) return res.status(400).json({ ok: false, codigo: "DATOS_INVALIDOS", mensaje: error });
    const perfil = await guardarPerfil(req.user.usuario_id, datos);
    return res.json({ ok: true, mensaje: "Perfil guardado correctamente", data: perfil });
  } catch (error) {
    console.error("Error al guardar perfil de cliente:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al guardar el perfil" });
  }
}
