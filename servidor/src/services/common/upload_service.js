import { Readable } from "stream";
import { cloudinary } from "../../configuracion_servidor/cloudinary.js";

/**
 * Subida genérica de imágenes — no atada a ningún dominio (fotos de
 * producto, logos de marca, lo que haga falta). Ver home_service.js para
 * el mismo patrón aplicado al contenido del home.
 */
export function subirImagen(buffer, { folder = "distribucg/general" } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", transformation: [{ quality: "auto", fetch_format: "auto" }] },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });
}

export function eliminarImagen(publicId) {
  return cloudinary.uploader.destroy(publicId);
}
