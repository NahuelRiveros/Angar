import { useState } from "react";
import { Minus, Plus } from "lucide-react";
export default function QuantityInput({ value, onChange, min = 1, max = 9999, disabled = false, label = "Cantidad" }) {
  const [draft, setDraft] = useState(null);
  const commit = (raw) => {
    const n = Number(raw); setDraft(null);
    if (!Number.isFinite(n) || raw === "") return;
    const next = Math.max(min, Math.min(max, Math.trunc(n)));
    if (next !== value) onChange(next);
  };
  return <div className="inline-flex shrink-0 items-center rounded-xl border border-(--kt-border) bg-white">
    <button type="button" aria-label={`Reducir ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => commit(value - 1)} className="flex h-11 w-11 items-center justify-center rounded-l-xl hover:bg-slate-100 disabled:opacity-40"><Minus size={16} /></button>
    <input type="number" inputMode="numeric" aria-label={label} min={min} max={max} step="1" value={draft ?? value} disabled={disabled}
      onChange={(e) => setDraft(e.target.value)} onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      className="h-11 w-14 min-w-0 bg-transparent text-center text-sm font-semibold tabular-nums outline-offset-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
    <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => commit(value + 1)} className="flex h-11 w-11 items-center justify-center rounded-r-xl hover:bg-slate-100 disabled:opacity-40"><Plus size={16} /></button>
  </div>;
}
