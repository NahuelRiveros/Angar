import { useState } from "react";
import Modal from "../../../controls/ui/modal.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import ComboboxField from "../../../controls/ui/combobox_field.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60";

function Acciones({ onClose, guardando, bloqueado = false, etiqueta, peligro = false }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} disabled={guardando} className={`${BOTON} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Cancelar</button>
      <button type="submit" disabled={guardando || bloqueado} className={`${BOTON} text-white ${peligro ? "bg-rose-600 hover:bg-rose-700" : "bg-(--kt-petrol) hover:bg-(--kt-night)"}`}>
        {guardando ? "Guardando…" : etiqueta}
      </button>
    </div>
  );
}

/** Alta de familia o renombre de familia/categoría: solo pide el nombre. */
export function NombreModal({ titulo, ayuda, nombreInicial = "", guardando, error, onGuardar, onClose }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const limpio = nombre.trim();
  return (
    <Modal title={titulo} onClose={onClose} busy={guardando}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (limpio) onGuardar(limpio); }}>
        <InputField label="Nombre" type="text" value={nombre} maxLength={80} hideMessage onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Almacén" />
        {ayuda && <p className="text-sm text-slate-500">{ayuda}</p>}
        <ErrorBanner message={error} />
        <Acciones onClose={onClose} guardando={guardando} bloqueado={!limpio} etiqueta="Guardar" />
      </form>
    </Modal>
  );
}

/**
 * Elegir destino para mover categorías a otra familia o fusionar una familia/categoría
 * con otra. El texto explica qué va a pasar antes de confirmar, porque fusionar no se deshace.
 */
export function DestinoModal({ titulo, descripcion, etiqueta, opciones, resumen, guardando, error, onConfirmar, onClose, peligro = false }) {
  const [destino, setDestino] = useState("");
  return (
    <Modal title={titulo} onClose={onClose} busy={guardando}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (destino) onConfirmar(Number(destino)); }}>
        <p className="text-sm text-slate-600">{descripcion}</p>
        <ComboboxField label="Destino" required options={opciones} value={destino} onChange={setDestino} placeholder="Escribí para buscar…" />
        {destino && resumen && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{resumen(Number(destino))}</p>}
        <ErrorBanner message={error} />
        <Acciones onClose={onClose} guardando={guardando} bloqueado={!destino} etiqueta={etiqueta} peligro={peligro} />
      </form>
    </Modal>
  );
}
