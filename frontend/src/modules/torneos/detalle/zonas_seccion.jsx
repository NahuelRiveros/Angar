import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shuffle, Star, Trophy } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { FORMATOS_PARTIDO, PERMITIDO } from "../../../../../torneo_config.js";
import { getZonas, sortearZonas, moverPareja, guardarResultado, borrarResultado } from "../api/torneos_api.js";
import { mensajeDe } from "./use_cambio_torneo.js";
import ResultadoModal from "./resultado_modal.jsx";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const claveZonas = (torneoId, categoriaId) => ["torneos", Number(torneoId), "zonas", Number(categoriaId)];
const marcador = (sets) => sets.map(([a, b]) => `${a}-${b}`).join(" ");

/** Cambio sobre las zonas: el servidor devuelve las zonas completas y van directo a la caché. */
function useCambioZonas(torneoId, categoriaId, accion, { onExito, errorEnPantalla = false } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: accion,
    onSuccess: async (r) => {
      queryClient.setQueryData(claveZonas(torneoId, categoriaId), r.data);
      toast.success(r.mensaje);
      await queryClient.invalidateQueries({ queryKey: ["torneos", Number(torneoId), "inscripciones"] });
      onExito?.(r);
    },
    // Si la pantalla ya muestra el error (el modal del resultado), no se repite en un aviso.
    onError: (e) => { if (!errorEnPantalla) toast.error(mensajeDe(e, "No se pudo completar la acción.")); },
  });
}

export default function ZonasSeccion({ torneo, editable }) {
  const [categoriaId, setCategoriaId] = useState(String(torneo.categorias[0]?.id ?? ""));
  if (!torneo.categorias.length) return <p className="text-sm text-(--kt-ink-soft)">Primero cargá las categorías del torneo.</p>;
  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <SelectField label="Categoría" name="zonas-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} showPlaceholderOption={false}
          options={torneo.categorias.map((c) => ({ value: String(c.id), label: c.nombre }))} />
      </div>
      <ZonasDeCategoria key={categoriaId} torneo={torneo} categoriaId={Number(categoriaId)} editable={editable} />
    </div>
  );
}

