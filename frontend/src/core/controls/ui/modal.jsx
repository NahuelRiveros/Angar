import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
// Dialog nativo: foco contenido, Escape y restitución del foco.
export default function Modal({ open = true, onClose, title, children, className = "", busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId}
    onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}
    onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-(--kt-border) bg-white p-0 text-(--kt-ink) shadow-xl backdrop:bg-slate-950/50 ${className}`}>
    <div className="flex items-center justify-between gap-3 border-b border-(--kt-border) p-4">
      <h2 id={titleId} className="text-lg font-bold">{title}</h2>
      <button type="button" aria-label="Cerrar" disabled={busy} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100"><X size={20} /></button>
    </div>
    <div className="p-4">{children}</div>
  </dialog>;
}
