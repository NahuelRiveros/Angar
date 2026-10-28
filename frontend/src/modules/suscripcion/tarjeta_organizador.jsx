import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useMiSuscripcion } from "../../hooks/use_mi_suscripcion.js";
import { formatearFechaAR } from "../../utils/formatear_fecha.js";
import { ESTADOS_PLAN } from "./estado_plan.js";

const BOTON = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold";

/**
 * En "Mi perfil": invita a organizar o resume el plan. La activación vive en /mi-suscripcion,
 * que explica la prueba gratis antes de empezarla.
 */
export default function TarjetaOrganizador() {
  const plan = useMiSuscripcion();
  return (
    <section aria-labelledby="organizar-titulo" className="rounded-3xl border border-(--kt-border) bg-white p-5 shadow-sm">
      <h2 id="organizar-titulo" className="flex items-center gap-2 font-bold text-(--kt-ink)">
        <Trophy size={18} aria-hidden="true" className="text-(--kt-teal-700)" /> Organizar torneos
      </h2>
      {plan.isPending && <p className="mt-2 text-sm text-(--kt-ink-soft)">Cargando tu plan…</p>}
      {plan.isError && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-700">No pudimos cargar tu plan.</p>
          <button type="button" onClick={() => plan.refetch()} className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>Reintentar</button>
        </div>
      )}
      {plan.data && !plan.data.es_organizador && (
        <>
          <p className="mt-2 text-sm text-(--kt-ink-soft)">Armá tus torneos con categorías, zonas y llaves. Probalo gratis {plan.data.dias_prueba} días, sin tarjeta.</p>
          <Link to="/mi-suscripcion" className={`${BOTON} mt-4 w-full bg-(--kt-accent-comercial) text-white hover:bg-(--kt-accent-comercial-hover) sm:w-auto`}>Quiero organizar torneos</Link>
        </>
      )}
      {plan.data?.es_organizador && <ResumenPlan plan={plan.data} />}
    </section>
  );
}

function ResumenPlan({ plan }) {
  const estado = ESTADOS_PLAN[plan.estado] ?? ESTADOS_PLAN.activo;
  return (
    <>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-(--kt-ink)">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${estado.clase}`}>{estado.etiqueta}</span>
        {plan.vigente ? "Vence el" : "Venció el"} {formatearFechaAR(plan.fecha_vencimiento)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/mis-torneos" className={`${BOTON} bg-(--kt-petrol) text-white`}>Mis torneos</Link>
        <Link to="/mi-suscripcion" className={`${BOTON} border border-slate-300 bg-white text-slate-700`}>{plan.vigente ? "Mi plan" : "Renovar el plan"}</Link>
      </div>
    </>
  );
}
