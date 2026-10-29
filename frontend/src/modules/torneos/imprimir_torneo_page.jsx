import { Link, useParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import AdminSpinner from "../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../controls/ui/error_banner.jsx";
import { FORMATOS_PARTIDO } from "../../../../torneo_config.js";
import { formatearFechaAR } from "../../utils/formatear_fecha.js";
import { getTorneo, getZonas, getLlave } from "./api/torneos_api.js";
import { claveTorneo, mensajeDe } from "./detalle/use_cambio_torneo.js";
import { HorarioPartido } from "./torneo_ui.jsx";

// Mismas claves que las pestañas Zonas y Llave: si ya se miraron, no se vuelven a pedir.
const claveZonas = (torneoId, categoriaId) => ["torneos", Number(torneoId), "zonas", Number(categoriaId)];
const claveLlave = (torneoId, categoriaId) => ["torneos", Number(torneoId), "llave", Number(categoriaId)];
const marcador = (sets) => sets.map(([a, b]) => `${a}-${b}`).join(" ");
const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold";

/**
 * Fixture y llave de todo el torneo en una versión para imprimir o guardar como PDF (desde el
 * diálogo de impresión del navegador): sin menús ni botones, una categoría por hoja.
 */
export default function ImprimirTorneoPage() {
  const { torneoId } = useParams();
  const torneo = useQuery({ queryKey: claveTorneo(torneoId), queryFn: () => getTorneo(torneoId) });
  const categorias = torneo.data?.categorias ?? [];
  const zonas = useQueries({ queries: categorias.map((c) => ({ queryKey: claveZonas(torneoId, c.id), queryFn: () => getZonas(torneoId, c.id) })) });
  const llaves = useQueries({ queries: categorias.map((c) => ({ queryKey: claveLlave(torneoId, c.id), queryFn: () => getLlave(torneoId, c.id) })) });
  const cargando = torneo.isPending || zonas.some((q) => q.isPending) || llaves.some((q) => q.isPending);
  const conError = [torneo, ...zonas, ...llaves].find((q) => q.isError);

  if (cargando) return <div className="p-8"><AdminSpinner /></div>;
  if (conError) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-8">
        <ErrorBanner message={mensajeDe(conError.error, "No pudimos armar la versión para imprimir.")} />
        <button type="button" onClick={() => [torneo, ...zonas, ...llaves].forEach((q) => q.isError && q.refetch())} className={`${BOTON} border-slate-300 bg-white`}>Reintentar</button>
      </div>
    );
  }
  const t = torneo.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-(--kt-ink) print:max-w-none print:p-0 print:text-black">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to={`/mis-torneos/${t.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al torneo
        </Link>
        <button type="button" onClick={() => window.print()} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>
          <Printer size={16} aria-hidden="true" /> Imprimir o guardar PDF
        </button>
      </div>
      <p className="rounded-2xl bg-(--kt-bg-soft) p-3 text-sm print:hidden">Para PDF: en la ventana de impresión elegí "Guardar como PDF". Cada categoría sale en su propia hoja.</p>

      {categorias.length === 0 && <p className="text-sm">Este torneo todavía no tiene categorías.</p>}
      {categorias.map((c, i) => (
        <article key={c.id} className="space-y-4 break-inside-avoid-page print:break-before-page print:first:break-before-auto" aria-labelledby={`imprimir-${c.id}`}>
          <header className="border-b border-slate-300 pb-2">
            <p className="text-sm text-(--kt-ink-soft) print:text-black">{t.nombre}{t.sede ? ` · ${t.sede}` : ""}{t.fecha_inicio ? ` · ${formatearFechaAR(t.fecha_inicio)}` : ""}</p>
            <h1 id={`imprimir-${c.id}`} className="text-2xl font-bold">{c.nombre}</h1>
          </header>
          <ZonasImprimibles d={zonas[i].data} />
          <LlaveImprimible d={llaves[i].data} />
        </article>
      ))}
    </div>
  );
}

function ZonasImprimibles({ d }) {
  if (!d?.zonas.length) return <p className="text-sm">Las zonas todavía no se sortearon.</p>;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Zonas · {FORMATOS_PARTIDO[d.formato.formato_zona]?.etiqueta} · clasifican {d.formato.clasifican_por_zona}</h2>
      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
        {d.zonas.map((z) => (
          <div key={z.id} className="break-inside-avoid rounded-xl border border-slate-300 p-3">
            <h3 className="font-bold">Zona {z.nombre}</h3>
            <table className="mt-1 w-full text-sm">
              <thead><tr className="border-b border-slate-300 text-left text-xs"><th className="py-1">#</th><th>Pareja</th><th className="text-center">PG</th><th className="text-center">Sets</th><th className="text-center">Games</th></tr></thead>
              <tbody>
                {z.tabla.map((f) => (
                  <tr key={f.inscripcion_id} className="border-b border-slate-100">
                    <td className="py-1">{f.posicion}</td>
                    <td>{f.pareja?.nombre}{f.clasificado ? " ✓" : ""}</td>
                    <td className="text-center">{f.pg}</td>
                    <td className="text-center">{f.sets_favor - f.sets_contra}</td>
                    <td className="text-center">{f.games_favor - f.games_contra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-2 space-y-1 text-xs">
              {z.partidos.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="min-w-0">{p.pareja1?.nombre} vs {p.pareja2?.nombre}<HorarioPartido partido={p} className="print:text-black" /></span>
                  <span className="shrink-0 font-mono">{p.sets ? marcador(p.sets) : "____"}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function LlaveImprimible({ d }) {
  if (!d?.armada) return <p className="text-sm">La llave se arma cuando terminen las zonas.</p>;
  return (
    <section className="space-y-3 break-inside-avoid">
      <h2 className="text-lg font-bold">Llave · {FORMATOS_PARTIDO[d.formato_llave]?.etiqueta}</h2>
      <div className="grid gap-3 sm:grid-cols-3 print:grid-cols-3">
        {d.rondas.map((r) => (
          <div key={r.ronda} className="space-y-2">
            <h3 className="text-sm font-bold">{r.nombre}</h3>
            {r.partidos.map((p) => (
              <div key={p.id} className="break-inside-avoid rounded-lg border border-slate-300 p-2 text-xs">
                {[p.pareja1, p.pareja2].map((pareja, i) => (
                  <p key={i} className={`flex justify-between gap-2 ${pareja && p.ganador_id === pareja.id ? "font-bold" : ""}`}>
                    <span>{pareja?.nombre ?? "A definir"}</span>
                    <span className="font-mono">{p.sets ? p.sets.map((s) => s[i]).join(" ") : ""}</span>
                  </p>
                ))}
                <HorarioPartido partido={p} className="mt-0.5 print:text-black" />
              </div>
            ))}
          </div>
        ))}
      </div>
      {d.podio.campeon && <p className="text-sm font-bold">Campeones: {d.podio.campeon.nombre} · Subcampeones: {d.podio.subcampeon?.nombre}</p>}
    </section>
  );
}
