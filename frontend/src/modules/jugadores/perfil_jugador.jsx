import { Link } from "react-router-dom";
import { Copy, Trophy } from "lucide-react";
import { useToast } from "../../controls/toast/toast_context.jsx";
import { PUESTOS_ALCANZADOS } from "../../../../torneo_config.js";
import { formatearFechaAR } from "../../utils/formatear_fecha.js";

// Más copas que esto se resumen con "+N" para no romper la fila en el celular.
const COPAS_VISIBLES = 8;

/** Perfil del jugador: lo comparten "Mi perfil" (con el código para copiar) y el perfil público. */
export default function PerfilJugador({ perfil, propio = false }) {
  const { resumen } = perfil;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-4 rounded-3xl border border-(--kt-border) bg-white p-5 shadow-sm sm:p-6">
        <div aria-hidden="true" className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-(--kt-petrol) text-2xl font-bold text-white">
          {perfil.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          {resumen.titulos > 0 && (
            <span className="absolute -right-1 -bottom-1 flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full bg-amber-400 px-1.5 text-xs font-bold text-amber-950 ring-2 ring-white">
              <Trophy size={12} /> {resumen.titulos}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="kt-display text-2xl font-bold text-(--kt-ink)">{perfil.nombre}</h1>
          <CodigoJugador codigo={perfil.codigo} copiable={propio} />
        </div>
      </header>

      {propio && (
        <p className="rounded-2xl bg-(--kt-bg-soft) p-4 text-sm text-(--kt-ink)">
          Pasale tu código a tu compañero: con él te invita a los torneos y aceptás la invitación desde <Link to="/mis-inscripciones" className="font-semibold underline">Mis inscripciones</Link>.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero titulo="Torneos" valor={resumen.torneos} />
        <Numero titulo="Títulos" valor={resumen.titulos} />
        <Numero titulo="Finales" valor={resumen.finales} />
        <Numero titulo="Mejor puesto" valor={resumen.mejor_puesto ? PUESTOS_ALCANZADOS[resumen.mejor_puesto] : "—"} />
      </dl>

      {resumen.titulos > 0 && (
        <section aria-labelledby="copas-titulo" className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 id="copas-titulo" className="font-bold text-amber-950">Copas</h2>
          <p className="mt-2 flex flex-wrap items-center gap-1 text-amber-600" aria-label={`${resumen.titulos} torneo${resumen.titulos === 1 ? "" : "s"} ganado${resumen.titulos === 1 ? "" : "s"}`}>
            {Array.from({ length: Math.min(resumen.titulos, COPAS_VISIBLES) }, (_, i) => <Trophy key={i} size={28} aria-hidden="true" className="fill-amber-300" />)}
            {resumen.titulos > COPAS_VISIBLES && <span className="ml-1 font-bold text-amber-950">+{resumen.titulos - COPAS_VISIBLES}</span>}
          </p>
        </section>
      )}

      <section aria-labelledby="historial-titulo" className="space-y-3">
        <h2 id="historial-titulo" className="kt-display text-xl font-bold text-(--kt-ink)">Historial</h2>
        {perfil.historial.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-(--kt-ink-soft)">
            Todavía no jugó torneos en MiPadel. {propio && <Link to="/torneos" className="font-semibold text-(--kt-teal-700) underline">Ver torneos</Link>}
          </p>
        ) : (
          <ul className="divide-y divide-(--kt-border) rounded-2xl border border-slate-200 bg-white">
            {perfil.historial.map((h, i) => (
              <li key={`${h.torneo_id}-${i}`} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <Link to={`/torneos/${h.torneo_id}`} className="font-semibold text-(--kt-ink) hover:underline">{h.torneo}</Link>
                  <p className="text-xs text-(--kt-ink-soft)">{h.categoria}{h.fecha_inicio ? ` · ${formatearFechaAR(h.fecha_inicio)}` : ""}{h.torneo_estado === "en_juego" ? " · en juego" : ""}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${h.puesto === "campeon" ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-slate-50 text-slate-700 ring-slate-200"}`}>
                  {h.puesto === "campeon" && <Trophy size={12} aria-hidden="true" />}{PUESTOS_ALCANZADOS[h.puesto]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Numero({ titulo, valor }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <dt className="text-xs font-semibold text-(--kt-ink-soft)">{titulo}</dt>
      <dd className="mt-1 text-xl font-bold text-(--kt-ink)">{valor}</dd>
    </div>
  );
}

function CodigoJugador({ codigo, copiable }) {
  const toast = useToast();
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success("Código copiado");
    } catch {
      toast.error("No se pudo copiar: seleccionalo y copialo a mano.");
    }
  }
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-(--kt-ink-soft)">
      Código de jugador: <span className="font-mono font-bold tracking-wider whitespace-nowrap text-(--kt-ink)">{codigo}</span>
      {copiable && (
        <button type="button" onClick={copiar} aria-label="Copiar mi código" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-(--kt-teal-700) hover:bg-(--kt-bg-soft)">
          <Copy size={18} aria-hidden="true" />
        </button>
      )}
    </p>
  );
}
