import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Medal, RefreshCw, Trophy } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { FORMATOS_PARTIDO } from "../../../../../torneo_config.js";
import { getCategoriaPublica } from "../api/torneos_api.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

/** Zonas, fixture y llave de cada categoría, de solo lectura, para seguir el torneo sin cuenta. */
export default function ResultadosPublicos({ torneo }) {
  const [categoriaId, setCategoriaId] = useState(torneo.categorias[0]?.id ?? null);
  if (!categoriaId) return null;
  return (
    <section aria-labelledby="resultados-titulo" className="space-y-3">
      <h2 id="resultados-titulo" className="kt-display text-xl font-bold text-(--kt-ink)">Zonas y llave</h2>
      {torneo.categorias.length > 1 && (
        <div role="tablist" aria-label="Categorías" className="flex flex-wrap gap-2">
          {torneo.categorias.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={categoriaId === c.id} onClick={() => setCategoriaId(c.id)}
              className={`${BOTON} ${categoriaId === c.id ? "border-(--kt-petrol) bg-(--kt-petrol) text-white" : "border-slate-300 bg-white text-slate-700"}`}>
              {c.nombre}
            </button>
          ))}
        </div>
      )}
      <ResultadosDeCategoria key={categoriaId} torneoId={torneo.id} categoriaId={categoriaId} />
    </section>
  );
}

function ResultadosDeCategoria({ torneoId, categoriaId }) {
  const datos = useQuery({ queryKey: ["publico", "categoria", torneoId, categoriaId], queryFn: () => getCategoriaPublica(torneoId, categoriaId), staleTime: 30_000 });
  const [vista, setVista] = useState(null); // null = la que corresponda (llave si está armada)

  if (datos.isPending) return <AdminSpinner />;
  if (datos.isError) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={mensajeDe(datos.error, "No pudimos cargar los resultados.")} />
        <button type="button" onClick={() => datos.refetch()} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Reintentar</button>
      </div>
    );
  }
  const d = datos.data;
  if (!d.zonas.length) return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-(--kt-ink-soft)">Las zonas todavía no se armaron.</p>;
  const actual = vista ?? (d.llave.armada ? "llave" : "zonas");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Fase" className="inline-flex rounded-xl border border-slate-300 bg-white p-1">
          {[["zonas", "Zonas"], ["llave", "Llave"]].map(([codigo, etiqueta]) => (
            <button key={codigo} type="button" role="tab" aria-selected={actual === codigo} disabled={codigo === "llave" && !d.llave.armada} onClick={() => setVista(codigo)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-40 ${actual === codigo ? "bg-(--kt-petrol) text-white" : "text-slate-700"}`}>
              {etiqueta}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => datos.refetch()} disabled={datos.isFetching} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>
          <RefreshCw size={16} aria-hidden="true" className={datos.isFetching ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>
      {actual === "zonas" ? <ZonasPublicas d={d} /> : <LlavePublica llave={d.llave} />}
    </div>
  );
}

function ZonasPublicas({ d }) {
  return (
    <>
      <p className="text-sm text-(--kt-ink-soft)">{FORMATOS_PARTIDO[d.formato.formato_zona]?.etiqueta} · clasifican {d.formato.clasifican_por_zona} por zona</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {d.zonas.map((zona) => (
          <article key={zona.id} aria-labelledby={`zona-publica-${zona.id}`} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 id={`zona-publica-${zona.id}`} className="kt-display text-lg font-bold text-(--kt-ink)">Zona {zona.nombre}</h3>
            <table className="w-full text-sm">
              <caption className="sr-only">Posiciones de la zona {zona.nombre}</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-(--kt-ink-soft)">
                  <th scope="col" className="py-1.5 pr-2">#</th>
                  <th scope="col" className="py-1.5 pr-2">Pareja</th>
                  <th scope="col" className="px-1 py-1.5 text-center" title="Partidos ganados">PG</th>
                  <th scope="col" className="px-1 py-1.5 text-center" title="Diferencia de sets">Sets</th>
                  <th scope="col" className="px-1 py-1.5 text-center" title="Diferencia de games">Games</th>
                </tr>
              </thead>
              <tbody>
                {zona.tabla.map((f) => (
                  <tr key={f.inscripcion_id} className={`border-b border-slate-100 ${f.clasificado ? "bg-emerald-50/60" : ""}`}>
                    <td className="py-2 pr-2 font-bold">{f.posicion}</td>
                    <td className="py-2 pr-2 font-semibold">{f.pareja?.nombre}{f.clasificado && <span className="ml-1.5 text-xs font-bold text-emerald-800">Clasifica</span>}</td>
                    <td className="px-1 py-2 text-center">{f.pg}</td>
                    <td className="px-1 py-2 text-center">{f.sets_favor - f.sets_contra}</td>
                    <td className="px-1 py-2 text-center">{f.games_favor - f.games_contra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ol className="space-y-1.5" aria-label={`Partidos de la zona ${zona.nombre}`}>
              {zona.partidos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-(--kt-bg-soft) px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className={p.ganador_id === p.pareja1?.id ? "font-bold" : ""}>{p.pareja1?.nombre}</span>
                    <span className="text-(--kt-ink-soft)"> vs </span>
                    <span className={p.ganador_id === p.pareja2?.id ? "font-bold" : ""}>{p.pareja2?.nombre}</span>
                  </span>
                  <span className={p.sets ? "font-mono font-bold" : "text-xs text-(--kt-ink-soft)"}>{p.sets ? p.sets.map(([a, b]) => `${a}-${b}`).join(" ") : "Por jugar"}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </>
  );
}

function LlavePublica({ llave }) {
  return (
    <div className="space-y-4">
      {llave.podio.campeon && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="flex items-center gap-2 font-bold"><Trophy size={18} aria-hidden="true" /> Campeones: {llave.podio.campeon.nombre}</p>
          <p className="mt-1 flex items-center gap-2 text-sm"><Medal size={16} aria-hidden="true" /> Subcampeones: {llave.podio.subcampeon?.nombre}</p>
          {llave.podio.semifinalistas.length > 0 && <p className="mt-1 text-sm">Semifinalistas: {llave.podio.semifinalistas.map((p) => p.nombre).join(" · ")}</p>}
        </div>
      )}
      <div className="grid gap-4 lg:auto-cols-fr lg:grid-flow-col">
        {llave.rondas.map((ronda) => (
          <section key={ronda.ronda} aria-labelledby={`ronda-publica-${ronda.ronda}`} className="flex flex-col gap-3">
            <h3 id={`ronda-publica-${ronda.ronda}`} className="kt-display text-base font-bold text-(--kt-ink)">{ronda.nombre}</h3>
            <ol className="space-y-3 lg:flex lg:flex-1 lg:flex-col lg:justify-around lg:gap-3 lg:space-y-0">
              {ronda.partidos.map((p) => (
                <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
                  {[p.pareja1, p.pareja2].map((pareja, i) => (
                    <p key={i} className={`flex items-center justify-between gap-2 py-1 ${pareja && p.ganador_id === pareja.id ? "font-bold text-(--kt-ink)" : "text-(--kt-ink-soft)"}`}>
                      <span className="min-w-0 break-words">{pareja?.nombre ?? "A definir"}</span>
                      {p.sets && <span className="shrink-0 font-mono">{p.sets.map((s) => s[i]).join(" ")}</span>}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
