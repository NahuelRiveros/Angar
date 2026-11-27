import { useRef } from "react";
import { useFormState } from "react-hook-form";
import FormError from "./form_error.jsx";
import ActionButton from "./action_button.jsx";
import { mostrarErrores } from "../../utils/errores.js";

/**
 * Formulario del kit sobre React Hook Form. Resuelve lo que se repetía en cada pantalla: un solo envío a la
 * vez, los errores del servidor en su campo (el resto arriba del botón) y los botones Guardar / Cancelar.
 *
 * - `form`: lo que devuelve useForm (con zodResolver si hay esquema).
 * - `onEnviar(datos)`: async; si falla, los errores van al formulario y lo escrito queda.
 * - `cancelar`: dirección (link) o función. Sin él, no hay botón Cancelar.
 * - `barra`: true en pantallas largas del panel: los botones quedan fijos abajo, con `resumen` al lado.
 */
export default function Formulario({ form, onEnviar, error = "No se pudo guardar. Revisá la conexión y probá de nuevo.", textoGuardar = "Guardar", cancelar, barra = false, resumen, children, className = "" }) {
  const enCurso = useRef(false);
  const { isSubmitting: enviando, errors } = useFormState({ control: form.control });
  // Un doble clic llega antes de que el botón se vea deshabilitado.
  const enviar = form.handleSubmit(async (datos) => {
    if (enCurso.current) return;
    enCurso.current = true;
    try { await onEnviar(datos); } catch (e) { mostrarErrores(e, form.setError, error); } finally { enCurso.current = false; }
  });
  const botones = (
    // En la barra fija van uno al lado del otro: apilados ocupaban un tercio de la pantalla del celular.
    <div className={barra ? "flex gap-2 [&>*]:flex-1 sm:justify-end sm:[&>*]:flex-none" : "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"}>
      {cancelar && (typeof cancelar === "function"
        ? <ActionButton variante="secundario" onClick={cancelar}>Cancelar</ActionButton>
        : <ActionButton variante="secundario" to={cancelar}>Cancelar</ActionButton>)}
      <ActionButton type="submit" cargando={enviando}>{enviando ? "Guardando…" : textoGuardar}</ActionButton>
    </div>
  );
  return (
    // Con barra fija: al llevar la vista a un campo (error, teclado) no queda tapado arriba ni abajo.
    <form onSubmit={enviar} noValidate className={`space-y-4 ${barra ? "[&_*]:scroll-mt-20 [&_*]:scroll-mb-28" : ""} ${className}`}>
      {children}
      <FormError message={errors.root?.message} />
      {barra ? <BarraAcciones resumen={resumen}>{botones}</BarraAcciones> : botones}
    </form>
  );
}

/** Barra fija abajo con los botones de la pantalla. `resumen`: un texto corto de lo que se va a guardar. */
export function BarraAcciones({ resumen, children }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex min-w-0 flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:shadow-lg">
      {resumen && <p className="min-w-0 truncate text-sm text-slate-600">{resumen}</p>}
      <div className="sm:ml-auto">{children}</div>
    </div>
  );
}
