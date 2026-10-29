import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { ESTADOS_INSCRIPCION, PERMITIDO } from "../../../../../torneo_config.js";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { cancelarMiInscripcion } from "../api/torneos_api.js";
import { useMisInscripciones } from "./use_mis_inscripciones.js";
import { avisosDeInscripciones } from "../avisos/avisos_inscripciones.js";
import { SECCIONES, seccionDe, proximoPaso, ordenarInscripciones } from "./secciones_inscripciones.js";
import { responderInvitacion } from "../../jugadores/jugadores_api.js";
import PagoInscripcion from "../publico/pago_inscripcion.jsx";

const COLORES = { esperando: "bg-sky-50 text-sky-900 ring-sky-200", pendiente: "bg-amber-50 text-amber-900 ring-amber-200", confirmada: "bg-emerald-50 text-emerald-800 ring-emerald-200", rechazada: "bg-red-50 text-red-800 ring-red-200", cancelada: "bg-slate-100 text-slate-600 ring-slate-200" };
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

export default function MisInscripcionesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [aCancelar, setACancelar] = useState(null);
  // Al anotarse en una categoría que cobra, se llega con ?pagar=<id>: esa inscripción va destacada.
  const [params, setParams] = useSearchParams();
  const aPagar = Number(params.get("pagar")) || null;
  // La pestaña vive en la dirección; un link de pago siempre abre en Activas.
  const seccion = !aPagar && SECCIONES.some(([c]) => c === params.get("ver")) ? params.get("ver") : "activas";
  const lista = useMisInscripciones();
  const avisos = avisosDeInscripciones(lista.data);
  const porSeccion = Object.fromEntries(SECCIONES.map(([c]) => [c, ordenarInscripciones((lista.data ?? []).filter((i) => seccionDe(i) === c))]));
  const visibles = porSeccion[seccion];
  const elegir = (codigo) => setParams(codigo === "activas" ? {} : { ver: codigo }, { replace: true });
  // "¡Te anotaste!" solo al llegar desde anotarse; la campanita lleva al pago sin ese cartel.
  const recienAnotado = params.get("nueva") === "1" && lista.data?.some((i) => i.id === aPagar && i.monto_inscripcion);
  const responder = useMutation({
    mutationFn: ({ id, acepta }) => responderInvitacion(id, acepta),
    onSuccess: async (r) => { toast.success(r.mensaje); await queryClient.invalidateQueries({ queryKey: ["mis-inscripciones"] }); },
    onError: (e) => toast.error(mensajeDe(e, "No pudimos responder la invitación.")),
  });
  const cancelar = useMutation({
    mutationFn: (i) => cancelarMiInscripcion(i.id),
    onSuccess: async (r) => { toast.success(r.mensaje); setACancelar(null); await queryClient.invalidateQueries({ queryKey: ["mis-inscripciones"] }); },
    onError: (e) => { toast.error(mensajeDe(e, "No pudimos darte de baja.")); setACancelar(null); },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
      <div>
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink) sm:text-3xl">Mis inscripciones</h1>
        <p className="mt-1 text-sm text-(--kt-ink-soft)">Los torneos en los que te anotaste y en qué quedó cada inscripción.</p>
      </div>
      {lista.isPending && <AdminSpinner />}
      {lista.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(lista.error, "No pudimos cargar tus inscripciones.")} />
          <button type="button" onClick={() => lista.refetch()} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Reintentar</button>
        </div>
      )}
      {lista.data?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-(--kt-ink-soft)">
          Todavía no te anotaste en ningún torneo. <Link to="/torneos" className="font-semibold text-(--kt-teal-700) underline">Ver torneos</Link>
        </p>
      )}
      {lista.data?.length > 0 && (
        <div role="tablist" aria-label="Filtrar inscripciones" className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {SECCIONES.map(([codigo, etiqueta]) => (
            <button key={codigo} type="button" role="tab" aria-selected={seccion === codigo} onClick={() => elegir(codigo)}
              className={`-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold sm:px-4 ${seccion === codigo ? "border-(--kt-petrol) text-(--kt-ink)" : "border-transparent text-(--kt-ink-soft) hover:text-(--kt-ink)"}`}>
              {etiqueta} <span className="text-xs font-bold text-(--kt-ink-soft)">({porSeccion[codigo].length})</span>
            </button>
          ))}
        </div>
      )}
      {!recienAnotado && seccion === "activas" && avisos.length > 0 && (
        <p role="status" className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle size={16} aria-hidden="true" className="shrink-0" />
          Tenés {avisos.length === 1 ? "1 cosa para hacer" : `${avisos.length} cosas para hacer`}: están primero.
        </p>
      )}
      {lista.data?.length > 0 && visibles.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-(--kt-ink-soft)">
          {{ activas: "No tenés inscripciones activas.", jugadas: "Todavía no terminó ningún torneo en el que jugaste.", bajas: "No tenés bajas ni rechazos." }[seccion]}{" "}
          {seccion === "activas" && <Link to="/torneos" className="font-semibold text-(--kt-teal-700) underline">Ver torneos</Link>}
        </p>
      )}
      {recienAnotado && (
        <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong>¡Te anotaste!</strong> Para asegurar tu lugar, transferí la inscripción a la cuenta de abajo y mandá el comprobante: la organización lo revisa y confirma.
        </p>
      )}
      <ul className="space-y-3">
        {visibles.map((i) => {
          const paso = proximoPaso(i);
          const abierta = PERMITIDO.anotarseOnline.includes(i.torneo?.estado);
          const invitacion = i.rol === "invitado" && i.estado === "esperando";
          // El invitado responde la invitación; el resto se puede bajar mientras esté abierta y sin zona.
          const puedeBajarse = seccion === "activas" && !invitacion && ["esperando", "pendiente", "confirmada"].includes(i.estado) && abierta && !i.zona_id;
          return (
            <li key={i.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${paso.accion ? "border-amber-300" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/torneos/${i.torneo?.id}`} className="font-bold text-(--kt-ink) hover:underline">{i.torneo?.nombre}</Link>
                  <p className="text-sm text-(--kt-ink-soft)">{i.categoria} · {i.jugador1_nombre} / {i.jugador2_nombre}</p>
                  <p className="text-xs text-(--kt-ink-soft)">{[i.torneo?.sede, i.torneo?.fecha_inicio && formatearFechaAR(i.torneo.fecha_inicio)].filter(Boolean).join(" · ")}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${COLORES[i.estado]}`}>{ESTADOS_INSCRIPCION[i.estado]}</span>
              </div>
              <p className={`mt-2 flex items-start gap-1.5 text-sm ${paso.accion ? "font-semibold text-amber-900" : "text-(--kt-ink)"}`}>
                {paso.accion ? <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> : <ArrowRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-(--kt-teal-700)" />}
                {paso.texto}
              </p>
              {i.motivo_rechazo && <p className="mt-1 text-sm text-red-700">Motivo: {i.motivo_rechazo}</p>}
              {invitacion && (
                <div className="mt-3 space-y-2 rounded-2xl bg-sky-50 p-3">
                  <p className="text-sm font-semibold text-sky-900">{i.jugador1_nombre} te invitó a jugar en pareja.</p>
                  {abierta ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={responder.isPending} onClick={() => responder.mutate({ id: i.id, acepta: true })} className="inline-flex min-h-11 items-center rounded-xl bg-(--kt-petrol) px-4 text-sm font-bold text-white disabled:opacity-50">Aceptar</button>
                      <button type="button" disabled={responder.isPending} onClick={() => responder.mutate({ id: i.id, acepta: false })} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Rechazar</button>
                    </div>
                  ) : <p className="text-sm text-sky-900">La inscripción ya cerró.</p>}
                </div>
              )}
              {seccion === "activas" && <PagoInscripcion inscripcion={i} destacado={i.id === aPagar} />}
              {["en_juego", "finalizado"].includes(i.torneo?.estado) && i.estado === "confirmada" && (
                <Link to={`/torneos/${i.torneo.id}`} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-(--kt-teal-700) hover:underline">
                  {i.torneo.estado === "en_juego" ? "Ver zonas, horarios y resultados" : "Ver resultados y podio"} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )}
              {puedeBajarse && (
                <button type="button" onClick={() => setACancelar(i)} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">Bajarme del torneo</button>
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog open={Boolean(aCancelar)} loading={cancelar.isPending} confirmLabel="Bajarme"
        title={`¿Bajarte de ${aCancelar?.torneo?.nombre ?? ""}?`} message="Liberás tu lugar. Si querés volver, tenés que anotarte de nuevo."
        onClose={() => setACancelar(null)} onConfirm={() => cancelar.mutate(aCancelar)} />
    </div>
  );
}
