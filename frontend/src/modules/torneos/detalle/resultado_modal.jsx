import { useState } from "react";
import { useForm } from "react-hook-form";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import { FORMATOS_PARTIDO } from "../../../../../torneo_config.js";
import { mensajeDe } from "./use_cambio_torneo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const CAMPO = "h-12 w-full max-w-20 justify-self-center rounded-xl border border-slate-300 text-center text-lg font-bold";

/** Marcador por sets. Que el resultado sea posible (6-5 no, 7-5 sí…) lo valida el servidor según el formato. */
export default function ResultadoModal({ partido, guardar, borrar, onClose }) {
  const formato = FORMATOS_PARTIDO[partido.formato];
  const renglones = Array.from({ length: formato.sets }, (_, i) => i);
  const { register, handleSubmit } = useForm({
    defaultValues: Object.fromEntries(renglones.flatMap((i) => [[`a${i}`, partido.sets?.[i]?.[0] ?? ""], [`b${i}`, partido.sets?.[i]?.[1] ?? ""]])),
  });
  const [aviso, setAviso] = useState("");
  const ocupado = guardar.isPending || borrar.isPending;

  function enviar(valores) {
    const sets = [];
    for (const i of renglones) {
      const [a, b] = [valores[`a${i}`], valores[`b${i}`]].map((v) => String(v).trim());
      if (a === "" && b === "") continue;
      if (a === "" || b === "") return setAviso(`Completá los dos números del set ${i + 1}.`);
      sets.push([Number(a), Number(b)]);
    }
    if (!sets.length) return setAviso("Cargá al menos el primer set.");
    setAviso("");
    guardar.mutate({ partidoId: partido.id, sets });
  }

  const etiqueta = (i) => (formato.superTieBreak && i === formato.sets - 1 ? "Super tie-break" : formato.sets === 1 ? "Set" : `Set ${i + 1}${i === 2 ? " (si se jugó)" : ""}`);
  return (
    <Modal title="Resultado del partido" onClose={onClose} busy={ocupado}>
      <form noValidate onSubmit={handleSubmit(enviar)} className="space-y-4">
        <p className="text-sm text-(--kt-ink-soft)">{formato.etiqueta}</p>
        {/* Grilla: una columna por pareja, un renglón por set. Entra en 320 px. */}
        <div className="grid grid-cols-[minmax(4.5rem,auto)_1fr_1fr] items-center gap-x-2 gap-y-3">
          <span />
          <span className="text-center text-sm font-bold break-words">{partido.pareja1?.nombre}</span>
          <span className="text-center text-sm font-bold break-words">{partido.pareja2?.nombre}</span>
          {renglones.map((i) => [
            <span key={`e${i}`} className="text-sm font-semibold text-(--kt-ink)">{etiqueta(i)}</span>,
            <input key={`a${i}`} type="number" inputMode="numeric" min={0} max={99} aria-label={`${etiqueta(i)}: games de ${partido.pareja1?.nombre}`} className={CAMPO} {...register(`a${i}`)} />,
            <input key={`b${i}`} type="number" inputMode="numeric" min={0} max={99} aria-label={`${etiqueta(i)}: games de ${partido.pareja2?.nombre}`} className={CAMPO} {...register(`b${i}`)} />,
          ])}
        </div>
        {aviso && <p role="alert" className="text-sm text-red-700">{aviso}</p>}
        {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar el resultado.")} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {partido.sets ? (
            <button type="button" disabled={ocupado} onClick={() => borrar.mutate(partido.id)} className={`${BOTON} border-red-200 bg-white text-red-800`}>Borrar resultado</button>
          ) : <span />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={onClose} disabled={ocupado} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Cancelar</button>
            <button type="submit" disabled={ocupado} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>{guardar.isPending ? "Guardando…" : "Guardar resultado"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
