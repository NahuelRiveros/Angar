import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import { formatearMomento } from "../../suscripcion/estado_plan.js";
import { getRegistrados } from "./registrados_api.js";

const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
const TOTALES = [["total", "Usuarios registrados", Users], ["ultimos_7", "Nuevos en 7 días", UserPlus], ["ultimos_30", "Nuevos en 30 días", UserPlus]];

/** Inicio del panel del super admin: cuántos usuarios hay y quiénes se sumaron (solo nombre y fecha). */
export default function RegistradosResumen() {
  const [page, setPage] = useState(1);
  const registrados = useQuery({ queryKey: ["admin", "registrados", page], queryFn: () => getRegistrados({ page }), placeholderData: keepPreviousData, staleTime: 5 * 60 * 1000 });
  const datos = registrados.data;

  return (
    <section aria-labelledby="panel-registrados" className="space-y-3">
      <div>
        <h2 id="panel-registrados" className="text-lg font-bold text-(--kt-ink)">Usuarios</h2>
        <p className="text-sm text-(--kt-ink-soft)">Solo lo ves vos (super admin): nombre y fecha de alta, sin datos de contacto.</p>
      </div>
      {registrados.isError && (
        <div className="space-y-2">
          <ErrorBanner message={mensajeDe(registrados.error, "No pudimos cargar los usuarios registrados.")} />
          <button type="button" onClick={() => registrados.refetch()} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Reintentar</button>
        </div>
      )}
      <ul className="grid grid-cols-3 gap-3">
        {TOTALES.map(([clave, etiqueta, Icono]) => (
          <li key={clave} className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-label={`${etiqueta}: ${datos?.resumen?.[clave] ?? "cargando"}`}>
            <Icono size={18} aria-hidden="true" className="text-(--kt-teal-700)" />
            <span className="text-xs font-semibold text-(--kt-ink-soft)">{etiqueta}</span>
            <span className="text-2xl font-black text-(--kt-ink)">{registrados.isPending ? "…" : datos?.resumen?.[clave] ?? "—"}</span>
          </li>
        ))}
      </ul>
      {datos && (
        <div className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 ${registrados.isPlaceholderData ? "opacity-60" : ""}`}>
          <h3 className="px-1 text-sm font-bold text-(--kt-ink)">Últimos registrados</h3>
          {datos.data.length === 0 ? (
            <p className="px-1 py-3 text-sm text-(--kt-ink-soft)">Todavía no se registró nadie.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {datos.data.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-1 py-2 text-sm">
                  <span className="min-w-0 font-semibold text-(--kt-ink)">{u.nombre} {u.apellido}</span>
                  <span className="shrink-0 text-xs text-(--kt-ink-soft)">{formatearMomento(u.creado_en)}</span>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={datos.page} pages={datos.totalPages} total={datos.total} onChange={setPage} disabled={registrados.isFetching} />
        </div>
      )}
    </section>
  );
}
