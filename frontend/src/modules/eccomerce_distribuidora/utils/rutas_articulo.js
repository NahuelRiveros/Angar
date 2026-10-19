export const RUTA_ARTICULOS = "/distribuidora/admin/productos";

/** Dirección de la ficha de un artículo, recordando a dónde volver al guardar o cancelar. */
export function rutaFichaArticulo({ id, volver, familia } = {}) {
  const params = new URLSearchParams();
  if (volver) params.set("volver", volver);
  if (familia) params.set("familia", String(familia));
  const consulta = params.toString();
  return `${RUTA_ARTICULOS}/${id ?? "nuevo"}${consulta ? `?${consulta}` : ""}`;
}

export const RUTA_MARCAS = "/distribuidora/admin/marcas";

/** Alta o edición de una marca, recordando a dónde volver. */
export function rutaFichaMarca({ id, volver } = {}) {
  return `${RUTA_MARCAS}/${id ?? "nueva"}${volver ? `?volver=${encodeURIComponent(volver)}` : ""}`;
}

export const RUTA_LISTAS = "/distribuidora/admin/listas-precio";
