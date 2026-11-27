import { useForm } from "react-hook-form";
import ActionButton from "./action_button.jsx";
import FormError from "./form_error.jsx";
import Modal from "./modal.jsx";
import TextareaField from "./textarea_field.jsx";
import { mensajeError } from "../../utils/errores.js";

/**
 * Confirmar algo que pide motivo (cancelar, volver atrás, reabrir). `onConfirmar(motivo)` es async: si falla,
 * el error queda en la ventana y lo escrito no se pierde. `peligro`: botón rojo.
 */
export default function ConfirmarConMotivo({ titulo, textoConfirmar, onConfirmar, onClose, peligro = false, ayuda = "Queda en el historial." }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { motivo: "" } });
  async function enviar({ motivo }) {
    if (!motivo.trim()) return setError("motivo", { message: "Escribí el motivo." });
    try { await onConfirmar(motivo.trim()); }
    catch (error) { setError("root", { message: mensajeError(error, "No se pudo guardar.") }); }
  }
  return (
    <Modal open onClose={onClose} busy={isSubmitting} title={titulo}>
      <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
        <TextareaField label="Motivo" name="motivo" register={register} error={errors.motivo?.message} rows={3} helperText={ayuda} />
        <FormError message={errors.root?.message} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton variante="secundario" onClick={onClose}>Volver</ActionButton>
          <ActionButton type="submit" variante={peligro ? "peligro" : "principal"} cargando={isSubmitting}>{isSubmitting ? "Guardando…" : textoConfirmar}</ActionButton>
        </div>
      </form>
    </Modal>
  );
}
