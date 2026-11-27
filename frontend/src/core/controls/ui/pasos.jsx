import { Check } from "lucide-react";
import { formatearFechaHora } from "../../utils/formatear_fecha.js";

/**
 * En qué paso va algo (un pedido, un turno) y cuándo llegó a cada uno.
 * `pasos`: [{ clave, texto }] en orden. `actual`: la clave del paso de hoy. `fechas`: { clave: fecha }.
 */
export default function Pasos({ pasos, actual, fechas = {} }) {
  const indice = pasos.findIndex((p) => p.clave === actual);
  return (
    <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }} aria-label={`Estado: ${pasos[indice]?.texto ?? actual}`}>
      {pasos.map((paso, i) => {
        const hecho = i <= indice;
        return (
          <li key={paso.clave} aria-current={i === indice ? "step" : undefined} className="text-center">
            <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 ${hecho ? "border-(--kt-teal-700) bg-(--kt-teal-700) text-white" : "border-slate-300 bg-white text-slate-400"}`}>
              {hecho ? <Check size={20} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`mt-1 block text-sm ${i === indice ? "font-bold" : hecho ? "" : "text-(--kt-ink-soft)"}`}>{paso.texto}</span>
            {hecho && fechas[paso.clave] && <span className="block text-xs text-(--kt-ink-soft)">{formatearFechaHora(fechas[paso.clave])}</span>}
          </li>
        );
      })}
    </ol>
  );
}
