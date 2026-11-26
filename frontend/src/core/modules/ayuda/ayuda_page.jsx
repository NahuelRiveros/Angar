import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CircleHelp, Lightbulb, Search, Sparkles, TriangleAlert } from "lucide-react";
import { useTemasAyuda } from "./use_temas_ayuda.js";
import { todosLosTemas } from "./registro_ayuda.js";
import { agruparTemas, buscarTemas } from "./ayuda_temas.js";

const TARJETA = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
const LINK = "outline-none focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)";

/** Ayuda del panel (AYU-01 a AYU-09): lista con buscador y cada tema en su propia dirección. */
export default function AyudaPage() {
  const { tema } = useParams();
  const temas = useTemasAyuda();
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      {tema ? <Tema id={tema} temas={temas} /> : <Lista temas={temas} />}
    </div>
  );
}

function Lista({ temas }) {
  const [params, setParams] = useSearchParams();
  const consulta = params.get("q") ?? "";
  const encontrados = buscarTemas(temas, consulta);
  const sinResultados = consulta.trim() && !encontrados.length;
  const buscar = (valor) => setParams(valor ? { q: valor } : {}, { replace: true });

  return <>
    <div>
      <h1 className="kt-display flex items-center gap-2 text-2xl font-bold text-(--kt-ink)"><CircleHelp aria-hidden="true" className="h-6 w-6 text-(--kt-teal-700)" />Ayuda</h1>
      <p className="mt-1 text-sm text-(--kt-ink-soft)">Guías paso a paso de lo que podés hacer en el panel. Solo ves las de las funciones de tu rol.</p>
    </div>
    {temas.some((t) => t.id === "bienvenida") && !consulta.trim() && (
      <Link to="/panel/ayuda/bienvenida" className={`flex items-center gap-3 rounded-2xl border border-(--kt-turquoise) bg-(--kt-turquoise-soft) p-4 text-sm text-(--kt-ink) ${LINK}`}>
        <Sparkles aria-hidden="true" className="h-6 w-6 shrink-0 text-(--kt-teal-700)" />
        <span><b className="block">¿Es tu primera vez?</b>Empezá por "Empezá acá": te explica en 5 minutos cómo funciona todo.</span>
        <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0" />
      </Link>
    )}
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-(--kt-ink-soft)" />
      <label htmlFor="ayuda-buscar" className="sr-only">Buscar en la ayuda</label>
      <input id="ayuda-buscar" type="search" value={consulta} onChange={(e) => buscar(e.target.value)} maxLength={80} autoComplete="off"
        placeholder="Buscá, por ejemplo: precio 0, bulto, oferta" className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-10 text-base outline-none focus:border-(--kt-turquoise) focus:ring-2 focus:ring-(--kt-turquoise)/30" />
    </div>
    {sinResultados && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No encontramos ayuda sobre "{consulta.trim()}". Mirá la lista completa.</p>}
    {!temas.length
      ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-(--kt-ink-soft)">Todavía no hay guías para las funciones de tu rol.</p>
      : (consulta.trim() && !sinResultados
        ? <section aria-label="Resultados" className="space-y-3"><p className="text-sm text-(--kt-ink-soft)">{encontrados.length} {encontrados.length === 1 ? "guía encontrada" : "guías encontradas"}</p><Tarjetas temas={encontrados} /></section>
        : agruparTemas(temas).map(({ grupo, temas: delGrupo }) => (
            <section key={grupo} aria-labelledby={`ayuda-${grupo}`} className="space-y-3">
              <h2 id={`ayuda-${grupo}`} className="text-xs font-semibold tracking-wider text-(--kt-ink-soft) uppercase">{grupo}</h2>
              <Tarjetas temas={delGrupo} />
            </section>
          )))}
  </>;
}

