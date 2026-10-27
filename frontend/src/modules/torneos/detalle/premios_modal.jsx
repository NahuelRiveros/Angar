import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { PUESTOS, LIMITES } from "../../../../../torneo_config.js";
import { guardarPremios } from "../api/torneos_api.js";
import { useCambioTorneo, mensajeDe } from "./use_cambio_torneo.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const OPCIONES_PUESTO = Object.entries(PUESTOS).map(([value, label]) => ({ value, label }));
// Al agregar, se propone el puesto siguiente que todavía no está.
const ORDEN_SUGERIDO = ["campeon", "subcampeon", "semifinalista", "cuartofinalista", "otro"];

const esquema = z.object({
  premios: z.array(z.object({
    puesto: z.string().min(1, "Elegí el puesto."),
    etiqueta: z.string().trim().max(40, "Hasta 40 caracteres."),
    descripcion: z.string().trim().min(1, "Describí el premio.").max(200, "Hasta 200 caracteres."),
  }).superRefine((p, ctx) => {
    if (p.puesto === "otro" && p.etiqueta.length < 2) ctx.addIssue({ code: "custom", path: ["etiqueta"], message: "Poné el nombre del puesto." });
  })).max(LIMITES.premiosPorCategoria),
});

export default function PremiosModal({ torneo, categoria, onClose }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { premios: categoria.premios.map(({ puesto, etiqueta, descripcion }) => ({ puesto, etiqueta: etiqueta ?? "", descripcion })) },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "premios" });
  const guardar = useCambioTorneo(torneo.id, ({ premios }) => guardarPremios(torneo.id, categoria.id, premios), { onExito: onClose });
  const actuales = useWatch({ control, name: "premios" }) ?? [];

  function agregar() {
    const usados = new Set(actuales.map((p) => p.puesto));
    append({ puesto: ORDEN_SUGERIDO.find((p) => !usados.has(p)) ?? "otro", etiqueta: "", descripcion: "" });
  }

  return (
    <Modal title={`Premios · ${categoria.nombre}`} onClose={onClose} busy={guardar.isPending} className="max-w-2xl">
      <form noValidate onSubmit={handleSubmit((datos) => guardar.mutate(datos))} className="space-y-4">
        {fields.length === 0 && <p className="text-sm text-(--kt-ink-soft)">Sin premios. Agregá el del campeón, el subcampeón o los que quieras.</p>}
        <ol className="space-y-3">
          {fields.map((campo, i) => (
            <li key={campo.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
                <SelectField label="Puesto" name={`premios.${i}.puesto`} options={OPCIONES_PUESTO} placeholder="Elegí" register={register} error={errors.premios?.[i]?.puesto?.message} />
                <InputField label="Premio" name={`premios.${i}.descripcion`} placeholder="Ej: $200.000 + trofeo" maxLength={200} register={register} error={errors.premios?.[i]?.descripcion?.message} />
              </div>
              {actuales[i]?.puesto === "otro" && (
                <div className="mt-3"><InputField label="Nombre del puesto" name={`premios.${i}.etiqueta`} placeholder="Ej: Fair play" maxLength={40} register={register} error={errors.premios?.[i]?.etiqueta?.message} /></div>
              )}
              <button type="button" onClick={() => remove(i)} className={`${BOTON} mt-3 border-red-200 bg-red-50 text-red-800`} aria-label={`Quitar premio ${i + 1}`}>
                <Trash2 size={15} aria-hidden="true" /> Quitar
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={agregar} disabled={fields.length >= LIMITES.premiosPorCategoria} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>
          <Plus size={16} aria-hidden="true" /> Agregar premio
        </button>
        {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar los premios.")} />}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={guardar.isPending} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Cancelar</button>
          <button type="submit" disabled={guardar.isPending} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>{guardar.isPending ? "Guardando…" : "Guardar premios"}</button>
        </div>
      </form>
    </Modal>
  );
}
