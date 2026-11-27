export function formatearFechaAR(fecha) {
  if (!fecha) return "";

  const texto = String(fecha).slice(0, 10);
  const [anio, mes, dia] = texto.split("-");

  if (!anio || !mes || !dia) return fecha;

  return `${dia}/${mes}/${anio}`;
}

/** "25/11, 10:30 p. m.": fecha corta con hora, en la zona del navegador. */
export const formatearFechaHora = (fecha) => new Date(fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
