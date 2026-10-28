import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { PUESTOS_ALCANZADOS } from "../../../../../torneo_config.js";
import { getParticipantes } from "../../jugadores/jugadores_api.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;

/** Parejas confirmadas por categoría; los jugadores con cuenta llevan a su perfil con su historial. */
export default function ParticipantesPublicos({ torneoId }) {
  const datos = useQuery({ queryKey: ["publico", "participantes", torneoId], queryFn: () => getParticipantes(torneoId), staleTime: 60_000 });
  const [categoriaId, setCategoriaId] = useState(null);

  return (
    <section aria-labelledby="participantes-titulo" className="space-y-3">
      <h2 id="participantes-titulo" className="kt-display text-xl font-bold text-(--kt-ink)">Participantes</h2>
      {datos.isPending && <AdminSpinner />}
      {datos.isError && (
        <div className="space-y-3">
          <ErrorBanner message={mensajeDe(datos.error, "No pudimos cargar los participantes.")} />
          <button type="button" onClick={() => datos.refetch()} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Reintentar</button>
        </div>
      )}
      {datos.data && (() => {
        const categorias = datos.data;
        const actual = categorias.find((c) => c.id === categoriaId) ?? categorias[0];
        if (!actual) return null;
        return (
          <>
            {categorias.length > 1 && (
              <div role="tablist" aria-label="Categorías de participantes" className="flex flex-wrap gap-2">
                {categorias.map((c) => (
                  <button key={c.id} type="button" role="tab" aria-selected={actual.id === c.id} onClick={() => setCategoriaId(c.id)}
                    className={`${BOTON} ${actual.id === c.id ? "border-(--kt-petrol) bg-(--kt-petrol) text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                    {c.nombre} ({c.parejas.length})
                  </button>
                ))}
              </div>
            )}
            {actual.parejas.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-(--kt-ink-soft)">Todavía no hay parejas confirmadas en {actual.nombre}.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {actual.parejas.map((p) => (
                  <li key={p.id} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Jugador jugador={p.jugador1} />
                    <Jugador jugador={p.jugador2} />
                  </li>
                ))}
              </ul>
            )}
          </>
        );
      })()}
    </section>
  );
}

function Jugador({ jugador }) {
  if (!jugador.codigo) return <p className="text-sm font-semibold text-(--kt-ink)">{jugador.nombre}</p>;
  const { resumen } = jugador;
  return (
    <div>
      <Link to={`/jugadores/${jugador.codigo}`} className="inline-flex min-h-6 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline">
        {jugador.nombre}
        {resumen.titulos > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-900"><Trophy size={11} aria-label="Títulos" /> {resumen.titulos}</span>}
      </Link>
      <p className="text-xs text-(--kt-ink-soft)">
        {resumen.torneos ? `${resumen.torneos} torneo${resumen.torneos === 1 ? "" : "s"} · mejor: ${PUESTOS_ALCANZADOS[resumen.mejor_puesto]}` : "Primer torneo"}
      </p>
    </div>
  );
}
