import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, FileText, Trophy, Users, Award } from "lucide-react";
import { useAuth } from "../../auth/auth_context.jsx";
import { useToast } from "../../controls/toast/toast_context.jsx";
import AdminSpinner from "../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../controls/ui/error_banner.jsx";
import { useMiSuscripcion, claveMiSuscripcion } from "../../hooks/use_mi_suscripcion.js";
import { empezarAOrganizar, getMisPagos } from "../../api/suscripcion_api.js";
import { formatearFechaAR } from "../../utils/formatear_fecha.js";
import { ESTADOS_PLAN, ORIGENES_PAGO, ESTADOS_PAGO, formatearPesos, formatearMomento } from "./estado_plan.js";
import { abrirComprobante } from "./abrir_comprobante.js";
import PagarPlan from "./pagar_plan.jsx";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

// Lo que dice MercadoPago al volver (back_urls del servidor).
const VUELTAS_DE_PAGO = {
  aprobado: { tono: "border-emerald-200 bg-emerald-50 text-emerald-900", texto: "¡Gracias por tu pago! Apenas MercadoPago lo confirme se suman 30 días a tu plan (puede tardar unos minutos)." },
  pendiente: { tono: "border-amber-200 bg-amber-50 text-amber-900", texto: "Tu pago quedó pendiente. Cuando MercadoPago lo apruebe, el plan se extiende solo." },
  rechazado: { tono: "border-red-200 bg-red-50 text-red-800", texto: "El pago no se completó. No se te cobró nada: podés intentarlo de nuevo." },
};

export default function MiSuscripcionPage() {
  const [params] = useSearchParams();
  const vuelta = VUELTAS_DE_PAGO[params.get("pago")];
  const plan = useMiSuscripcion();

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
      <div>
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink) sm:text-3xl">Mi suscripción</h1>
        <p className="mt-1 text-sm text-(--kt-ink-soft)">Tu plan para organizar torneos en MiPadel.</p>
      </div>

      {vuelta && <p role="status" className={`rounded-2xl border px-4 py-3 text-sm ${vuelta.tono}`}>{vuelta.texto}</p>}

      {plan.isPending && <AdminSpinner />}
      {plan.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(plan.error, "No pudimos cargar tu plan.")} />
          <button type="button" onClick={() => plan.refetch()} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Reintentar</button>
        </div>
      )}
      {plan.data && !plan.data.es_organizador && <EmpezarAOrganizar diasPrueba={plan.data.dias_prueba} />}
      {plan.data?.es_organizador && <PlanOrganizador plan={plan.data} />}
    </div>
  );
}

function EmpezarAOrganizar({ diasPrueba }) {
  const { usuario, recargarUsuario } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const empezar = useMutation({
    mutationFn: empezarAOrganizar,
    onSuccess: async (r) => {
      toast.success(r.mensaje);
      queryClient.setQueryData(claveMiSuscripcion(usuario?.usuario_id), r.data);
      // Suma el rol organizador al menú sin volver a iniciar sesión.
      await recargarUsuario?.().catch(() => {});
    },
  });

  return (
    <section aria-labelledby="empezar-titulo" className="rounded-3xl border border-(--kt-border) bg-white p-6 shadow-sm sm:p-8">
      <h2 id="empezar-titulo" className="kt-display text-xl font-bold text-(--kt-ink)">Organizá tus torneos</h2>
      <p className="mt-2 text-sm leading-relaxed text-(--kt-ink-soft)">
        Activá tu cuenta de organizador y probá todo gratis durante {diasPrueba} días. No te pedimos tarjeta.
      </p>
      <ul className="mt-5 space-y-3 text-sm text-(--kt-ink)">
        {[[Trophy, "Torneos con categorías, reglas y premios"], [Users, "Inscripción de parejas, zonas y posiciones"], [Award, "Llaves automáticas hasta la final"]].map(([Icono, texto]) => (
          <li key={texto} className="flex items-center gap-3"><Icono size={18} aria-hidden="true" className="shrink-0 text-(--kt-teal-700)" />{texto}</li>
        ))}
      </ul>
      {empezar.isError && <ErrorBanner className="mt-5" message={mensajeDe(empezar.error, "No pudimos activar tu cuenta. Probá de nuevo.")} />}
      <button type="button" disabled={empezar.isPending} onClick={() => empezar.mutate()}
        className={`${BOTON} mt-6 w-full bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover) sm:w-auto`}>
        {empezar.isPending ? "Activando…" : `Empezar prueba gratis de ${diasPrueba} días`}
      </button>
    </section>
  );
}

