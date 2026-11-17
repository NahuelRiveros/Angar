import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import Modal from "../../../controls/ui/modal.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import ImageUploadField from "../../../controls/ui/image_upload_field.jsx";
import FormError from "../../../controls/ui/form_error.jsx";
import { mensajeDeError } from "../../../hooks/use_banners.js";

const VACIO = { titulo: "", imagen_url: "", imagen_celular_url: "", enlace: "", vigente_desde: "", vigente_hasta: "", orden: 0, activo: true };

/**
 * Alta y edición de un banner. Las reglas completas las valida el servidor (banner_reglas.js);
 * acá solo lo mínimo para avisar antes de enviar, y los errores del servidor se marcan en su campo.
 */
export default function BannerFormModal({ tipo, banner, onClose, guardar }) {
  const esCarrusel = tipo === "carrusel";
  const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm({ defaultValues: VACIO });

  useEffect(() => {
    // Solo los campos del formulario: el estado o las fechas de creación no se reenvían.
    reset(banner ? Object.fromEntries(Object.keys(VACIO).map((campo) => [campo, banner[campo] ?? VACIO[campo]])) : VACIO);
  }, [banner, reset]);

  async function enviar(valores) {
    try {
      await guardar.mutateAsync({ ...valores, id: banner?.id, tipo, orden: Number(valores.orden) || 0 });
      onClose();
    } catch (error) {
      const porCampo = error?.response?.data?.errores ?? [];
      porCampo.forEach(({ campo, mensaje }) => setError(campo, { type: "servidor", message: mensaje }));
      if (!porCampo.length) setError("root", { message: mensajeDeError(error, "No se pudo guardar el banner.") });
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={guardar.isPending}
      title={banner ? "Editar banner" : esCarrusel ? "Nuevo banner del carrusel" : "Nuevo texto de la cinta"}
    >
      <form onSubmit={handleSubmit(enviar)} className="space-y-4" noValidate>
        <InputField
          name="titulo"
          label={esCarrusel ? "Descripción de la imagen" : "Texto de la cinta"}
          helperText={esCarrusel ? "Ej: \"Navidad: 20% off en juguetes\". La leen los lectores de pantalla." : "Ej: \"Envío gratis desde $50.000\"."}
          register={register}
          required
          requiredMessage="Escribí el texto del banner."
          maxLength={200}
          error={errors.titulo?.message}
        />

        {esCarrusel && (
          <>
            <Controller
              name="imagen_url"
              control={control}
              rules={{ required: "Un banner de carrusel necesita una imagen." }}
              render={({ field }) => (
                <ImageUploadField label="Imagen (computadora)" tooltip="Recomendado: 1920 × 640 px." value={field.value} onChange={field.onChange} />
              )}
            />
            <FormError message={errors.imagen_url?.message} />
            <Controller
              name="imagen_celular_url"
              control={control}
              render={({ field }) => (
                <ImageUploadField label="Imagen para celular (opcional)" tooltip="Vertical, 1080 × 1350 px. Se usa si todos los banners del carrusel tienen la suya; si no, se recorta la de computadora." value={field.value} onChange={field.onChange} />
              )}
            />
            <FormError message={errors.imagen_celular_url?.message} />
          </>
        )}

        <InputField
          name="enlace"
          label="Enlace (opcional)"
          placeholder="/catalogo?categoria=ofertas"
          helperText="Una página de la tienda (empieza con /) o un sitio https://"
          register={register}
          error={errors.enlace?.message}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField name="vigente_desde" type="date" label="Se muestra desde" helperText="Vacío: desde hoy." register={register} error={errors.vigente_desde?.message} />
          <InputField name="vigente_hasta" type="date" label="Hasta (incluido)" helperText="Vacío: no vence." register={register} error={errors.vigente_hasta?.message} />
        </div>

        <div className="grid items-end gap-4 sm:grid-cols-2">
          <InputField name="orden" type="number" min={0} max={999} label="Orden" helperText="Menor número, aparece antes." register={register} error={errors.orden?.message} />
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" {...register("activo")} className="h-5 w-5 rounded border-gray-300" />
            Activo
          </label>
        </div>

        <FormError message={errors.root?.message} />

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={guardar.isPending} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={guardar.isPending} className="min-h-11 rounded-xl bg-(--kt-teal-700) px-5 text-sm font-bold text-white hover:bg-(--kt-teal-900) disabled:opacity-60">
            {guardar.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
