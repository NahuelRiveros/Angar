import { tienda } from "./opciones.js";

// Cómo se muestra cada estado (MPE-07). Las reglas de qué paso se puede dar las decide el servidor.
export const PASOS = ["recibido", "confirmado", "listo", "entregado"];
export const NOMBRE_ESTADO = { recibido: "Recibido", confirmado: "Confirmado", listo: "Listo", entregado: "Entregado", cancelado: "Cancelado" };
export const COLOR_ESTADO = {
  recibido: "bg-amber-100 text-amber-900",
  confirmado: "bg-sky-100 text-sky-900",
  listo: "bg-violet-100 text-violet-900",
  entregado: "bg-emerald-100 text-emerald-900",
  cancelado: "bg-slate-200 text-slate-700",
};
export const NOMBRE_ENTREGA = { retiro: tienda.textos.retiro, envio: tienda.textos.envio };

const AVANZAR = { confirmado: "Confirmar", listo: "Marcar listo", entregado: "Marcar entregado" };
/** El texto del botón de cada paso que ofrece el servidor. */
export function textoPaso({ estado, tipo }) {
  if (tipo === "avanzar") return AVANZAR[estado];
  if (tipo === "cancelar") return "Cancelar pedido";
  if (tipo === "reabrir") return "Reabrir";
  return `Volver a ${NOMBRE_ESTADO[estado]}`;
}

export const fechaHora = (fecha) => new Date(fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
