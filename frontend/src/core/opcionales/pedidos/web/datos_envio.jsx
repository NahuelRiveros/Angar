import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import FormError from "../../../controls/ui/form_error.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import TextareaField from "../../../controls/ui/textarea_field.jsx";
import { mostrarErrores } from "../../../utils/errores.js";
import { BOTON_COMPRA } from "../../../controls/ui/estilos.js";
import { NOMBRE_ENTREGA } from "../estados.js";
import { tienda } from "../opciones.js";

// Lo mismo que controla el servidor (reglas.js): acá solo para avisar antes de enviar.
const esquema = z.object({
  nombre: z.string().trim().min(1, "Escribí tu nombre.").max(80, "Máximo 80 caracteres."),
  celular: z.string().refine((v) => { const n = v.replace(/\D/g, "").length; return n >= 8 && n <= 15; }, "Escribí tu celular con la característica, sin el 0 ni el 15."),
  entrega: z.enum(tienda.entregas, { error: "Elegí cómo lo recibís." }),
  direccion: z.string().trim().max(150, "Máximo 150 caracteres."),
  localidad: z.string().trim().max(80, "Máximo 80 caracteres."),
  nota: z.string().trim().max(500, "Máximo 500 caracteres."),
}).superRefine((d, ctx) => {
  if (d.entrega !== "envio") return;
  if (!d.direccion) ctx.addIssue({ code: "custom", path: ["direccion"], message: "Escribí la dirección de entrega." });
  if (!d.localidad) ctx.addIssue({ code: "custom", path: ["localidad"], message: "Escribí la localidad." });
});

/**
 * MPE-06 y MPE-12. `firma` cambia con el contenido del carrito: un carrito distinto es otro envío
 * (nueva clave). Mientras no cambie, reintentar usa la misma y no duplica el pedido (MPE-04).
 */
export default function DatosEnvio({ firma, enviando, onEnviar }) {
  const { usuario } = useAuth();
  const [clave, setClave] = useState(() => ({ firma, valor: crypto.randomUUID() }));
  if (clave.firma !== firma) setClave({ firma, valor: crypto.randomUUID() });
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" "), celular: "", entrega: tienda.entregas[0], direccion: "", localidad: "", nota: "" },
  });
  const entrega = useWatch({ control, name: "entrega" });

  // Un doble clic llega antes de que el botón se vea deshabilitado.
  const enCurso = useRef(false);
  async function enviar(datos) {
    if (enCurso.current) return;
    enCurso.current = true;
    try { await onEnviar(datos, clave.valor); }
    catch (error) { mostrarErrores(error, setError, "No pudimos enviar el pedido. Revisá la conexión y probá de nuevo."); }
    finally { enCurso.current = false; }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4 rounded-2xl border border-(--kt-border) bg-(--kt-bg-soft) p-4 sm:p-6">
      <h2 className="text-xl font-bold">Tus datos</h2>
      <InputField label="Nombre y apellido" name="nombre" register={register} error={errors.nombre?.message} autoComplete="name" />
      <InputField label="Celular" name="celular" type="tel" inputMode="tel" register={register} error={errors.celular?.message} autoComplete="tel" helperText="Te escribimos por acá para coordinar." />
      {tienda.entregas.length === 1 ? <p className="font-semibold">{NOMBRE_ENTREGA[entrega]}</p> : (
      <fieldset>
        <legend className="mb-2 font-semibold">¿Cómo lo recibís?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {tienda.entregas.map((valor) => [valor, NOMBRE_ENTREGA[valor]]).map(([valor, texto]) => (
            <label key={valor} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 font-semibold ${entrega === valor ? "border-(--kt-teal-700) ring-2 ring-(--kt-teal-700)/30" : "border-slate-300"}`}>
              <input type="radio" value={valor} {...register("entrega")} className="h-5 w-5 accent-(--kt-teal-700)" /> {texto}
            </label>
          ))}
        </div>
        {errors.entrega && <p className="mt-1 text-sm text-red-700">{errors.entrega.message}</p>}
      </fieldset>
      )}
      {entrega === "envio" && (
        <>
          <InputField label="Dirección" name="direccion" register={register} error={errors.direccion?.message} autoComplete="street-address" />
          <InputField label="Localidad" name="localidad" register={register} error={errors.localidad?.message} autoComplete="address-level2" />
          {tienda.textos.avisoEnvio && <p className="text-sm text-(--kt-ink-soft)">{tienda.textos.avisoEnvio}</p>}
        </>
      )}
      <TextareaField label="Comentario (opcional)" name="nota" register={register} error={errors.nota?.message} rows={2} />
      <FormError message={errors.root?.message} />
      <button type="submit" disabled={enviando} className={`${BOTON_COMPRA} w-full`}><Send size={18} aria-hidden="true" /> {enviando ? "Enviando…" : "Enviar pedido"}</button>
      {tienda.textos.pieFormulario && <p className="text-center text-sm text-(--kt-ink-soft)">{tienda.textos.pieFormulario}</p>}
    </form>
  );
}
