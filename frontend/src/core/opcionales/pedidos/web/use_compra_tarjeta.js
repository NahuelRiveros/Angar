import { agregar } from "../carrito.js";
import { lineaDe, sePuedeComprar, useAviso } from "./agregar.js";

/** En la tarjeta, el botón aparece solo si hay una única opción para elegir. */
export function useCompraTarjeta(producto) {
  const [aviso, mostrar] = useAviso();
  const variante = { id: producto.variante_id, nombre: null, precio: producto.precio, disponible: producto.disponible };
  if (!producto.variante_id || !sePuedeComprar(variante)) return {};
  return {
    message: aviso?.ok ? aviso.texto : null,
    error: aviso && !aviso.ok ? aviso.texto : null,
    onAdd: () => {
      try {
        agregar(lineaDe(producto, variante));
        mostrar({ ok: true, texto: "¡Agregado!" });
      } catch (error) {
        mostrar({ ok: false, texto: error.message });
      }
    },
  };
}
