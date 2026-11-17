import { Readable } from "stream";
import { cloudinary } from "../../configuracion_servidor/cloudinary.js";
import { deploymentConfig } from "../../../../../proyecto/deployment_config.js";

/**
 * Subida genérica de imágenes — no atada a ningún dominio (fotos de
 * producto, logos de marca, banners, lo que haga falta).
 */
export function subirImagen(buffer, { folder = `${deploymentConfig.carpetaCloudinary}/general` } = {}) {
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

/**
 * Archivo privado (comprobantes con datos bancarios): sin URL pública, solo se
 * descarga con private_download_url. Las imágenes y los PDF se guardan como
 * "image", que Cloudinary admite para ambos, sin transformaciones: es el original.
 */
export function subirArchivoPrivado(buffer, { folder, public_id }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id, type: "private", resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });
}

export function eliminarArchivoPrivado(publicId) {
  return cloudinary.uploader.destroy(publicId, { type: "private", resource_type: "image" });
}

/** Enlace firmado que vence a los `segundos`; pasa por la API autenticada de Cloudinary. */
export function enlaceArchivoPrivado(publicId, formato, segundos = 300) {
  return cloudinary.utils.private_download_url(publicId, formato, {
    type: "private", resource_type: "image", expires_at: Math.floor(Date.now() / 1000) + segundos,
  });
}
