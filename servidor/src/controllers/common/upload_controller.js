import { subirImagen, eliminarImagen } from "../../services/common/upload_service.js";

export async function subirImagenController(req, res) {
  try {
    if (!req.file) return res.status(400).json({ ok: false, mensaje: "No se recibió ninguna imagen" });

    const resultado = await subirImagen(req.file.buffer, { folder: "distribucg/productos" });
    return res.status(201).json({
      ok: true,
      mensaje: "Imagen subida correctamente",
      data: { url: resultado.secure_url, public_id: resultado.public_id },
    });
  } catch (error) {
    console.error("Error al subir imagen:", error);
    return res.status(500).json({ ok: false, mensaje: "Error al subir la imagen" });
  }
}

export async function eliminarImagenController(req, res) {
  try {
    const { public_id } = req.body;
    if (!public_id) return res.status(400).json({ ok: false, mensaje: "public_id es requerido" });

    await eliminarImagen(public_id);
    return res.json({ ok: true, mensaje: "Imagen eliminada correctamente", data: null });
  } catch (error) {
    console.error("Error al eliminar imagen:", error);
    return res.status(500).json({ ok: false, mensaje: "Error al eliminar la imagen" });
  }
}
