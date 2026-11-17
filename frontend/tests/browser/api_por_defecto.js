// Respuesta de la API simulada para lo que una prueba no define: los banners del core (carrusel y
// cinta) vienen como objeto; todo lo demás, una lista vacía (y textos vacíos para la portada).
export const BANNERS_VACIOS = { ok: true, data: { carrusel: [], cinta: [] } };

export function porDefecto(route) {
  if (new URL(route.request().url()).pathname.endsWith("/banners")) return BANNERS_VACIOS;
  return { ok: true, data: [], textos: {}, pilares: [], contactos: [] };
}
