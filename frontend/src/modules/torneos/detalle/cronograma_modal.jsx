import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { previsualizarCronograma, aplicarCronograma } from "../api/torneos_api.js";
import { mensajeDe } from "./use_cambio_torneo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const MAX_DIAS = 7;
const OPCIONES_MINUTOS = [30, 45, 60, 75, 90, 120].map((m) => ({ value: String(m), label: m < 60 ? `${m} minutos` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` }));
const OPCIONES_DESCANSO = [["0", "Sin descanso"], ["1", "1 turno (recomendado)"], ["2", "2 turnos"], ["3", "3 turnos"]].map(([value, label]) => ({ value, label }));
const dia = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

// Mismas reglas que el servidor (cronograma_reglas.js); acá solo para avisar antes de enviar.
const esquema = z.object({
  dias: z.array(z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí el día.") })).min(1).max(MAX_DIAS),
  desde: z.string().regex(/^\d{2}:\d{2}$/, "Elegí la hora."),
  hasta: z.string().regex(/^\d{2}:\d{2}$/, "Elegí la hora."),
  canchas: z.coerce.number().int("Un número entero.").min(1, "Al menos 1 cancha.").max(20, "Hasta 20 canchas."),
  minutos: z.string(),
  descanso: z.string(),
  incluir_llave: z.boolean(),
}).refine((d) => d.hasta > d.desde, { path: ["hasta"], message: "Tiene que ser después de \"desde\"." });

const aCuerpo = (d) => ({ dias: d.dias.map((x) => x.fecha), desde: d.desde, hasta: d.hasta, canchas: d.canchas, minutos: Number(d.minutos), descanso: Number(d.descanso), incluir_llave: d.incluir_llave });
const diasIniciales = (torneo) => [...new Set([torneo.fecha_inicio, torneo.fecha_fin].filter(Boolean))].map((fecha) => ({ fecha }));

/**
 * Cronograma automático: con días, franja, canchas y duración del turno reparte los partidos sin
 * horario. Primero muestra cómo queda; guardar avisa a cada jugador con todos sus horarios.
 */
export default function CronogramaModal({ torneo, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [vista, setVista] = useState(null);
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { dias: diasIniciales(torneo).length ? diasIniciales(torneo) : [{ fecha: "" }], desde: "18:00", hasta: "23:00", canchas: 2, minutos: "60", descanso: "1", incluir_llave: true },
  });
  const dias = useFieldArray({ control, name: "dias" });
  const previsualizar = useMutation({ mutationFn: (d) => previsualizarCronograma(torneo.id, aCuerpo(d)), onSuccess: setVista });
  const guardar = useMutation({
    mutationFn: (d) => aplicarCronograma(torneo.id, aCuerpo(d)),
    onSuccess: async (r) => {
      toast.success(r.mensaje);
      // Zonas y llave de todas las categorías tienen horarios nuevos.
      await queryClient.invalidateQueries({ queryKey: ["torneos", Number(torneo.id)] });
      onClose();
    },
  });
  const ocupado = previsualizar.isPending || guardar.isPending;
  const porDia = Object.entries((vista?.asignados ?? []).reduce((acc, a) => ({ ...acc, [a.fecha]: [...(acc[a.fecha] ?? []), a] }), {}));

  return (
    <Modal title="Armar cronograma" onClose={onClose} busy={ocupado} className="sm:max-w-2xl">
      <form noValidate onSubmit={handleSubmit((d) => previsualizar.mutate(d))} className="space-y-4" onChange={() => setVista(null)}>
        <p className="text-sm text-(--kt-ink-soft)">
          Reparte los partidos que no tienen horario: una pareja nunca juega dos a la vez y descansa entre partido y partido. La llave va después de las zonas.
          Los horarios que ya cargaste a mano se respetan.
        </p>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-(--kt-ink)">Días</legend>
          {dias.fields.map((campo, i) => (
            <div key={campo.id} className="flex items-end gap-2">
              <div className="flex-1"><InputField label={`Día ${i + 1}`} hideLabel aria-label={`Día ${i + 1}`} name={`dias.${i}.fecha`} type="date" register={register} error={errors.dias?.[i]?.fecha?.message} /></div>
              {dias.fields.length > 1 && (
                <button type="button" onClick={() => { dias.remove(i); setVista(null); }} aria-label={`Quitar día ${i + 1}`} className={`${BOTON} border-slate-300 bg-white text-slate-700`}><Trash2 size={15} aria-hidden="true" /></button>
              )}
            </div>
          ))}
          {dias.fields.length < MAX_DIAS && (
            <button type="button" onClick={() => { dias.append({ fecha: "" }); setVista(null); }} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-(--kt-teal-700) hover:underline">
              <Plus size={15} aria-hidden="true" /> Agregar otro día
            </button>
          )}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField label="Desde" name="desde" type="time" register={register} error={errors.desde?.message} />
          <InputField label="Hasta" name="hasta" type="time" register={register} error={errors.hasta?.message} helperText="El último partido termina antes de esta hora." />
          <InputField label="Canchas" name="canchas" type="number" inputMode="numeric" min={1} max={20} register={register} error={errors.canchas?.message} />
          <SelectField label="Duración del turno" name="minutos" options={OPCIONES_MINUTOS} showPlaceholderOption={false} register={register} />
          <SelectField label="Descanso entre partidos de una pareja" name="descanso" options={OPCIONES_DESCANSO} showPlaceholderOption={false} register={register} />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" {...register("incluir_llave")} /> Reservar también los turnos de la llave (las parejas se completan cuando terminan las zonas)
        </label>
        {previsualizar.isError && <ErrorBanner message={mensajeDe(previsualizar.error, "No pudimos armar el cronograma.")} />}
        {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar el cronograma.")} />}

        {vista && (
          <section aria-label="Vista previa del cronograma" className="space-y-3 rounded-2xl bg-(--kt-bg-soft) p-3">
            <p className="text-sm font-semibold text-(--kt-ink)">
              {vista.asignados.length} partido{vista.asignados.length === 1 ? "" : "s"} con horario
              {vista.ya_programados ? ` · ${vista.ya_programados} ya tenían horario y se respetan` : ""}
            </p>
            {vista.sin_lugar.length > 0 && (
              <p className="flex gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span>{vista.sin_lugar.length} partido{vista.sin_lugar.length === 1 ? " no entró" : "s no entraron"}: sumá un día, una cancha o alargá la franja. Igual podés guardar y cargarlos a mano.</span>
              </p>
            )}
            {porDia.map(([fecha, lista]) => (
              <div key={fecha}>
                <h3 className="text-sm font-bold text-(--kt-ink) first-letter:uppercase">{dia.format(new Date(`${fecha}T12:00:00-03:00`))}</h3>
                <ul className="mt-1 divide-y divide-white rounded-xl bg-white text-sm">
                  {lista.map((a) => (
                    <li key={a.id} className="flex flex-wrap gap-x-3 px-3 py-1.5">
                      <span className="w-24 shrink-0 font-mono font-semibold">{a.hora} · {a.cancha.replace("Cancha ", "C")}</span>
                      <span className="min-w-0 flex-1"><span className="text-(--kt-ink-soft)">{a.categoria} · {a.etapa}:</span> {a.partido}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={ocupado} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Cancelar</button>
          <button type="submit" disabled={ocupado} className={`${BOTON} border-slate-300 bg-white text-(--kt-ink)`}>{previsualizar.isPending ? "Armando…" : vista ? "Volver a calcular" : "Ver cómo queda"}</button>
          {vista && vista.asignados.length > 0 && (
            <button type="button" disabled={ocupado} onClick={handleSubmit((d) => guardar.mutate(d))} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>
              {guardar.isPending ? "Guardando…" : "Guardar cronograma"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
