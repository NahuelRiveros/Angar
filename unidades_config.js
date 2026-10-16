// Unidades de venta y bultos de cada presentación (compartido por servidor y web).
// Como en el sistema de gestión del cliente: la UM primaria es en lo que se cuenta y
// vende (PAQUETE, UNIDAD…) y el bulto agrupa varias (1 CAJA = 20 PAQUETE).
export const UNIDADES = [
  "UNIDAD", "PAQUETE", "CAJA", "BOTELLA", "BIDON", "BOLSA", "DISPLAY", "FARDO", "FRASCO",
  "LATA", "PACK", "ROLLO", "SOBRE", "PAR", "KG", "LITRO",
];
export const MAX_UNIDADES_POR_BULTO = 10000;

const plural = (unidad, cantidad) => {
  const texto = String(unidad ?? "UNIDAD").toLowerCase();
  if (cantidad === 1 || texto === "kg") return texto;
  // unidad → unidades, bidon → bidones, par → pares; pack → packs, display → displays.
  return /[dnrl]$/.test(texto) ? texto + "es" : texto + "s";
};

/** "1 caja", "20 paquetes", "0 unidades": cantidad con su unidad en singular o plural. */
export function cantidadConUnidad(cantidad, unidad = "UNIDAD") {
  return `${cantidad} ${plural(unidad, Number(cantidad))}`;
}

/** 23 paquetes con cajas de 20 → { bultos: 1, sueltos: 3 }. Sin bulto (1 por bulto) todo queda en sueltos. */
export function separarBultos(cantidad, unidadesPorBulto = 1) {
  const total = Math.max(0, Math.trunc(Number(cantidad) || 0));
  const porBulto = Math.trunc(Number(unidadesPorBulto) || 1);
  if (porBulto <= 1) return { bultos: 0, sueltos: total };
  return { bultos: Math.floor(total / porBulto), sueltos: total % porBulto };
}

/** "Caja x 20 paquetes" o null si la presentación no se arma en bultos. */
export function describirBulto({ unidad_bulto = "CAJA", unidades_por_bulto = 1, unidad_medida = "UNIDAD" } = {}) {
  const porBulto = Number(unidades_por_bulto) || 1;
  if (porBulto <= 1) return null;
  const bulto = String(unidad_bulto).toLowerCase();
  return `${bulto[0].toUpperCase()}${bulto.slice(1)} x ${porBulto} ${plural(unidad_medida, porBulto)}`;
}

/** "2 cajas + 3 paquetes" para mostrar debajo de una cantidad. */
export function textoBultos(cantidad, variedad = {}) {
  const { bultos, sueltos } = separarBultos(cantidad, variedad.unidades_por_bulto);
  const partes = [];
  if (bultos) partes.push(`${bultos} ${plural(variedad.unidad_bulto ?? "CAJA", bultos)}`);
  if (sueltos || !bultos) partes.push(`${sueltos} ${plural(variedad.unidad_medida ?? "UNIDAD", sueltos)}`);
  return partes.join(" + ");
}
