export const VARIANTE_VACIA = { id: null, nombre: "", codigo: "", precio: "", precio_anterior: "", disponible: true };

const numero = (precio) => (precio === null ? "" : Number(precio));

/** Una variante de la API, lista para el formulario. */
// `disponible_por`: si otro módulo (ej. stock) decide el "hay stock", no se muestra la casilla.
export const valoresVariante = ({ id, nombre, codigo, precio, precio_anterior, disponible, disponible_por = null }) => ({
  id, nombre: nombre ?? "", codigo: codigo ?? "", precio: numero(precio), precio_anterior: numero(precio_anterior), disponible, disponible_por,
});
