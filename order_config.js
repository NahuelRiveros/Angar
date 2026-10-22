// Flujo comercial compartido entre la API y la interfaz. No procesa pagos.
export const orderConfig = {
  // Quién ve, gestiona o cobra pedidos lo deciden los permisos (permisos_config.js).
  // Comprobantes de transferencia que adjunta el comprador.
  receipts: { maxBytes: 5 * 1024 * 1024, maxPerOrder: 5, formats: ["jpg", "png", "webp", "pdf"] },
  states: {
    pendiente: { label: "Recibido", tone: "warning" },
    confirmado: { label: "Confirmado", tone: "accent" },
    en_curso: { label: "En preparación", tone: "info" },
    entregado: { label: "Entregado", tone: "success" },
    cancelada: { label: "Cancelado", tone: "danger" },
  },
  transitions: {
    pendiente: ["confirmado", "cancelada"],
    confirmado: ["pendiente", "en_curso", "cancelada"],
    en_curso: ["confirmado", "entregado", "cancelada"],
    entregado: ["en_curso"],
    cancelada: ["pendiente"],
  },
  // El stock se descuenta al entrar a estos estados y vuelve al salir de ellos.
  stockStates: ["confirmado", "en_curso", "entregado"],
  // Antes de que el equipo lo revise, el comprador puede cancelarlo él mismo.
  buyerCancelableStates: ["pendiente"],
  // Preparación/entrega y cobro son ejes independientes; permite venta a cuenta.
  // Para exigir un cobro previo en otro cliente: ["entregado"], por ejemplo.
  paymentRequiredStates: [],
  reasonRequired: [
    "confirmado:pendiente", "en_curso:confirmado", "entregado:en_curso", "cancelada:pendiente",
    "pendiente:cancelada", "confirmado:cancelada", "en_curso:cancelada",
  ],
  paymentMethods: [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
    { value: "otro", label: "Otro medio" },
  ],
};
export function transitionProblem(from, to, reason, paymentState) {
  if (from === to) return null;
  if (!orderConfig.transitions[from]?.includes(to)) return "Ese cambio de estado no está permitido.";
  if (orderConfig.paymentRequiredStates.includes(to) && paymentState === "pendiente") return "Registrá un cobro antes de avanzar a este estado.";
  if (orderConfig.reasonRequired.includes(from + ":" + to) && String(reason ?? "").trim().length < 3) return "Indicá el motivo del cambio.";
  return null;
}
/** Por qué no se puede adjuntar otro comprobante a este pedido, o null si se puede. */
export function receiptProblem(order, previousCount) {
  if (order.estado === "cancelada") return "El pedido está cancelado: no hace falta pagarlo.";
  if (order.estado_pago === "pagado") return "Este pedido ya figura como cobrado.";
  if (previousCount >= orderConfig.receipts.maxPerOrder) return `Llegaste al máximo de ${orderConfig.receipts.maxPerOrder} comprobantes para este pedido. Comunicate con nosotros.`;
  return null;
}
