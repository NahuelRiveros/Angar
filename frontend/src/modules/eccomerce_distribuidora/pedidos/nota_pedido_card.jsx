import { useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { orderConfig, ESTADOS } from "../../../config/order_config.js";
import { storefrontConfig } from "../../../config/storefront_config.js";
import OrderSummary from "../../../controls/pedidos/order_summary.jsx";
import { money } from "../../../controls/pedidos/order_format.js";
import OfflinePaymentForm from "../../../controls/pedidos/offline_payment_form.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import ActionButton from "../../../controls/ui/action_button.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { ListaComprobantes } from "./pago_transferencia.jsx";
const person = (u) => u?.persona ? [u.persona.nombre, u.persona.apellido].filter(Boolean).join(" ") : "Equipo";
const date = (value) => new Date(value).toLocaleString("es-AR");

export default function NotaPedidoCard({ nota, operatorId, puedeCobrar = false, puedeCambiarEstado = false, onCambiarEstado, onRegistrarPago, onAnularPago, onAceptarComprobante, onRechazarComprobante, onExportar }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const balance = Math.round((Number(nota.total) - Number(nota.monto_pagado || 0)) * 100) / 100;
  const paymentKey = storefrontConfig.storageKey + ":payment:" + operatorId + ":" + nota.id;
  let pendingPayment = false;
  try { pendingPayment = !!sessionStorage.getItem(paymentKey); } catch { /* formulario informa el error al guardar */ }
  function prepare(next) { setAction(next); setReason(""); setAmount(next.receipt ? String(balance) : ""); setError(""); }
  async function confirm(event) {
    event.preventDefault(); if (busy) return;
    // El campo no usa React Hook Form, así que `required` no frena el envío: se valida acá.
    if (needsReason && reason.trim().length < 3) { setError("Indicá el motivo (al menos 3 letras)."); return; }
    setBusy(true); setError("");
    try {
      if (action.payment) await onAnularPago(nota.id, action.payment.id, reason);
      else if (action.receipt === "aceptar") await onAceptarComprobante(nota.id, action.comprobante.id, Number(amount));
      else if (action.receipt === "rechazar") await onRechazarComprobante(nota.id, action.comprobante.id, reason);
      else await onCambiarEstado(nota.id, action.state, { motivo: reason || null, expectedState: action.previous });
      setAction(null);
    } catch (e) { setError(e.response?.data?.mensaje || "No se pudo guardar el cambio. Reintentá."); }
    finally { setBusy(false); }
  }
  async function exportFile() {
    setBusy(true); setError("");
    try { await onExportar(nota.id); } catch { setError("No se pudo exportar el pedido."); } finally { setBusy(false); }
  }
  const needsReason = action && (action.payment || action.receipt === "rechazar" || orderConfig.reasonRequired.includes(action.previous + ":" + action.state));
  const pendientes = nota.comprobantes?.filter((c) => c.estado === "pendiente").length ?? 0;
  const tituloModal = action?.payment ? "Anular registro de cobro" : action?.receipt === "aceptar" ? "Aceptar comprobante" : action?.receipt === "rechazar" ? "Rechazar comprobante" : "Confirmar cambio de estado";
  const textoModal = action?.payment ? "Se anulará el registro de " + money(action.payment.monto) + ". Esta acción no realiza una devolución de dinero."
    : action?.receipt === "aceptar" ? "Registrá el importe que viste acreditado en la cuenta. Queda como cobro por transferencia."
    : action?.receipt === "rechazar" ? "El cliente recibe un mail con el motivo y puede adjuntar otro comprobante."
    : action && "Pedido #" + nota.id + ": " + ESTADOS[action.previous].label + " → " + ESTADOS[action.state].label;
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="flex w-full flex-col gap-3 p-4 text-left hover:bg-slate-50 sm:flex-row sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-bold">Pedido #{nota.id} · {person(nota.usuario)}</h2>
        <p className="break-all text-sm text-slate-500">{nota.usuario?.persona?.email}{nota.usuario?.persona?.celular && <> · Cel. {nota.usuario.persona.celular}</>}</p>
        <p className="text-xs text-slate-500">{date(nota.fecha_alta)}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{open ? "Ocultar detalle" : "Ver detalle y gestionar"}</span>
      </div>
      <OrderSummary order={nota} />
    </button>
    {open && <div id={id} className="space-y-4 border-t border-slate-200 p-4">
      {!action && <ErrorBanner message={error} />}
      <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
        <p className="font-semibold">Datos de entrega</p>
        <p className="break-words">{[nota.direccion, nota.localidad, nota.departamento, nota.provincia].filter(Boolean).join(", ")}{nota.codigo_postal ? " · CP " + nota.codigo_postal : ""}</p>
        <p>CUIT: {nota.cuit || "—"} {nota.razon_social}</p>
        <p>Lista de precios: {nota.lista_precio_nombre ?? "General"}</p>
        {nota.notas && <p className="whitespace-pre-wrap break-words">Observaciones: {nota.notas}</p>}
      </div>
      <ul className="divide-y text-sm">{nota.items?.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2">
        <span className="min-w-0 break-words">{item.cantidad} × {item.nombre_producto}{item.variedad_nombre ? " (" + item.variedad_nombre + ")" : ""}</span>
        <span>{money(item.subtotal)}</span>
      </li>)}</ul>
      <div className="flex flex-wrap gap-2">
        {puedeCambiarEstado && (orderConfig.transitions[nota.estado] || []).map((state) => <ActionButton key={state} disabled={busy} onClick={() => prepare({ state, previous: nota.estado })}>Pasar a {ESTADOS[state].label.toLowerCase()}</ActionButton>)}
        <ActionButton disabled={busy} onClick={exportFile}>Exportar Excel</ActionButton>
      </div>
      {nota.comprobantes?.length > 0 && <section className="space-y-3" aria-label="Comprobantes de transferencia">
        <h3 className="font-bold">Comprobantes de transferencia{pendientes ? ` · ${pendientes} para revisar` : ""}</h3>
        <ListaComprobantes notaId={nota.id} comprobantes={nota.comprobantes} acciones={(c) => {
          if (c.estado === "pendiente" && puedeCobrar) return <div className="flex flex-wrap gap-2">
            <ActionButton disabled={busy || nota.estado === "cancelada"} onClick={() => prepare({ receipt: "aceptar", comprobante: c })}>Aceptar y registrar cobro</ActionButton>
            <button type="button" disabled={busy} onClick={() => prepare({ receipt: "rechazar", comprobante: c })} className="min-h-11 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">Rechazar</button>
          </div>;
          if (c.estado !== "pendiente" && c.revisado_por_usuario) return <p className="text-xs text-slate-500">Revisado por {person(c.revisado_por_usuario)} · {date(c.revisado_en)}</p>;
          return null;
        }} />
        {!puedeCobrar && pendientes > 0 && <p className="text-xs text-slate-500">Un supervisor o administrador verifica la acreditación y registra el cobro.</p>}
      </section>}
      <section className="space-y-3" aria-label="Cobros del pedido">
        <h3 className="font-bold">Cobros registrados</h3>
        {nota.estado === "cancelada" && Number(nota.monto_pagado) > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Este pedido cancelado tiene dinero recibido. Coordiná su resolución con el cliente y dejá constancia fuera de este registro. Anular un registro no devuelve dinero.</p>}
        {!nota.pagos?.length && <p className="text-sm text-slate-500">Todavía no hay cobros registrados.</p>}
        {[...(nota.pagos || [])].sort((a,b) => new Date(a.registrado_en) - new Date(b.registrado_en)).map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="min-w-0 break-words">
            <p className="font-semibold">{money(p.monto)} · {orderConfig.paymentMethods.find((m) => m.value === p.metodo)?.label || "Medio no informado"} {p.anulado_en && "· Registro anulado"}</p>
            <p>{person(p.registrado_por_usuario)} · {date(p.registrado_en)}</p>
            {p.nota && <p>{p.nota}</p>}
            {p.anulado_en && <p className="text-slate-500">Anulado por {person(p.anulado_por_usuario)}: {p.anulacion_motivo || "Sin motivo informado"} · {date(p.anulado_en)}</p>}
          </div>
          {!p.anulado_en && puedeCobrar && <button type="button" disabled={busy} onClick={() => prepare({ payment: p })} className="min-h-11 rounded-xl border border-rose-200 px-3 text-rose-700">Anular registro</button>}
        </div>)}
        {puedeCobrar && ((balance > 0 && nota.estado !== "cancelada") || pendingPayment) && <OfflinePaymentForm storageKey={paymentKey} balance={balance} methods={orderConfig.paymentMethods} onSubmit={(payload) => onRegistrarPago(nota.id, payload)} />}
      </section>
      <section aria-label="Historial de estados" className="space-y-2">
        <h3 className="font-bold">Historial de estados</h3>
        {!nota.historial_estados?.length && <p className="text-sm text-slate-500">Pedido anterior al historial de cambios.</p>}
        <ol className="space-y-2 text-sm">{[...(nota.historial_estados || [])].sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((entry) => <li key={entry.id} className="border-l-2 border-slate-200 pl-3">
          <p className="font-semibold">{entry.anterior ? (ESTADOS[entry.anterior]?.label || entry.anterior) + " → " : ""}{ESTADOS[entry.nuevo]?.label || entry.nuevo}</p>
          <p className="text-slate-500">{person(entry.autor)} · {date(entry.fecha)}</p>
          {entry.motivo && <p className="break-words">{entry.motivo}</p>}
        </li>)}</ol>
      </section>
    </div>}
    {action && <Modal title={tituloModal} onClose={() => setAction(null)} busy={busy}>
      <form onSubmit={confirm} className="space-y-4">
        <p>{textoModal}</p>
        <ErrorBanner message={error} />
        {action.receipt === "aceptar"
          ? <InputField label="Importe acreditado" type="number" inputMode="decimal" min="0.01" step="0.01" max={balance} required value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy} />
          : <InputField label={needsReason ? "Motivo" : "Observación (opcional)"} required={!!needsReason} minLength={needsReason ? 3 : undefined} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} />}
        <ActionButton type="submit" disabled={busy}>{busy ? "Guardando…" : action.receipt === "aceptar" ? "Aceptar y registrar cobro" : action.receipt === "rechazar" ? "Rechazar comprobante" : "Confirmar cambio"}</ActionButton>
      </form>
    </Modal>}
  </article>;
}
