// MOD-17: cómo un módulo (o rubro) se engancha a otro sin que se conozcan. Cada módulo declara en su
// modulo.js `enganches: { nombre: funcion }`; modulos_activos.js registra los de todo lo prendido.
// Sin nadie enganchado, cada función no hace nada: pedidos anda sin stock y el catálogo sin pedidos.
const registrados = { disponibilidad: [], cambioDePedido: [] };

export function registrarEnganches(modulos) {
  for (const lista of Object.values(registrados)) lista.length = 0;
  for (const modulo of modulos) {
    for (const [nombre, funcion] of Object.entries(modulo.enganches ?? {})) {
      if (!registrados[nombre]) throw new Error(`El módulo "${modulo.codigo}" usa un enganche que no existe: ${nombre}.`);
      registrados[nombre].push(funcion);
    }
  }
}

/**
 * Quién decide el "hay stock" de estas variantes en lugar de la casilla del catálogo.
 * Devuelve Map id → { disponible, por } solo de las que maneja alguien (ej. stock: { disponible: cantidad > 0, por: "stock" }).
 */
export async function disponibilidad(variante_ids, transaction) {
  const resultado = new Map();
  for (const funcion of registrados.disponibilidad) for (const [id, valor] of await funcion(variante_ids, transaction)) resultado.set(id, valor);
  return resultado;
}

/**
 * Un pedido cambió de estado. Corre dentro de la misma transacción: si un enganche falla (ej. falta
 * stock), el cambio no se guarda. `cambio`: { pedido_id, de, a, items: [{ variante_id, cantidad, nombre }], usuario_id }.
 */
export async function cambioDePedido(cambio, transaction) {
  for (const funcion of registrados.cambioDePedido) await funcion(cambio, transaction);
}
