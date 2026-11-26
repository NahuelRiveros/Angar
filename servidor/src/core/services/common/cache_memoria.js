/**
 * Caché en memoria para lo público, que cambia poco y lo pide cada visita: evita despertar la base.
 * Quien modifica los datos llama a `vaciar()`. Si lo vacían mientras se consulta, ese resultado ya
 * viejo no se guarda.
 */
export function crearCache({ duracionMs = 60 * 1000, maximo = 200 } = {}) {
  const guardado = new Map();
  let generacion = 0;
  return {
    async obtener(clave, consultar) {
      const actual = guardado.get(clave);
      if (actual && Date.now() - actual.en < duracionMs) return actual.datos;
      const inicio = generacion;
      const datos = await consultar();
      if (inicio === generacion) {
        guardado.delete(clave);
        // Los Map recuerdan el orden de carga: si está lleno, sale el más viejo.
        if (guardado.size >= maximo) guardado.delete(guardado.keys().next().value);
        guardado.set(clave, { en: Date.now(), datos });
      }
      return datos;
    },
    vaciar() { generacion += 1; guardado.clear(); },
  };
}
