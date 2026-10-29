import { Link } from "react-router-dom";
import { ArrowRight, Award, CalendarDays, Layers, MapPin, Users } from "lucide-react";
import { FORMATOS_PARTIDO } from "../../../../../torneo_config.js";
import { formatearFechaAR } from "../../../utils/formatear_fecha.js";
import { EstadoTorneo } from "../comun/torneo_ui.jsx";

// Más categorías que esto se resumen con "+N" para que la tarjeta no crezca de más.
const CATEGORIAS_VISIBLES = 4;
const COLOR_RAMA = { caballeros: "bg-sky-50 text-sky-800 ring-sky-200", damas: "bg-rose-50 text-rose-800 ring-rose-200", mixto: "bg-violet-50 text-violet-800 ring-violet-200" };

function fechas(t) {
  if (!t.fecha_inicio) return "Fecha a confirmar";
  const fin = t.fecha_fin && t.fecha_fin !== t.fecha_inicio ? ` al ${formatearFechaAR(t.fecha_fin)}` : "";
  return `${formatearFechaAR(t.fecha_inicio)}${fin}`;
}

function formato(f) {
  if (!f) return "Formato según la categoría";
  return `Zonas de ${f.parejas_por_zona}, clasifican ${f.clasifican_por_zona} y llave · ${FORMATOS_PARTIDO[f.formato_zona]?.etiqueta ?? ""}`;
}

/** Lugares o parejas, según en qué momento está el torneo. */
function cupo(t) {
  const parejas = `${t.parejas} pareja${t.parejas === 1 ? "" : "s"}`;
  if (t.estado !== "inscripcion") return { texto: parejas, tono: "text-(--kt-ink-soft)" };
  if (t.lugares_libres === 0) return { texto: "Cupo completo", tono: "text-amber-800" };
  if (t.lugares_libres !== null) return { texto: `Quedan ${t.lugares_libres} lugar${t.lugares_libres === 1 ? "" : "es"}`, tono: "text-emerald-700" };
  return { texto: `${parejas} anotada${t.parejas === 1 ? "" : "s"}`, tono: "text-(--kt-ink-soft)" };
}

/** Tarjeta de la lista pública: qué se juega, cómo, dónde y si quedan lugares. */
export default function TarjetaTorneo({ torneo: t }) {
  const visibles = t.categorias.slice(0, CATEGORIAS_VISIBLES);
  const resto = t.categorias.length - visibles.length;
  const { texto, tono } = cupo(t);
  const accion = t.estado === "inscripcion" && t.lugares_libres !== 0 ? "Anotarme" : t.estado === "inscripcion" ? "Ver torneo" : "Ver resultados";

  return (
    <Link to={`/torneos/${t.id}`} aria-label={`${t.nombre}: ${accion.toLowerCase()}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-(--kt-teal-700) hover:shadow-md focus-visible:ring-2 focus-visible:ring-(--kt-turquoise) focus-visible:outline-none sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-bold text-(--kt-ink) sm:text-lg">{t.nombre}</h2>
        <EstadoTorneo estado={t.estado} />
      </div>
      {t.descripcion && <p className="mt-1 line-clamp-2 text-sm text-(--kt-ink-soft)">{t.descripcion}</p>}

      <dl className="mt-3 space-y-1.5 text-sm text-(--kt-ink-soft)">
        <div className="flex items-center gap-1.5"><dt className="sr-only">Fecha</dt><CalendarDays size={15} aria-hidden="true" className="shrink-0" /><dd>{fechas(t)}</dd></div>
        <div className="flex items-center gap-1.5"><dt className="sr-only">Sede</dt><MapPin size={15} aria-hidden="true" className="shrink-0" /><dd>{[t.sede, t.localidad].filter(Boolean).join(", ") || "Sede a confirmar"}</dd></div>
        {t.categorias.length > 0 && (
          <div className="flex items-start gap-1.5"><dt className="sr-only">Formato</dt><Layers size={15} aria-hidden="true" className="mt-0.5 shrink-0" /><dd>{formato(t.formato)}</dd></div>
        )}
        {t.premio_campeon && (
          <div className="flex items-start gap-1.5 text-amber-900"><dt className="sr-only">Premio</dt><Award size={15} aria-hidden="true" className="mt-0.5 shrink-0" /><dd className="line-clamp-1">Campeón: {t.premio_campeon}</dd></div>
        )}
      </dl>

      {t.categorias.length > 0 && (
        <ul aria-label="Categorías" className="mt-3 flex flex-wrap gap-1.5">
          {visibles.map((c) => (
            <li key={c.nombre} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${COLOR_RAMA[c.rama] ?? "bg-slate-50 text-slate-700 ring-slate-200"}`}>{c.nombre}</li>
          ))}
          {resto > 0 && <li className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">+{resto} más</li>}
        </ul>
      )}

      {/* mt-auto: el pie queda abajo aunque las tarjetas de la fila tengan distinto contenido. */}
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
          <span className={`flex items-center gap-1.5 font-semibold ${tono}`}><Users size={15} aria-hidden="true" />{texto}</span>
          <span className="inline-flex items-center gap-1 font-bold text-(--kt-teal-700)">{accion}<ArrowRight size={15} aria-hidden="true" className="transition group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </Link>
  );
}
