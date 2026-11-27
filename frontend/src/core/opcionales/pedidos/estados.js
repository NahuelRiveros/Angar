import { tienda } from "./opciones.js";

// Cómo se muestra cada estado (MPE-07). Las reglas de qué paso se puede dar las decide el servidor.
export const PASOS = ["recibido", "confirmado", "listo", "entregado"];
export const NOMBRE_ESTADO = { recibido: "Recibido", confirmado: "Confirmado", listo: "Listo", entregado: "Entregado", cancelado: "Cancelado" };
/** Tono de la etiqueta de cada estado (controls/ui/etiqueta.jsx). */
export const TONO_ESTADO = { recibido: "aviso", confirmado: "info", listo: "destacado", entregado: "exito", cancelado: "neutro" };
export const NOMBRE_ENTREGA = { retiro: tienda.textos.retiro, envio: tienda.textos.envio };

const AVANZAR = { confirmado: "Confirmar", listo: "Marcar listo", entregado: "Marcar entregado" };
/** El texto del botón de cada paso que ofrece el servidor. */
export function textoPaso({ estado, tipo }) {
  if (tipo === "avanzar") return AVANZAR[estado];
  if (tipo === "cancelar") return "Cancelar pedido";
  if (tipo === "reabrir") return "Reabrir";
  return `Volver a ${NOMBRE_ESTADO[estado]}`;
}

