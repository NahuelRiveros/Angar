import { useEffect, useRef, useState } from "react";
import { tienePrecio } from "../../comun/dinero.js";

// Lo que comparten la ficha y la tarjeta al agregar al carrito.
export const lineaDe = (producto, variante) => ({
  variante_id: variante.id, producto: producto.nombre, opcion: producto.con_opciones ? variante.nombre : null,
  precio: variante.precio, foto: producto.fotos?.[0] ?? producto.foto ?? null, slug: producto.slug,
});
export const sePuedeComprar = (variante) => variante.disponible && tienePrecio(variante.precio);

/** Un aviso que se borra solo a los pocos segundos. */
export function useAviso() {
  const [aviso, setAviso] = useState(null);
  const espera = useRef(null);
  useEffect(() => () => clearTimeout(espera.current), []);
  const mostrar = (nuevo) => {
    setAviso(nuevo);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => setAviso(null), 3500);
  };
  return [aviso, mostrar];
}
