import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload } from "lucide-react";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { ESTADOS_PAGO_INSCRIPCION, PERMITIDO } from "../../../../../torneo_config.js";
import { cobroConfig } from "../../../../../cobro_config.js";
import { abrirEnPestania } from "../../../utils/abrir_en_pestania.js";
import { formatearPesos } from "../../suscripcion/estado_plan.js";
import { subirComprobanteInscripcion, getEnlaceComprobanteInscripcion } from "../api/torneos_api.js";
import DatosDeCobro from "./datos_cobro.jsx";

const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
const COLORES = { en_revision: "bg-amber-50 text-amber-900 ring-amber-200", aprobado: "bg-emerald-50 text-emerald-800 ring-emerald-200", rechazado: "bg-red-50 text-red-800 ring-red-200" };
const MAX_MB = Math.round(cobroConfig.comprobante.maxBytes / 1024 / 1024);

/**
 * En "Mis inscripciones": monto, cuenta para transferir y el comprobante. Mismas reglas que el
 * servidor (motivoParaNoSubirComprobante): se manda con la inscripción abierta, pendiente o
 * esperando al compañero, y se puede reemplazar uno rechazado.
 */
export default function PagoInscripcion({ inscripcion: i, destacado = false }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const entrada = useRef(null);
  const bloque = useRef(null);
  // Recién anotado: se lleva la vista al pago (una vez, al aparecer).
  useEffect(() => {
    if (destacado) bloque.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [destacado]);
  const subir = useMutation({
    mutationFn: (archivo) => subirComprobanteInscripcion(i.id, archivo),
    onSuccess: async (r) => { toast.success(r.mensaje); await queryClient.invalidateQueries({ queryKey: ["mis-inscripciones"] }); },
    onError: (e) => toast.error(mensajeDe(e, "No pudimos enviar el comprobante.")),
  });

  if (!i.monto_inscripcion) return null;
  const puedeSubir = PERMITIDO.pagarInscripcion.includes(i.torneo?.estado) && ["esperando", "pendiente"].includes(i.estado) && [null, "rechazado"].includes(i.pago_estado ?? null);

  function elegir(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (archivo.size > cobroConfig.comprobante.maxBytes) return toast.error(`El comprobante puede pesar hasta ${MAX_MB} MB.`);
    subir.mutate(archivo);
  }
  const ver = () => abrirEnPestania(() => getEnlaceComprobanteInscripcion(i.id)).catch((e) => toast.error(mensajeDe(e, "No pudimos abrir el comprobante.")));

  return (
    <div ref={bloque} className={`mt-3 scroll-mt-24 space-y-2 rounded-2xl border p-3 ${destacado ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-(--kt-ink)">Inscripción: {formatearPesos(i.monto_inscripcion)} por pareja</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${COLORES[i.pago_estado] ?? "bg-white text-slate-600 ring-slate-200"}`}>
          {ESTADOS_PAGO_INSCRIPCION[i.pago_estado] ?? (i.estado === "confirmada" ? "Confirmada por la organización" : "Falta el comprobante")}
        </span>
      </div>
      {i.pago_estado === "rechazado" && i.pago_motivo_rechazo && <p className="text-sm text-red-700">Motivo: {i.pago_motivo_rechazo}. Mandá otro comprobante.</p>}
      {i.pago_estado === "en_revision" && <p className="text-sm text-(--kt-ink-soft)">La organización lo está revisando: cuando lo apruebe, tu inscripción queda confirmada.</p>}
      {puedeSubir && <DatosDeCobro torneo={i.torneo} titulo="Transferí a esta cuenta" />}
      <div className="flex flex-wrap gap-2">
        {puedeSubir && (
          <>
            <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={elegir} className="sr-only" aria-label="Comprobante de la transferencia" />
            <button type="button" disabled={subir.isPending} onClick={() => entrada.current?.click()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-(--kt-petrol) px-4 text-sm font-bold text-white disabled:opacity-50">
              <Upload size={16} aria-hidden="true" /> {subir.isPending ? "Enviando…" : i.pago_estado === "rechazado" ? "Mandar otro comprobante" : "Mandar comprobante"}
            </button>
          </>
        )}
        {i.pago_comprobante_formato && (
          <button type="button" onClick={ver} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
            <FileText size={16} aria-hidden="true" /> Ver mi comprobante
          </button>
        )}
      </div>
      {puedeSubir && <p className="text-xs text-(--kt-ink-soft)">Foto (JPG, PNG o WEBP) o PDF, hasta {MAX_MB} MB.</p>}
    </div>
  );
}
