import { ESTADOS, ESTADOS_COMPROBANTE, ESTADOS_PAGO } from "../../config/order_config.js";
import { money } from "./order_format.js";
export default function OrderSummary({ order }) {
  const state = ESTADOS[order.estado] || ESTADOS.pendiente;
  const payment = ESTADOS_PAGO[order.estado_pago] || ESTADOS_PAGO.pendiente;
  const receipt = order.comprobantes?.some((c) => c.estado === "pendiente") && { ...ESTADOS_COMPROBANTE.pendiente, label: "Comprobante en revisión" };
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">{[state, payment, receipt].filter(Boolean).map((s) => <span key={s.label} className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.className}`}>{s.label}</span>)}</div>
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <div><dt className="text-slate-500">Total</dt><dd className="font-bold">{money(order.total)}</dd></div>
      <div><dt className="text-slate-500">Cobrado</dt><dd>{money(order.monto_pagado)}</dd></div>
      <div><dt className="text-slate-500">Saldo</dt><dd className="font-bold">{money(Number(order.total) - Number(order.monto_pagado || 0))}</dd></div>
    </dl>
  </div>;
}
