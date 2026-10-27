import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, FileText, X } from "lucide-react";
import { useAuth } from "../../../auth/auth_context.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { tienePermiso } from "../../../../../permisos_config.js";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import InputField from "../../../controls/ui/input_field.jsx";
import Modal from "../../../controls/ui/modal.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import { getTransferencias, aprobarTransferencia, rechazarTransferencia } from "../../../api/suscripcion_api.js";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { formatearPesos, formatearMomento, claveTransferencias } from "../estado_plan.js";
import { abrirComprobante } from "../abrir_comprobante.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
const ESTADOS = [["pendiente", "Para revisar"], ["aprobado", "Aprobadas"], ["rechazado", "Rechazadas"]];
const esquemaRechazo = z.object({ motivo: z.string().trim().min(5, "Contale el motivo (mínimo 5 caracteres).").max(300, "Hasta 300 caracteres.") });

export default function TransferenciasPanel() {
  const { usuario } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const puedeGestionar = tienePermiso(usuario, "suscripciones.gestionar");
  const [filtros, setFiltros] = useState({ estado: "pendiente", page: 1 });
  const [aAprobar, setAAprobar] = useState(null);
  const [aRechazar, setARechazar] = useState(null);

  const lista = useQuery({ queryKey: claveTransferencias(filtros), queryFn: () => getTransferencias(filtros), placeholderData: keepPreviousData });
  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["suscripciones"] });
  const aprobar = useMutation({
    mutationFn: (fila) => aprobarTransferencia(fila.id),
    onSuccess: async (r) => { toast.success(r.mensaje); setAAprobar(null); await refrescar(); },
    onError: async (e) => { toast.error(mensajeDe(e, "No se pudo aprobar.")); setAAprobar(null); await refrescar(); },
  });
  const verComprobante = (id) => abrirComprobante(id).catch((e) => toast.error(mensajeDe(e, "No pudimos abrir el comprobante.")));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar transferencias">
        {ESTADOS.map(([codigo, etiqueta]) => (
          <button key={codigo} type="button" aria-pressed={filtros.estado === codigo} onClick={() => setFiltros({ estado: codigo, page: 1 })}
            className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${filtros.estado === codigo ? "border-(--kt-petrol) bg-(--kt-petrol) text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
            {etiqueta}
          </button>
        ))}
      </div>

      {lista.isPending && <AdminSpinner />}
      {lista.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(lista.error, "No pudimos cargar las transferencias.")} />
          <button type="button" onClick={() => lista.refetch()} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Reintentar</button>
        </div>
      )}
      {lista.data?.data.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-(--kt-ink-soft)">
          {filtros.estado === "pendiente" ? "No hay transferencias para revisar." : "Todavía no hay transferencias en esta lista."}
        </p>
      )}
      {lista.data?.data.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.data.data.map((fila) => (
            <li key={fila.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{fila.nombre} {fila.apellido}</p>
                  <p className="truncate text-xs text-slate-500">{fila.email}</p>
                </div>
                {fila.monto != null && <span className="font-bold">{formatearPesos(fila.monto)}</span>}
              </div>
              <p className="mt-2 text-sm text-(--kt-ink-soft)">
                Enviada el {formatearMomento(fila.creado_en)} · plan {fila.fecha_vencimiento ? `vence el ${formatearFechaAR(fila.fecha_vencimiento)}` : "sin datos"}
              </p>
              {fila.nota && <p className="mt-1 text-sm text-(--kt-ink)">“{fila.nota}”</p>}
              {fila.motivo_rechazo && <p className="mt-1 text-sm text-red-700">Rechazada: {fila.motivo_rechazo}</p>}
              {fila.estado === "aprobado" && <p className="mt-1 text-sm text-emerald-800">Aprobada: +{fila.dias} días, vence el {formatearFechaAR(fila.vencimiento_nuevo)}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => verComprobante(fila.id)} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>
                  <FileText size={16} aria-hidden="true" /> Ver comprobante
                </button>
                {puedeGestionar && fila.estado === "pendiente" && (
                  <>
                    <button type="button" onClick={() => setAAprobar(fila)} className={`${BOTON} border-emerald-200 bg-emerald-50 text-emerald-800`}>
                      <Check size={16} aria-hidden="true" /> Aprobar
                    </button>
                    <button type="button" onClick={() => setARechazar(fila)} className={`${BOTON} border-red-200 bg-red-50 text-red-800`}>
                      <X size={16} aria-hidden="true" /> Rechazar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {lista.data && <Pagination page={lista.data.page} pages={lista.data.totalPages} total={lista.data.total} onChange={(page) => setFiltros((f) => ({ ...f, page }))} />}

      <ConfirmDialog open={Boolean(aAprobar)} loading={aprobar.isPending} confirmLabel="Aprobar"
        title={`¿Aprobar la transferencia de ${aAprobar?.nombre ?? ""}?`}
        message="Revisá que el dinero esté acreditado en la cuenta. Se suman 30 días a su plan."
        onClose={() => setAAprobar(null)} onConfirm={() => aprobar.mutate(aAprobar)} />
      {aRechazar && <RechazoModal fila={aRechazar} onClose={() => setARechazar(null)} onListo={refrescar} />}
    </div>
  );
}

function RechazoModal({ fila, onClose, onListo }) {
  const toast = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(esquemaRechazo), defaultValues: { motivo: "" } });
  const rechazar = useMutation({
    mutationFn: ({ motivo }) => rechazarTransferencia(fila.id, motivo),
    onSuccess: async (r) => { toast.success(r.mensaje); await onListo(); onClose(); },
  });
  return (
    <Modal title={`Rechazar · ${fila.nombre} ${fila.apellido}`} onClose={onClose} busy={rechazar.isPending}>
      <form noValidate onSubmit={handleSubmit((datos) => rechazar.mutate(datos))} className="space-y-4">
        <p className="text-sm text-(--kt-ink-soft)">El organizador ve este motivo en su plan y puede enviar otro comprobante.</p>
        <InputField label="Motivo" name="motivo" placeholder="Ej: el monto no coincide" maxLength={300} register={register} error={errors.motivo?.message} />
        {rechazar.isError && <ErrorBanner message={mensajeDe(rechazar.error, "No se pudo rechazar. Probá de nuevo.")} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={rechazar.isPending} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Cancelar</button>
          <button type="submit" disabled={rechazar.isPending} className={`${BOTON} border-red-700 bg-red-700 text-white`}>{rechazar.isPending ? "Rechazando…" : "Rechazar transferencia"}</button>
        </div>
      </form>
    </Modal>
  );
}
