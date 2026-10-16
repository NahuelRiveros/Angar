import { UNIDADES, MAX_UNIDADES_POR_BULTO } from "../../../../unidades_config.js";

const texto = (v) => String(v ?? "").trim();
const entero = (v, def) => (v === undefined || v === null || v === "" ? def : Number(v));

/**
 * Limpia y valida precio, stock y unidades de una presentación. Devuelve { datos } o { error }
 * con un mensaje para mostrarle a quien carga el artículo. Solo pasan los campos conocidos.
 */
export function validarVariedad(body = {}) {
  const precio = Number(body.precio);
  if (body.precio === undefined || body.precio === null || body.precio === "" || !Number.isFinite(precio) || precio < 0) {
    return { error: "Ingresá un precio válido (0 o más)." };
  }
  const precioAnterior = body.precio_anterior === undefined || body.precio_anterior === null || body.precio_anterior === "" ? null : Number(body.precio_anterior);
  if (precioAnterior !== null && (!Number.isFinite(precioAnterior) || precioAnterior < 0)) return { error: "El precio anterior no es válido." };

  const iva = entero(body.iva_porcentaje, 21);
  if (!Number.isFinite(iva) || iva < 0 || iva > 100) return { error: "El IVA tiene que estar entre 0 y 100 %." };

  const controlaStock = body.controla_stock === true;
  const cantidad = controlaStock ? entero(body.cantidad, 0) : 0;
  const stockMinimo = entero(body.stock_minimo, 0);
  if (!Number.isInteger(cantidad) || cantidad < 0) return { error: "El stock tiene que ser un número entero, 0 o más." };
  if (!Number.isInteger(stockMinimo) || stockMinimo < 0) return { error: "El stock mínimo tiene que ser un número entero, 0 o más." };

  const unidadMedida = texto(body.unidad_medida || "UNIDAD").toUpperCase();
  const unidadBulto = texto(body.unidad_bulto || "CAJA").toUpperCase();
  if (!UNIDADES.includes(unidadMedida) || !UNIDADES.includes(unidadBulto)) return { error: "Elegí una unidad de la lista." };
  const porBulto = entero(body.unidades_por_bulto, 1);
  if (!Number.isInteger(porBulto) || porBulto < 1 || porBulto > MAX_UNIDADES_POR_BULTO) {
    return { error: `Las unidades por bulto tienen que ser un entero entre 1 y ${MAX_UNIDADES_POR_BULTO}.` };
  }

  const codRef = texto(body.cod_ref) || null;
  if (codRef && codRef.length > 60) return { error: "El código puede tener hasta 60 caracteres." };
  // Se guarda como texto: los ceros a la izquierda son parte del código.
  const codigoBarras = texto(body.codigo_barras).replace(/\s/g, "") || null;
  if (codigoBarras && !/^\d{6,14}$/.test(codigoBarras)) return { error: "El código de barras tiene que tener entre 6 y 14 números." };

  return {
    datos: {
      precio, precio_anterior: precioAnterior, iva_porcentaje: iva,
      controla_stock: controlaStock, cantidad, stock_minimo: stockMinimo,
      unidad_medida: unidadMedida, unidad_bulto: unidadBulto, unidades_por_bulto: porBulto,
      cod_ref: codRef, codigo_barras: codigoBarras,
    },
  };
}

export const FILTROS_STOCK = ["sin_stock", "bajo_minimo"];
