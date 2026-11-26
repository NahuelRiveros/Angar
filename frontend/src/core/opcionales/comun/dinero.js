/** "$ 15.000" o "$ 15.000,50" (los decimales, solo si hay). */
export function formatearPrecio(monto) {
  const n = Number(monto);
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export const tienePrecio = (precio) => precio !== null && precio !== undefined && precio !== "";
