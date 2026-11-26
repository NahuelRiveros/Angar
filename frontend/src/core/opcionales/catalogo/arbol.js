/** Las categorías del primer nivel, cada una con sus subcategorías (MCA-05). */
export function arbolCategorias(categorias = []) {
  return categorias.filter((c) => c.padre_id === null).map((c) => ({ ...c, hijas: categorias.filter((h) => h.padre_id === c.id) }));
}

/** Para un selector: "Accesorios", "Accesorios › Cascos"… */
export const opcionesCategorias = (categorias) => arbolCategorias(categorias).flatMap((c) => [
  { value: c.id, label: c.nombre }, ...c.hijas.map((h) => ({ value: h.id, label: `${c.nombre} › ${h.nombre}` })),
]);
