import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../auth/auth_context.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { ESTADOS_INSCRIPCION, PERMITIDO } from "../../../../../torneo_config.js";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { getMisInscripciones, cancelarMiInscripcion } from "../api/torneos_api.js";
import { responderInvitacion } from "../../jugadores/jugadores_api.js";

const COLORES = { esperando: "bg-sky-50 text-sky-900 ring-sky-200", pendiente: "bg-amber-50 text-amber-900 ring-amber-200", confirmada: "bg-emerald-50 text-emerald-800 ring-emerald-200", rechazada: "bg-red-50 text-red-800 ring-red-200", cancelada: "bg-slate-100 text-slate-600 ring-slate-200" };
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

export default function MisInscripcionesPage() {
  const { usuario } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [aCancelar, setACancelar] = useState(null);
  const clave = ["mis-inscripciones", usuario?.usuario_id];
  const lista = useQuery({ queryKey: clave, queryFn: getMisInscripciones });
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
      <ul className="space-y-3">
        {lista.data?.map((i) => {
          const abierta = PERMITIDO.anotarseOnline.includes(i.torneo?.estado);
          const invitacion = i.rol === "invitado" && i.estado === "esperando";
          // El invitado responde la invitación; el resto se puede bajar mientras esté abierta y sin zona.
          const puedeBajarse = !invitacion && ["esperando", "pendiente", "confirmada"].includes(i.estado) && abierta && !i.zona_id;
          return (
            <li key={i.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/torneos/${i.torneo?.id}`} className="font-bold text-(--kt-ink) hover:underline">{i.torneo?.nombre}</Link>
                  <p className="text-sm text-(--kt-ink-soft)">{i.categoria} · {i.jugador1_nombre} / {i.jugador2_nombre}</p>
                  <p className="text-xs text-(--kt-ink-soft)">{[i.torneo?.sede, i.torneo?.fecha_inicio && formatearFechaAR(i.torneo.fecha_inicio)].filter(Boolean).join(" · ")}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${COLORES[i.estado]}`}>{ESTADOS_INSCRIPCION[i.estado]}</span>
              </div>
              {i.motivo_rechazo && <p className="mt-2 text-sm text-red-700">Motivo: {i.motivo_rechazo}</p>}
              {i.rol === "anoto" && i.estado === "esperando" && <p className="mt-2 text-sm text-sky-900">Esperando que {i.jugador2_nombre} acepte la invitación.</p>}
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
