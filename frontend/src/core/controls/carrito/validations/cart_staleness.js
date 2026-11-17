/**
 * Detección de inconsistencias en el carrito al cargarlo desde el servidor.
 *
 * CAMPOS QUE EL BACKEND DEBE RETORNAR EN CADA ITEM DE GET /carrito:
 *
 *   activo: boolean               — false si el producto fue desactivado o eliminado
 *   variante_disponible: boolean  — false si la variante elegida (talle/color/etc.) ya no existe
 *   variante: string|null         — descripción de la variante para mostrar (ej. "Talle M / Rojo")
 *   precio: number                — precio ACTUAL del producto (siempre desde la DB)
 *   precio_al_agregar: number     — precio que tenía cuando se agregó al carrito
 *   stock_disponible: number      — stock actual del producto/variante
 *   cantidad: number              — cantidad en el carrito
 *
 * RESPONSABILIDADES DEL BACKEND (NO del frontend):
 *   - Ignorar el precio_unidad enviado por el cliente al agregar/modificar items
 *   - Recalcular subtotal, envío e impuestos al crear la orden
 *   - Validar stock con SELECT ... FOR UPDATE (bloqueo de fila) antes de confirmar
 *   - Definir TTL del carrito (ej: 30 días sin actividad → limpiar)
 *   - Controlar concurrencia con transacciones SQL
 */

export function alertasVacias() {
  return { removidos: [], preciosActualizados: [], variantesInvalidas: [], stockInsuficiente: [] };
}

/**
 * Procesa los items y retorna alertas clasificadas.
 * Los `removidos` deben eliminarse del servidor y de la UI.
 * El resto son advertencias que el usuario debe resolver antes de pagar.
 */
export function detectarAlertas(items) {
  const removidos          = [];
  const preciosActualizados = [];
  const variantesInvalidas  = [];
  const stockInsuficiente   = [];

  for (const item of items) {
    // Producto desactivado o eliminado del catálogo
    if (item.activo === false) {
      removidos.push({ nombre: item.nombre, item_id: item.item_id });
      continue; // no evaluar más condiciones para este item
    }

    // Variante elegida (talle/color/etc.) que ya no existe
    if (item.variante_disponible === false) {
      variantesInvalidas.push({
        nombre:   item.nombre,
        item_id:  item.item_id,
        variante: item.variante ?? null,
      });
    }

    // Precio distinto al momento de agregar (backend persiste precio_al_agregar)
    if (
      item.precio_al_agregar !== undefined &&
      item.precio_al_agregar !== null &&
      Math.abs(item.precio - item.precio_al_agregar) > 0.01
    ) {
      preciosActualizados.push({
        nombre:         item.nombre,
        item_id:        item.item_id,
        precioAnterior: item.precio_al_agregar,
        precioActual:   item.precio,
        subio:          item.precio > item.precio_al_agregar,
      });
    }

    // Cantidad en carrito supera el stock actual
    if (
      item.stock_disponible !== null &&
      item.stock_disponible !== undefined &&
      item.cantidad > item.stock_disponible
    ) {
      stockInsuficiente.push({
        nombre:            item.nombre,
        item_id:           item.item_id,
        cantidadEnCarrito: item.cantidad,
        stockDisponible:   item.stock_disponible,
      });
    }
  }

  return { removidos, preciosActualizados, variantesInvalidas, stockInsuficiente };
}

/**
 * true si hay alertas que BLOQUEAN el checkout.
 * Productos removidos o variantes inválidas impiden finalizar la compra.
 */
export function tieneAlertasCriticas({ removidos, variantesInvalidas }) {
  return removidos.length > 0 || variantesInvalidas.length > 0;
}

export function tieneAlertas(alertas) {
  return Object.values(alertas).some((arr) => arr.length > 0);
}
