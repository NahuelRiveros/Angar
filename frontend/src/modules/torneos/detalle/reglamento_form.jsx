import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText } from "lucide-react";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import TextareaField from "../../../controls/ui/textarea_field.jsx";
import { actualizarTorneo } from "../api/torneos_api.js";
import { useCambioTorneo, mensajeDe } from "./use_cambio_torneo.js";
import { MODELOS_REGLAMENTO, textoDeModelo } from "./reglamentos_modelo.js";

const MAXIMO = 10000;
const esquema = z.object({ reglamento: z.string().max(MAXIMO, "Hasta 10.000 caracteres.") });
const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const OPCIONES_MODELO = [{ value: "", label: "Elegí un modelo…" }, ...MODELOS_REGLAMENTO.map((m) => ({ value: m.codigo, label: m.etiqueta }))];

export default function ReglamentoForm({ torneo, editable }) {
  const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(esquema), values: { reglamento: torneo.reglamento ?? "" } });
  const guardar = useCambioTorneo(torneo.id, (datos) => actualizarTorneo(torneo.id, datos), { onExito: (r) => reset({ reglamento: r.data.reglamento ?? "" }) });
  const largo = useWatch({ control, name: "reglamento" })?.length ?? 0;
  const [modelo, setModelo] = useState("");
  const [confirmarReemplazo, setConfirmarReemplazo] = useState(false);

  // El modelo se copia al texto y queda sin guardar: el organizador lo revisa y edita antes.
  const usar = (modo) => {
    const texto = textoDeModelo(modelo, torneo);
    const actual = getValues("reglamento").trimEnd();
    setValue("reglamento", modo === "agregar" && actual ? `${actual}\n\n${texto}` : texto, { shouldDirty: true, shouldValidate: true });
    setConfirmarReemplazo(false);
  };

  return (
    <form noValidate onSubmit={handleSubmit((datos) => guardar.mutate(datos))} className="space-y-3">
      <p className="text-sm text-(--kt-ink-soft)">Formato de los partidos, puntualidad, pelotas, desempates… Lo van a leer las parejas antes de anotarse.</p>
      {editable && (
        <div className="space-y-2 rounded-2xl bg-(--kt-bg-soft) p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-(--kt-ink)"><FileText size={16} aria-hidden="true" /> Empezar desde un modelo</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="sm:flex-1">
              <SelectField label="Modelo de reglamento" showLabel={false} aria-label="Modelo de reglamento" name="modelo-reglamento" value={modelo} options={OPCIONES_MODELO}
                showPlaceholderOption={false} onChange={(e) => setModelo(e.target.value)} disabled={guardar.isPending} />
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={!modelo || guardar.isPending} onClick={() => (getValues("reglamento").trim() ? setConfirmarReemplazo(true) : usar("reemplazar"))}
                className={`${BOTON} flex-1 border-(--kt-petrol) bg-(--kt-petrol) text-white sm:flex-none`}>Usar este modelo</button>
              <button type="button" disabled={!modelo || !largo || guardar.isPending} onClick={() => usar("agregar")}
                className={`${BOTON} flex-1 border-slate-300 bg-white text-slate-700 sm:flex-none`}>Agregar al final</button>
            </div>
          </div>
          <p className="text-xs text-(--kt-ink-soft)">El texto queda para que lo revises y edites; recién se publica cuando tocás "Guardar reglamento". Completá lo marcado con [COMPLETAR].</p>
        </div>
      )}
      <fieldset disabled={!editable || guardar.isPending}>
        <TextareaField label="Reglamento" name="reglamento" rows={16} register={register} error={errors.reglamento?.message}
          placeholder={"Ej:\n- Zonas: un set a 6 games con tie-break.\n- Llaves: al mejor de 3 sets, el tercero super tie-break.\n- Tolerancia: 15 minutos."} />
      </fieldset>
      <p className={`text-xs ${largo > MAXIMO ? "font-semibold text-red-700" : "text-(--kt-ink-soft)"}`}>{largo.toLocaleString("es-AR")} / 10.000 caracteres</p>
      {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar el reglamento.")} />}
      {editable && (
        <button type="submit" disabled={!isDirty || guardar.isPending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-(--kt-petrol) px-5 text-sm font-bold text-white hover:bg-(--kt-night) disabled:opacity-50 sm:w-auto">
          {guardar.isPending ? "Guardando…" : "Guardar reglamento"}
        </button>
      )}
      <ConfirmDialog open={confirmarReemplazo} variant="warning" confirmLabel="Reemplazar"
        title="¿Reemplazar el reglamento actual?" message={`Se cambia el texto por el modelo "${MODELOS_REGLAMENTO.find((m) => m.codigo === modelo)?.etiqueta ?? ""}". Si querés conservarlo, usá "Agregar al final".`}
        onClose={() => setConfirmarReemplazo(false)} onConfirm={() => usar("reemplazar")} />
    </form>
  );
}
