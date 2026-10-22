import { orderConfig, transitionProblem } from "../../../order_config.js";
const tones = {
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  accent: "bg-violet-50 text-violet-800 border-violet-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
};
export { orderConfig, transitionProblem };
export const ESTADOS = Object.fromEntries(Object.entries(orderConfig.states).map(([key, state]) => [key, { ...state, className: tones[state.tone] }]));
export const ESTADOS_PAGO = {
  pendiente: { label: "Sin cobros", className: tones.danger },
  parcial: { label: "Cobro parcial", className: tones.warning },
  pagado: { label: "Cobrado", className: tones.success },
};