function ZonasDeCategoria({ torneo, categoriaId, editable }) {
  const [confirmarSorteo, setConfirmarSorteo] = useState(false);
  const [partidoAbierto, setPartidoAbierto] = useState(null);
  const zonas = useQuery({ queryKey: claveZonas(torneo.id, categoriaId), queryFn: () => getZonas(torneo.id, categoriaId) });
  const sortear = useCambioZonas(torneo.id, categoriaId, () => sortearZonas(torneo.id, categoriaId), { onExito: () => setConfirmarSorteo(false) });
  const mover = useCambioZonas(torneo.id, categoriaId, ({ parejaId, zonaId }) => moverPareja(torneo.id, categoriaId, parejaId, zonaId));
  const cerrarPartido = { onExito: () => setPartidoAbierto(null), errorEnPantalla: true };
  const guardar = useCambioZonas(torneo.id, categoriaId, ({ partidoId, sets }) => guardarResultado(torneo.id, partidoId, sets), cerrarPartido);
  const borrar = useCambioZonas(torneo.id, categoriaId, (partidoId) => borrarResultado(torneo.id, partidoId), cerrarPartido);

  if (zonas.isPending) return <AdminSpinner />;
  if (zonas.isError) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={mensajeDe(zonas.error, "No pudimos cargar las zonas.")} />
        <button type="button" onClick={() => zonas.refetch()} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Reintentar</button>
      </div>
    );
  }

  const d = zonas.data;
  const hayResultados = d.zonas.some((z) => z.partidos.some((p) => p.sets));
  const puedeArmar = editable && PERMITIDO.armarZonas.includes(torneo.estado);
  const puedeCargar = editable && PERMITIDO.cargarResultados.includes(torneo.estado);
  const opcionesZona = d.zonas.map((z) => ({ value: String(z.id), label: `Zona ${z.nombre}` }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-(--kt-bg-soft) p-3">
        <p className="text-sm text-(--kt-ink)">
          Zonas de <strong>{d.formato.parejas_por_zona}</strong> · clasifican <strong>{d.formato.clasifican_por_zona}</strong> · {FORMATOS_PARTIDO[d.formato.formato_zona]?.etiqueta}
        </p>
        {puedeArmar && (
          <button type="button" disabled={sortear.isPending || hayResultados} title={hayResultados ? "Ya hay resultados cargados" : undefined}
            onClick={() => (d.zonas.length ? setConfirmarSorteo(true) : sortear.mutate())} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>
            <Shuffle size={16} aria-hidden="true" /> {d.zonas.length ? "Volver a sortear" : "Sortear zonas"}
          </button>
        )}
      </div>
      {!PERMITIDO.armarZonas.includes(torneo.estado) && !d.zonas.length && (
        <p className="text-sm text-(--kt-ink-soft)">Las zonas se arman cuando el torneo está en inscripción o en juego.</p>
      )}
      {editable && torneo.estado === "inscripcion" && d.zonas.length > 0 && (
        <p className="text-sm text-(--kt-ink-soft)">Los resultados se cargan cuando pases el torneo a "En juego".</p>
      )}

      {d.sin_zona.length > 0 && (
        <div role="status" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">{d.sin_zona.length} pareja{d.sin_zona.length === 1 ? "" : "s"} confirmada{d.sin_zona.length === 1 ? "" : "s"} sin zona{d.zonas.length ? ": ubicalas o volvé a sortear." : "."}</p>
          {d.zonas.length > 0 && puedeArmar && d.sin_zona.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">{p.nombre}</span>
              <div className="w-40"><SelectField label={`Ubicar a ${p.nombre}`} showLabel={false} name={`ubicar-${p.id}`} value="" placeholder="Ubicar en…" options={opcionesZona}
                onChange={(e) => e.target.value && mover.mutate({ parejaId: p.id, zonaId: Number(e.target.value) })} disabled={mover.isPending} /></div>
            </div>
          ))}
        </div>
      )}
      {d.zonas.length === 0 && d.sin_zona.length < 2 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-(--kt-ink-soft)">Hacen falta al menos 2 parejas confirmadas para armar las zonas.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {d.zonas.map((zona) => {
          const zonaConResultados = zona.partidos.some((p) => p.sets);
          return (
            <section key={zona.id} aria-labelledby={`zona-${zona.id}`} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 id={`zona-${zona.id}`} className="kt-display text-lg font-bold text-(--kt-ink)">Zona {zona.nombre}</h3>
                {zona.completa && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">Terminada</span>}
              </div>
              <div className="overflow-x-auto">
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
                        <td className="py-2 pr-2">
                          <span className="font-semibold">{f.pareja?.cabeza_de_serie && <Star size={12} aria-label="Cabeza de serie" className="mr-1 inline fill-amber-400 text-amber-500" />}{f.pareja?.nombre}</span>
                          {f.clasificado && <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-bold text-emerald-800"><Trophy size={12} aria-hidden="true" /> Clasifica</span>}
                          {puedeArmar && !zonaConResultados && d.zonas.length > 1 && (
                            <div className="mt-1 w-40"><SelectField label={`Mover a ${f.pareja?.nombre}`} showLabel={false} name={`mover-${f.inscripcion_id}`} value="" placeholder="Mover a…" disabled={mover.isPending}
                              options={opcionesZona.filter((o) => Number(o.value) !== zona.id)} onChange={(e) => e.target.value && mover.mutate({ parejaId: f.inscripcion_id, zonaId: Number(e.target.value) })} /></div>
                          )}
                        </td>
                        <td className="px-1 py-2 text-center">{f.pg}</td>
                        <td className="px-1 py-2 text-center">{f.sets_favor - f.sets_contra}</td>
                        <td className="px-1 py-2 text-center">{f.games_favor - f.games_contra}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ol className="space-y-2">
                {zona.partidos.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-(--kt-bg-soft) px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className={p.ganador_id === p.pareja1?.id ? "font-bold" : ""}>{p.pareja1?.nombre}</span>
                      <span className="text-(--kt-ink-soft)"> vs </span>
                      <span className={p.ganador_id === p.pareja2?.id ? "font-bold" : ""}>{p.pareja2?.nombre}</span>
                    </span>
                    {p.sets ? <span className="font-mono font-bold">{marcador(p.sets)}</span> : <span className="text-xs text-(--kt-ink-soft)">Sin jugar</span>}
                    {puedeCargar && (
                      <button type="button" onClick={() => setPartidoAbierto(p)} className={`${BOTON} border-slate-300 bg-white text-slate-700`} aria-label={`${p.sets ? "Corregir" : "Cargar"} resultado de ${p.pareja1?.nombre} contra ${p.pareja2?.nombre}`}>
                        {p.sets ? "Corregir" : "Cargar resultado"}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <ConfirmDialog open={confirmarSorteo} loading={sortear.isPending} variant="warning" confirmLabel="Volver a sortear"
        title="¿Volver a sortear las zonas?" message="Se arman de nuevo con todas las parejas confirmadas y se rehace el fixture. Las cabezas de serie siguen separadas."
        onClose={() => setConfirmarSorteo(false)} onConfirm={() => sortear.mutate()} />
      {partidoAbierto && (
        <ResultadoModal partido={partidoAbierto} guardar={guardar} borrar={borrar} onClose={() => { guardar.reset(); setPartidoAbierto(null); }} />
      )}
    </div>
  );
}
