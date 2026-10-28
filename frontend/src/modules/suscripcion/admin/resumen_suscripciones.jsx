import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlarmClock, BadgeCheck, CircleSlash, FileText, Sparkles } from "lucide-react";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { getSuscripciones, getTransferencias } from "../../../api/suscripcion_api.js";
import { claveTransferencias } from "../estado_plan.js";
import TransferenciasPanel from "./transferencias_panel.jsx";

const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
// Misma clave que la primera página de la bandeja: la consulta se comparte, no se repite.
const FILTRO_PENDIENTES = { estado: "pendiente", page: 1 };
// Solo interesa el resumen por estado: una fila alcanza.
const FILTRO_RESUMEN = { busqueda: "", estado: "", page: 1, limit: 1 };

const TARJETAS = [
  { clave: "transferencias", etiqueta: "Transferencias para revisar", icono: FileText, tono: "amber", to: "/admin/suscripciones?vista=transferencias" },
  { clave: "prueba", etiqueta: "En prueba gratis", icono: Sparkles, tono: "sky", to: "/admin/suscripciones?estado=prueba" },
  { clave: "activo", etiqueta: "Pagando al día", icono: BadgeCheck, tono: "emerald", to: "/admin/suscripciones?estado=activo" },
  { clave: "por_vencer", etiqueta: "Por vencer (7 días)", icono: AlarmClock, tono: "orange", to: "/admin/suscripciones?estado=por_vencer" },
  { clave: "vencido", etiqueta: "Vencidos", icono: CircleSlash, tono: "red", to: "/admin/suscripciones?estado=vencido" },
];
const TONOS = {
  amber: "bg-amber-50 text-amber-700", sky: "bg-sky-50 text-sky-700", emerald: "bg-emerald-50 text-emerald-700",
  orange: "bg-orange-50 text-orange-700", red: "bg-red-50 text-red-700",
};

/** Inicio del panel para quien ve suscripciones: cuántos organizadores hay en cada estado y los comprobantes a revisar. */
export default function ResumenSuscripciones() {
  const resumen = useQuery({ queryKey: ["suscripciones", "admin", FILTRO_RESUMEN], queryFn: () => getSuscripciones(FILTRO_RESUMEN) });
  const pendientes = useQuery({ queryKey: claveTransferencias(FILTRO_PENDIENTES), queryFn: () => getTransferencias(FILTRO_PENDIENTES) });
  const valores = { ...resumen.data?.resumen, transferencias: pendientes.data?.pendientes };
  const cargando = resumen.isPending || pendientes.isPending;
  const error = resumen.error ?? pendientes.error;

  return (
    <>
      <section aria-labelledby="panel-organizadores" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="panel-organizadores" className="text-lg font-bold text-(--kt-ink)">Organizadores y pagos</h2>
          <Link to="/admin/suscripciones" className="min-h-11 content-center text-sm font-semibold text-(--kt-teal-700) hover:underline">Ver todos los organizadores</Link>
        </div>
        {error && (
          <div className="space-y-2">
            <ErrorBanner message={mensajeDe(error, "No pudimos cargar el resumen.")} />
            <button type="button" onClick={() => { resumen.refetch(); pendientes.refetch(); }}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Reintentar</button>
          </div>
        )}
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {TARJETAS.map(({ clave, etiqueta, icono: Icono, tono, to }) => {
            const valor = valores[clave];
            const urgente = clave === "transferencias" && valor > 0;
            return (
              <li key={clave} className={clave === "transferencias" ? "col-span-2 md:col-span-1" : ""}>
                <Link to={to} aria-label={`${etiqueta}: ${cargando ? "cargando" : valor ?? "sin datos"}`}
                  className={`flex h-full flex-col gap-2 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-(--kt-teal-700) focus-visible:ring-2 focus-visible:ring-(--kt-turquoise) focus-visible:outline-none ${urgente ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"}`}>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${TONOS[tono]}`}><Icono size={18} aria-hidden="true" /></span>
                  <span className="text-xs font-semibold text-(--kt-ink-soft)">{etiqueta}</span>
                  <span className="text-2xl font-black text-(--kt-ink)">{cargando ? "…" : valor ?? "—"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="panel-comprobantes" className="space-y-3">
        <div>
          <h2 id="panel-comprobantes" className="text-lg font-bold text-(--kt-ink)">Comprobantes de transferencia</h2>
          <p className="text-sm text-(--kt-ink-soft)">Mirá el comprobante y aprobalo (suma 30 días al plan) o rechazalo con el motivo, que el organizador ve en su cuenta.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <TransferenciasPanel />
        </div>
      </section>
    </>
  );
}
