import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Trophy } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { getTorneosPublicos } from "../api/torneos_api.js";
import { EstadoTorneo } from "../torneo_ui.jsx";

const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

export default function TorneosPublicosPage() {
  const [page, setPage] = useState(1);
  const torneos = useQuery({ queryKey: ["publico", "torneos", page], queryFn: () => getTorneosPublicos({ page }), placeholderData: keepPreviousData, staleTime: 60_000 });

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:py-12">
      <div>
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink) sm:text-3xl">Torneos</h1>
        <p className="mt-1 text-sm text-(--kt-ink-soft)">Anotate en los que tienen la inscripción abierta y seguí los que se están jugando.</p>
      </div>
      {torneos.isPending && <AdminSpinner />}
      {torneos.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(torneos.error, "No pudimos cargar los torneos.")} />
          <button type="button" onClick={() => torneos.refetch()} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Reintentar</button>
        </div>
      )}
      {torneos.data?.total === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Trophy size={36} aria-hidden="true" className="mx-auto text-(--kt-teal-700)" />
          <p className="mt-3 font-semibold text-(--kt-ink)">Todavía no hay torneos publicados</p>
        </div>
      )}
      {torneos.data?.data.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {torneos.data.data.map((t) => (
            <li key={t.id}>
              <Link to={`/torneos/${t.id}`} className="block h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-(--kt-teal-700) focus-visible:ring-2 focus-visible:ring-(--kt-turquoise) focus-visible:outline-none">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-(--kt-ink)">{t.nombre}</p>
                  <EstadoTorneo estado={t.estado} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-(--kt-ink-soft)">
                  <CalendarDays size={15} aria-hidden="true" />{t.fecha_inicio ? formatearFechaAR(t.fecha_inicio) : "Fecha a confirmar"}{t.fecha_fin && t.fecha_fin !== t.fecha_inicio ? ` al ${formatearFechaAR(t.fecha_fin)}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-(--kt-ink-soft)"><MapPin size={15} aria-hidden="true" />{[t.sede, t.localidad].filter(Boolean).join(", ") || "Sede a confirmar"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {torneos.data && <Pagination page={torneos.data.page} pages={torneos.data.totalPages} total={torneos.data.total} onChange={setPage} />}
    </div>
  );
}
