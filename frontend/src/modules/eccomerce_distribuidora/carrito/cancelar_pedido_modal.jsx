import { useState } from "react";
import Modal from "../../../controls/ui/modal.jsx";
import ActionButton from "../../../controls/ui/action_button.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import TextareaField from "../../../controls/ui/textarea_field.jsx";

export default function CancelarPedidoModal({ nota, busy, error, onClose, onCancelar }) {
  const [motivo, setMotivo] = useState("");
  const [faltaMotivo, setFaltaMotivo] = useState(false);
  function enviar(volverAlCarrito) {
    if (busy) return;
    if (motivo.trim().length < 3) { setFaltaMotivo(true); return; }
    onCancelar({ motivo: motivo.trim(), volverAlCarrito });
  }
  return <Modal title={`Cancelar pedido #${nota.id}`} onClose={onClose} busy={busy}>
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Si querés cambiar algo, elegí <strong>Cancelar y volver a armar</strong>: los productos vuelven a tu carrito con el precio de hoy para que lo corrijas y lo envíes de nuevo.</p>
      <ErrorBanner message={error} />
      <TextareaField name="motivo-cancelacion" label="¿Por qué lo cancelás?" rows={3} value={motivo} disabled={busy}
        error={faltaMotivo && motivo.trim().length < 3 ? "Contanos el motivo (al menos 3 letras)." : undefined}
        onChange={(e) => setMotivo(e.target.value.slice(0, 500))} />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={() => enviar(false)} className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Solo cancelar</button>
        <ActionButton disabled={busy} onClick={() => enviar(true)}>{busy ? "Cancelando…" : "Cancelar y volver a armar"}</ActionButton>
      </div>
    </div>
  </Modal>;
}