function Tarjetas({ temas }) {
  return <ul className="grid gap-3 sm:grid-cols-2">
    {temas.map((t) => (
      <li key={t.id}>
        <Link to={`/panel/ayuda/${t.id}`} className={`group flex h-full items-start justify-between gap-3 ${TARJETA} transition hover:border-(--kt-turquoise) ${LINK}`}>
          <span><span className="block font-bold text-(--kt-ink)">{t.titulo}</span><span className="mt-1 block text-sm text-(--kt-ink-soft)">{t.resumen}</span></span>
          <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-(--kt-teal-700) transition group-hover:translate-x-0.5" />
        </Link>
      </li>
    ))}
  </ul>;
}

const Volver = () => <Link to="/panel/ayuda" className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-(--kt-teal-700) ${LINK}`}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Todos los temas</Link>;

function Tema({ id, temas }) {
  const tema = temas.find((t) => t.id === id);
  if (!tema) {
    // AYU-04 (e): el tema existe pero es de otra función; o la dirección está mal.
    const existe = todosLosTemas.some((t) => t.id === id);
    return <>
      <Volver />
      <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {existe ? "Esta ayuda es para otra función del panel." : "No encontramos esa guía."} Mirá los temas que tenés disponibles.
      </p>
    </>;
  }
  const relacionados = tema.relacionados.map((r) => temas.find((t) => t.id === r)).filter(Boolean);
  return <article aria-labelledby="ayuda-titulo" className="space-y-5">
    <Volver />
    <header>
      <p className="text-xs font-semibold tracking-wider text-(--kt-ink-soft) uppercase">{tema.grupo}</p>
      <h1 id="ayuda-titulo" className="kt-display mt-1 text-2xl font-bold text-(--kt-ink)">{tema.titulo}</h1>
      <p className="mt-1 text-(--kt-ink-soft)">{tema.resumen}</p>
      {tema.pantalla && <Link to={tema.pantalla} className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-(--kt-petrol) px-4 text-sm font-semibold text-white hover:bg-(--kt-night) ${LINK}`}>Ir a la pantalla<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>}
    </header>
    {tema.secciones.map((s) => <Seccion key={s.titulo} seccion={s} />)}
    {relacionados.length > 0 && <nav aria-label="Temas relacionados" className={TARJETA}>
      <h2 className="font-bold text-(--kt-ink)">Relacionado</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {relacionados.map((r) => <li key={r.id}><Link to={`/panel/ayuda/${r.id}`} className={`inline-flex min-h-11 items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-(--kt-ink) hover:border-(--kt-turquoise) ${LINK}`}>{r.titulo}</Link></li>)}
      </ul>
    </nav>}
  </article>;
}

function Seccion({ seccion: s }) {
  return <section className={TARJETA}>
    <h2 className="font-bold text-(--kt-ink)">{s.titulo}</h2>
    {[s.texto ?? []].flat().map((parrafo) => <p key={parrafo} className="mt-2 text-sm leading-relaxed text-(--kt-ink)">{parrafo}</p>)}
    {s.pasos && <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-(--kt-ink)">{s.pasos.map((p) => <li key={p}>{p}</li>)}</ol>}
    {s.ejemplo && <p className="mt-2 flex gap-2 rounded-xl bg-(--kt-turquoise-soft) p-3 text-sm text-(--kt-ink)"><Lightbulb aria-hidden="true" className="h-5 w-5 shrink-0 text-(--kt-teal-700)" /><span>{s.ejemplo}</span></p>}
    {s.consejo && <p className="mt-2 flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-(--kt-ink)"><Sparkles aria-hidden="true" className="h-5 w-5 shrink-0 text-(--kt-teal-700)" /><span>{s.consejo}</span></p>}
    {s.problemas && <dl className="mt-2 space-y-3 text-sm">{s.problemas.map((p) => (
      <div key={p.problema} className="rounded-xl border border-slate-200 p-3">
        <dt className="flex gap-2 font-semibold text-(--kt-ink)"><TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0 translate-y-0.5 text-amber-600" />{p.problema}</dt>
        <dd className="mt-1 pl-6 text-(--kt-ink-soft)">{p.solucion}</dd>
      </div>
    ))}</dl>}
  </section>;
}
