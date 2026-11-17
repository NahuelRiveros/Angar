import { http } from "./http.js";

// Subida genérica de imágenes (logos, fotos de producto, avatares, etc.)
// Reusable por cualquier feature — no atado a ningún dominio en particular.
export async function subirImagen(file) {
  const formData = new FormData();
  formData.append("imagen", file);

  const { data } = await http.post("/upload/imagen", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.data;
}

export async function eliminarImagen(publicId) {
  if (!publicId) return;
  await http.delete("/upload/imagen", { data: { public_id: publicId } });
}
