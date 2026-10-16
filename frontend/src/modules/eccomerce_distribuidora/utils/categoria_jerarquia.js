export function slugify(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Categorías en orden jerárquico (padre antes que hijo), con `profundidad`.
export function aplanarJerarquia(categorias, padreId = null, profundidad = 0) {
  const hijos = categorias
    .filter((c) => c.padre_id === padreId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return hijos.flatMap((c) => [
    { ...c, profundidad },
    ...aplanarJerarquia(categorias, c.id, profundidad + 1),
  ]);
}

/**
 * Índice de la clasificación de dos niveles (Familia › Categoría), armado una vez
 * por listado: con 2000 categorías evita recorrer el array en cada fila.
 * `ruta` es el nombre completo ("Almacén › Galletitas"); `total` suma los artículos
 * propios y los de todo lo que cuelga debajo.
 */
export function indexarCategorias(categorias = []) {
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const hijosDe = new Map();
  for (const c of categorias) {
    if (c.padre_id == null || !porId.has(c.padre_id)) continue;
    if (!hijosDe.has(c.padre_id)) hijosDe.set(c.padre_id, []);
    hijosDe.get(c.padre_id).push(c);
  }
  const familiaDe = new Map();
  const rutaDe = new Map();
  for (const c of categorias) {
    const nombres = [c.nombre];
    let actual = c;
    const vistos = new Set([c.id]);
    while (actual.padre_id != null && porId.has(actual.padre_id) && !vistos.has(actual.padre_id)) {
      actual = porId.get(actual.padre_id);
      vistos.add(actual.id);
      nombres.unshift(actual.nombre);
    }
    familiaDe.set(c.id, actual.id);
    rutaDe.set(c.id, nombres.join(" › "));
  }
  const totalDe = new Map(categorias.map((c) => [c.id, 0]));
  for (const c of categorias) {
    const cantidad = c.cantidad_productos ?? 0;
    totalDe.set(c.id, totalDe.get(c.id) + cantidad);
    const familia = familiaDe.get(c.id);
    if (familia !== c.id) totalDe.set(familia, totalDe.get(familia) + cantidad);
  }
  const ordenar = (a, b) => a.nombre.localeCompare(b.nombre, "es");
  const familias = categorias.filter((c) => familiaDe.get(c.id) === c.id).sort(ordenar);
  // Categorías de cada familia, incluidas las de niveles heredados (se muestran con su ruta).
  const categoriasDe = new Map(familias.map((f) => [f.id, []]));
  for (const c of categorias) if (familiaDe.get(c.id) !== c.id) categoriasDe.get(familiaDe.get(c.id))?.push(c);
  for (const lista of categoriasDe.values()) lista.sort((a, b) => rutaDe.get(a.id).localeCompare(rutaDe.get(b.id), "es"));
  return { porId, hijosDe, familiaDe, rutaDe, totalDe, familias, categoriasDe };
}

// Opciones para elegir familia o categoría con buscador: la etiqueta lleva la ruta
// completa, así "Varios" de Almacén no se confunde con "Varios" de Limpieza.
export function construirOpcionesCategoria(categorias, { soloFamilias = false } = {}) {
  const { familias, categoriasDe, rutaDe, totalDe } = indexarCategorias(categorias);
  return familias.flatMap((f) => [f, ...(soloFamilias ? [] : categoriasDe.get(f.id))]).map((c) => ({
    value: c.id,
    label: rutaDe.get(c.id),
    hint: `${totalDe.get(c.id)} art.`,
  }));
}
