import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SearchX, Trophy } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import Pagination from "../../../controls/ui/pagination.jsx";
import SearchField from "../../../controls/ui/search_field.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { NIVELES, RAMAS, nombreNivel } from "../../../../../torneo_config.js";
import { getTorneosPublicos } from "../api/torneos_api.js";
import TarjetaTorneo from "./tarjeta_torneo.jsx";

const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
const BOTON = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold";
const FILTROS = ["q", "estado", "rama", "nivel"];
const OPCIONES_ESTADO = [{ value: "", label: "Todos los estados" }, { value: "inscripcion", label: "Inscripción abierta" }, { value: "en_juego", label: "En juego" }, { value: "finalizado", label: "Finalizados" }];
const OPCIONES_RAMA = [{ value: "", label: "Todas las ramas" }, ...Object.entries(RAMAS).map(([value, label]) => ({ value, label }))];
const OPCIONES_NIVEL = [{ value: "", label: "Todos los niveles" }, ...NIVELES.map((n) => ({ value: String(n), label: nombreNivel(n) }))];

export default function TorneosPublicosPage() {
  // Los filtros viven en la dirección: un link filtrado se puede compartir y el "atrás" los respeta.
  const [params, setParams] = useSearchParams();
  const filtros = Object.fromEntries(FILTROS.map((f) => [f, params.get(f) ?? ""]));
  const page = Number(params.get("page")) || 1;
  const hayFiltros = FILTROS.some((f) => filtros[f]);

  const cambiar = useCallback((campo, valor) => {
    setParams((actual) => {
      const nuevos = new URLSearchParams(actual);
      if (valor) nuevos.set(campo, valor); else nuevos.delete(campo);
      if (campo !== "page") nuevos.delete("page");
      return nuevos;
    }, { replace: true });
  }, [setParams]);
  const buscar = useCallback((texto) => cambiar("q", texto), [cambiar]);

  const torneos = useQuery({
    queryKey: ["publico", "torneos", { ...filtros, page }],
    queryFn: () => getTorneosPublicos({ ...filtros, page }),
    placeholderData: keepPreviousData, staleTime: 60_000,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:py-12">
      <div>
        <h1 className="kt-display text-2xl font-bold text-(--kt-ink) sm:text-3xl">Torneos</h1>
        <p className="mt-1 text-sm text-(--kt-ink-soft)">Anotate en los que tienen la inscripción abierta y seguí los que se están jugando.</p>
      </div>

      <search aria-label="Buscar torneos" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <SearchField value={filtros.q} onSearch={buscar} label="Buscar torneo" placeholder="Nombre, club o ciudad" />
        </div>
        <SelectField label="Estado" showLabel={false} aria-label="Estado" name="filtro-estado" value={filtros.estado} options={OPCIONES_ESTADO} showPlaceholderOption={false} onChange={(e) => cambiar("estado", e.target.value)} />
        <SelectField label="Rama" showLabel={false} aria-label="Rama" name="filtro-rama" value={filtros.rama} options={OPCIONES_RAMA} showPlaceholderOption={false} onChange={(e) => cambiar("rama", e.target.value)} />
        <SelectField label="Nivel" showLabel={false} aria-label="Nivel" name="filtro-nivel" value={filtros.nivel} options={OPCIONES_NIVEL} showPlaceholderOption={false} onChange={(e) => cambiar("nivel", e.target.value)} />
      </search>

      {torneos.isPending && <AdminSpinner />}
      {torneos.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(torneos.error, "No pudimos cargar los torneos.")} />
          <button type="button" onClick={() => torneos.refetch()} className={BOTON}>Reintentar</button>
        </div>
      )}
      {torneos.data?.total === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          {hayFiltros ? <SearchX size={36} aria-hidden="true" className="mx-auto text-(--kt-teal-700)" /> : <Trophy size={36} aria-hidden="true" className="mx-auto text-(--kt-teal-700)" />}
          <p className="mt-3 font-semibold text-(--kt-ink)">{hayFiltros ? "No encontramos torneos con esos filtros" : "Todavía no hay torneos publicados"}</p>
          {hayFiltros && <button type="button" onClick={() => setParams({}, { replace: true })} className={`${BOTON} mt-4`}>Limpiar filtros</button>}
        </div>
      )}
      {torneos.data?.data.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-(--kt-ink-soft)">
            <p aria-live="polite">{torneos.data.total} torneo{torneos.data.total === 1 ? "" : "s"}{hayFiltros ? " con esos filtros" : ""}</p>
            {hayFiltros && <button type="button" onClick={() => setParams({}, { replace: true })} className="min-h-11 px-2 font-semibold text-(--kt-teal-700) hover:underline">Limpiar filtros</button>}
          </div>
          <ul className={`grid gap-4 sm:grid-cols-2 ${torneos.isPlaceholderData ? "opacity-60" : ""}`}>
            {torneos.data.data.map((t) => <li key={t.id}><TarjetaTorneo torneo={t} /></li>)}
          </ul>
        </>
      )}
      {torneos.data && <Pagination page={torneos.data.page} pages={torneos.data.totalPages} total={torneos.data.total} onChange={(p) => cambiar("page", p > 1 ? String(p) : "")} />}
    </div>
  );
}
