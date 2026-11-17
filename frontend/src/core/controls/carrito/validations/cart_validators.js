// Límites de cantidad permitida por item
export const CANTIDAD_MIN = 1;
export const CANTIDAD_MAX = 99;

/**
 * Sanitiza cualquier valor de cantidad al rango válido [1, 99].
 * Maneja: null, undefined, strings, negativos, decimales, Infinity.
 */
export function sanitizarCantidad(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < CANTIDAD_MIN) return CANTIDAD_MIN;
  if (n > CANTIDAD_MAX) return CANTIDAD_MAX;
  return Math.floor(n);
}

/**
 * Verifica si se puede agregar `cantidadASumar` unidades dado el stock actual.
 * Retorna { ok, tipo?, mensaje? }.
 * Si stockDisponible es null/undefined se asume sin control de stock → ok: true.
 */
export function validarStockParaAgregar({ stockDisponible, cantidadEnCarrito = 0, cantidadASumar = 1 }) {
  if (stockDisponible === null || stockDisponible === undefined) return { ok: true };

  if (stockDisponible === 0) {
    return { ok: false, tipo: "sin_stock", mensaje: "Este producto no tiene stock disponible." };
  }

  const disponibleReal = stockDisponible - cantidadEnCarrito;

  if (disponibleReal <= 0) {
    return { ok: false, tipo: "sin_stock", mensaje: "No quedan más unidades disponibles." };
  }

  if (cantidadASumar > disponibleReal) {
    return {
      ok: false,
      tipo: "stock_insuficiente",
      mensaje: `Solo ${disponibleReal} unidad${disponibleReal !== 1 ? "es" : ""} disponible${disponibleReal !== 1 ? "s" : ""}.`,
    };
  }

  return { ok: true };
}