function PlanOrganizador({ plan }) {
  const estado = ESTADOS_PLAN[plan.estado] ?? ESTADOS_PLAN.activo;
  return (
    <>
      <section aria-labelledby="plan-titulo" className="rounded-3xl border border-(--kt-border) bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="plan-titulo" className="kt-display text-xl font-bold text-(--kt-ink)">Plan organizador</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${estado.clase}`}>{estado.etiqueta}</span>
        </div>
        <p className="mt-3 text-sm text-(--kt-ink)">{plan.mensaje}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Dato icono={CalendarDays} titulo={plan.vigente ? "Vence el" : "Venció el"} valor={formatearFechaAR(plan.fecha_vencimiento)} />
          <Dato icono={CheckCircle2} titulo="Días restantes" valor={plan.vigente ? plan.dias_restantes : "—"} />
        </dl>

        <PagarPlan plan={plan} />
      </section>
      <HistorialPagos />
    </>
  );
}

function Dato({ icono: Icono, titulo, valor }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-(--kt-bg-soft) p-4">
      <Icono size={20} aria-hidden="true" className="shrink-0 text-(--kt-teal-700)" />
      <div>
        <dt className="text-xs font-semibold text-(--kt-ink-soft)">{titulo}</dt>
        <dd className="text-lg font-bold text-(--kt-ink)">{valor}</dd>
      </div>
    </div>
  );
}

function HistorialPagos() {
  const { usuario } = useAuth();
  const toast = useToast();
  const pagos = useQuery({ queryKey: ["suscripcion", "mis-pagos", usuario?.usuario_id], queryFn: getMisPagos });
  const verComprobante = (id) => abrirComprobante(id).catch((e) => toast.error(mensajeDe(e, "No pudimos abrir el comprobante.")));

  return (
    <section aria-labelledby="pagos-titulo" className="rounded-3xl border border-(--kt-border) bg-white p-6 shadow-sm sm:p-8">
      <h2 id="pagos-titulo" className="kt-display text-lg font-bold text-(--kt-ink)">Historial</h2>
      {pagos.isPending && <AdminSpinner />}
      {pagos.isError && (
        <div className="mt-3 space-y-3">
          <ErrorBanner message={mensajeDe(pagos.error, "No pudimos cargar tus pagos.")} />
          <button type="button" onClick={() => pagos.refetch()} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Reintentar</button>
        </div>
      )}
      {pagos.data?.length === 0 && <p className="mt-3 text-sm text-(--kt-ink-soft)">Todavía no hay pagos. Tu prueba gratis no requiere ninguno.</p>}
      {pagos.data?.length > 0 && (
        <ul className="mt-4 divide-y divide-(--kt-border)">
          {pagos.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-semibold text-(--kt-ink)">{ORIGENES_PAGO[p.origen] ?? p.origen} · {ESTADOS_PAGO[p.estado] ?? p.estado}</p>
                <p className="text-xs text-(--kt-ink-soft)">{formatearMomento(p.creado_en)}{p.dias > 0 ? ` · +${p.dias} días` : ""}{p.vencimiento_nuevo ? ` · vence ${formatearFechaAR(p.vencimiento_nuevo)}` : ""}</p>
                {p.motivo_rechazo && <p className="text-xs text-red-700">Motivo: {p.motivo_rechazo}</p>}
              </div>
              <div className="flex items-center gap-2">
                {p.monto != null && <span className="font-bold text-(--kt-ink)">{formatearPesos(p.monto)}</span>}
                {p.comprobante_formato && (
                  <button type="button" onClick={() => verComprobante(p.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-(--kt-teal-700) hover:bg-(--kt-bg-soft)">
                    <FileText size={16} aria-hidden="true" /> Comprobante
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
