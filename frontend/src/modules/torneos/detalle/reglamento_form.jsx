import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import TextareaField from "../../../controls/ui/textarea_field.jsx";
import { actualizarTorneo } from "../api/torneos_api.js";
import { useCambioTorneo, mensajeDe } from "./use_cambio_torneo.js";

const esquema = z.object({ reglamento: z.string().max(10000, "Hasta 10.000 caracteres.") });

export default function ReglamentoForm({ torneo, editable }) {
  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(esquema), values: { reglamento: torneo.reglamento ?? "" } });
  const guardar = useCambioTorneo(torneo.id, (datos) => actualizarTorneo(torneo.id, datos), { onExito: (r) => reset({ reglamento: r.data.reglamento ?? "" }) });
  const largo = useWatch({ control, name: "reglamento" })?.length ?? 0;

  return (
    <form noValidate onSubmit={handleSubmit((datos) => guardar.mutate(datos))} className="space-y-3">
      <p className="text-sm text-(--kt-ink-soft)">Formato de los partidos, puntualidad, pelotas, desempates… Lo van a leer las parejas antes de anotarse.</p>
      <fieldset disabled={!editable || guardar.isPending}>
        <TextareaField label="Reglamento" name="reglamento" rows={12} register={register} error={errors.reglamento?.message}
          placeholder={"Ej:\n- Zonas: un set a 6 games con tie-break.\n- Llaves: al mejor de 3 sets, el tercero super tie-break.\n- Tolerancia: 15 minutos."} />
      </fieldset>
      <p className="text-xs text-(--kt-ink-soft)">{largo.toLocaleString("es-AR")} / 10.000 caracteres</p>
      {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar el reglamento.")} />}
      {editable && (
        <button type="submit" disabled={!isDirty || guardar.isPending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-(--kt-petrol) px-5 text-sm font-bold text-white hover:bg-(--kt-night) disabled:opacity-50 sm:w-auto">
          {guardar.isPending ? "Guardando…" : "Guardar reglamento"}
        </button>
      )}
    </form>
  );
}
