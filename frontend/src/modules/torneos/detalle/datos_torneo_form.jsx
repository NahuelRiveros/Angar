import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Landmark } from "lucide-react";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import TextareaField from "../../../controls/ui/textarea_field.jsx";
import { esMontoValido, montoParaEnviar, MENSAJE_MONTO } from "../monto.js";
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
  monto_inscripcion: z.string().trim().refine(esMontoValido, MENSAJE_MONTO),
  cobro_titular: opcional(80),
  cobro_banco: opcional(60),
  // Mismas reglas que el servidor (torneo_reglas.js): CBU/CVU de 22 números.
  cobro_cbu: z.string().trim().refine((v) => v === "" || /^\d{22}$/.test(v.replace(/[\s-]/g, "")), "El CBU o CVU tiene 22 números."),
  cobro_alias: z.string().trim().refine((v) => v === "" || /^[A-Za-z0-9.-]{6,20}$/.test(v), "Entre 6 y 20 letras, números, puntos o guiones."),
}).refine((d) => !d.fecha_inicio || !d.fecha_fin || d.fecha_fin >= d.fecha_inicio, { path: ["fecha_fin"], message: "No puede ser anterior al inicio." });

const CAMPOS = ["nombre", "descripcion", "sede", "direccion", "localidad", "contacto", "fecha_inicio", "fecha_fin", "monto_inscripcion", "cobro_titular", "cobro_banco", "cobro_cbu", "cobro_alias"];
const valoresDe = (torneo) => Object.fromEntries(CAMPOS.map((c) => [c, torneo[c] == null ? "" : String(torneo[c])]));

export default function DatosTorneoForm({ torneo, editable }) {
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(esquema), values: valoresDe(torneo) });
  const guardar = useCambioTorneo(torneo.id, (datos) => actualizarTorneo(torneo.id, datos), { onExito: (r) => reset(valoresDe(r.data)) });

  return (
    <form noValidate onSubmit={handleSubmit((datos) => guardar.mutate({ ...datos, monto_inscripcion: montoParaEnviar(datos.monto_inscripcion) }))} className="space-y-4">
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
        <fieldset className="space-y-3 rounded-2xl bg-(--kt-bg-soft) p-3 sm:p-4">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-(--kt-ink)"><Landmark size={16} aria-hidden="true" /> Cobro de la inscripción (opcional)</legend>
          <p className="text-xs text-(--kt-ink-soft)">Lo ven todos en la página del torneo. Las parejas transfieren y mandan el comprobante desde su cuenta; vos lo aprobás en Inscripciones y quedan confirmadas.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Monto por pareja" name="monto_inscripcion" inputMode="decimal" placeholder="Ej: 20000" register={register} error={errors.monto_inscripcion?.message}
              helperText="Se copia a las categorías nuevas; cada una puede tener el suyo." />
            <InputField label="Titular de la cuenta" name="cobro_titular" placeholder="Nombre y apellido o razón social" maxLength={80} register={register} error={errors.cobro_titular?.message} />
            <InputField label="Banco o billetera" name="cobro_banco" placeholder="Ej: Mercado Pago, Banco Nación" maxLength={60} register={register} error={errors.cobro_banco?.message} />
            <InputField label="CBU o CVU" name="cobro_cbu" inputMode="numeric" placeholder="22 números" maxLength={30} register={register} error={errors.cobro_cbu?.message} />
            <InputField label="Alias" name="cobro_alias" placeholder="Ej: club.norte.padel" maxLength={20} autoCapitalize="none" register={register} error={errors.cobro_alias?.message} />
          </div>
        </fieldset>
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
