export function formatearFechaAR(fecha) {
  if (!fecha) return "";

  const texto = String(fecha).slice(0, 10);
  const [anio, mes, dia] = texto.split("-");

  if (!anio || !mes || !dia) return fecha;

  return `${dia}/${mes}/${anio}`;
}