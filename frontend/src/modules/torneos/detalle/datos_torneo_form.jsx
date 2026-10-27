import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import TextareaField from "../../../controls/ui/textarea_field.jsx";
import { actualizarTorneo } from "../api/torneos_api.js";
import { useCambioTorneo, mensajeDe } from "./use_cambio_torneo.js";

const opcional = (max) => z.string().trim().max(max, `Hasta ${max} caracteres.`);
const esquema = z.object({
  nombre: z.string().trim().min(3, "Mínimo 3 caracteres.").max(120, "Hasta 120 caracteres."),
  descripcion: opcional(2000),
  sede: opcional(120),
  direccion: opcional(200),
  localidad: opcional(120),
  contacto: opcional(120),
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
}).refine((d) => !d.fecha_inicio || !d.fecha_fin || d.fecha_fin >= d.fecha_inicio, { path: ["fecha_fin"], message: "No puede ser anterior al inicio." });

const CAMPOS = ["nombre", "descripcion", "sede", "direccion", "localidad", "contacto", "fecha_inicio", "fecha_fin"];
const valoresDe = (torneo) => Object.fromEntries(CAMPOS.map((c) => [c, torneo[c] ?? ""]));

export default function DatosTorneoForm({ torneo, editable }) {
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(esquema), values: valoresDe(torneo) });
  const guardar = useCambioTorneo(torneo.id, (datos) => actualizarTorneo(torneo.id, datos), { onExito: (r) => reset(valoresDe(r.data)) });

  return (
    <form noValidate onSubmit={handleSubmit((datos) => guardar.mutate(datos))} className="space-y-4">
      <fieldset disabled={!editable || guardar.isPending} className="space-y-4">
        <InputField label="Nombre del torneo" name="nombre" maxLength={120} register={register} error={errors.nombre?.message} />
        <TextareaField label="Descripción (opcional)" name="descripcion" rows={3} placeholder="Ej: Torneo de verano con zonas y llaves, cancha techada." register={register} error={errors.descripcion?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Empieza" name="fecha_inicio" type="date" register={register} error={errors.fecha_inicio?.message} />
          <InputField label="Termina" name="fecha_fin" type="date" register={register} error={errors.fecha_fin?.message} />
          <InputField label="Sede" name="sede" placeholder="Ej: Club Norte" maxLength={120} register={register} error={errors.sede?.message} />
          <InputField label="Localidad" name="localidad" placeholder="Ej: Formosa" maxLength={120} register={register} error={errors.localidad?.message} />
          <InputField label="Dirección" name="direccion" placeholder="Ej: Av. Siempre Viva 123" maxLength={200} register={register} error={errors.direccion?.message} />
          <InputField label="Contacto de la organización" name="contacto" placeholder="WhatsApp, teléfono o email" maxLength={120} register={register} error={errors.contacto?.message} />
        </div>
      </fieldset>
      {guardar.isError && <ErrorBanner message={mensajeDe(guardar.error, "No pudimos guardar los cambios.")} />}
      {editable && (
        <button type="submit" disabled={!isDirty || guardar.isPending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-(--kt-petrol) px-5 text-sm font-bold text-white hover:bg-(--kt-night) disabled:opacity-50 sm:w-auto">
          {guardar.isPending ? "Guardando…" : "Guardar datos"}
        </button>
      )}
    </form>
  );
}
