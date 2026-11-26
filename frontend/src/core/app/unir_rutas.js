/**
 * MOD-16: junta las rutas (`clave`: "rutasTienda" o "rutasPanel") de una lista de pantallas. Si dos
 * declaran la misma dirección, queda la última: los rubros van después de los módulos del core.
 */
export function unirRutas(pantallas, clave) {
  const porDireccion = new Map();
  for (const modulo of pantallas) for (const ruta of modulo[clave] ?? []) porDireccion.set(ruta.path, ruta);
  return [...porDireccion.values()];
}
