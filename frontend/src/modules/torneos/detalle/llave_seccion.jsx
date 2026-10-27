import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Medal, Trophy, Undo2 } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import SelectField from "../../../controls/ui/select_field.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { FORMATOS_PARTIDO, PERMITIDO } from "../../../../../torneo_config.js";
import { getLlave, cambiarLlave, guardarResultado, borrarResultado } from "../api/torneos_api.js";
import { mensajeDe } from "./use_cambio_torneo.js";
import ResultadoModal from "./resultado_modal.jsx";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const claveLlave = (torneoId, categoriaId) => ["torneos", Number(torneoId), "llave", Number(categoriaId)];
const marcador = (sets) => sets.map(([a, b]) => `${a}-${b}`).join(" ");

/** Cambio sobre la llave: el servidor devuelve la llave completa y va directo a la caché. */
function useCambioLlave(torneoId, categoriaId, accion, { onExito, errorEnPantalla = false } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: accion,
    onSuccess: async (r) => {
      queryClient.setQueryData(claveLlave(torneoId, categoriaId), r.data);
      toast.success(r.mensaje);
      // Armar o deshacer la llave abre o cierra las zonas.
      await queryClient.invalidateQueries({ queryKey: ["torneos", Number(torneoId), "zonas", Number(categoriaId)] });
      onExito?.(r);
    },
    onError: (e) => { if (!errorEnPantalla) toast.error(mensajeDe(e, "No se pudo completar la acción.")); },
  });
}

export default function LlaveSeccion({ torneo, editable }) {
  const [categoriaId, setCategoriaId] = useState(String(torneo.categorias[0]?.id ?? ""));
  if (!torneo.categorias.length) return <p className="text-sm text-(--kt-ink-soft)">Primero cargá las categorías del torneo.</p>;
  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <SelectField label="Categoría" name="llave-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} showPlaceholderOption={false}
          options={torneo.categorias.map((c) => ({ value: String(c.id), label: c.nombre }))} />
      </div>
      <LlaveDeCategoria key={categoriaId} torneo={torneo} categoriaId={Number(categoriaId)} editable={editable} />
    </div>
  );
}

function LlaveDeCategoria({ torneo, categoriaId, editable }) {
  const [confirmarDeshacer, setConfirmarDeshacer] = useState(false);
  const [partidoAbierto, setPartidoAbierto] = useState(null);
  const llave = useQuery({ queryKey: claveLlave(torneo.id, categoriaId), queryFn: () => getLlave(torneo.id, categoriaId) });
  const armar = useCambioLlave(torneo.id, categoriaId, () => cambiarLlave(torneo.id, categoriaId, "armar"));
  const deshacer = useCambioLlave(torneo.id, categoriaId, () => cambiarLlave(torneo.id, categoriaId, "deshacer"), { onExito: () => setConfirmarDeshacer(false) });
  const cerrarPartido = { onExito: () => setPartidoAbierto(null), errorEnPantalla: true };
  const guardar = useCambioLlave(torneo.id, categoriaId, ({ partidoId, sets }) => guardarResultado(torneo.id, partidoId, sets), cerrarPartido);
  const borrar = useCambioLlave(torneo.id, categoriaId, (partidoId) => borrarResultado(torneo.id, partidoId), cerrarPartido);

  if (llave.isPending) return <AdminSpinner />;
  if (llave.isError) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={mensajeDe(llave.error, "No pudimos cargar la llave.")} />
        <button type="button" onClick={() => llave.refetch()} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Reintentar</button>
      </div>
    );
  }

  const d = llave.data;
  const enJuego = PERMITIDO.armarLlave.includes(torneo.estado);
  const puedeArmar = editable && enJuego && d.zonas_completas && !d.con_resultados;
  const puedeCargar = editable && PERMITIDO.cargarResultados.includes(torneo.estado);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-(--kt-bg-soft) p-3">
        <p className="text-sm text-(--kt-ink)">Partidos de llave: {FORMATOS_PARTIDO[d.formato_llave]?.etiqueta}. Los primeros de zona pasan sin jugar si sobran lugares.</p>
        {editable && enJuego && (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!puedeArmar || armar.isPending} onClick={() => armar.mutate()} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>
              <GitBranch size={16} aria-hidden="true" /> {d.armada ? "Volver a armar" : "Armar llave"}
            </button>
            {d.armada && !d.con_resultados && (
              <button type="button" disabled={deshacer.isPending} onClick={() => setConfirmarDeshacer(true)} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>
                <Undo2 size={16} aria-hidden="true" /> Deshacer llave
              </button>
            )}
          </div>
        )}
      </div>

      {!enJuego && !d.armada && <p className="text-sm text-(--kt-ink-soft)">La llave se arma con el torneo en juego, cuando terminan las zonas.</p>}
      {enJuego && !d.armada && !d.zonas_completas && (
        <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {d.zonas_pendientes.length ? `Faltan resultados en la zona ${d.zonas_pendientes.join(", ")}.` : "Primero armá las zonas y cargá sus resultados."}
        </p>
      )}
      {d.armada && d.con_resultados && editable && <p className="text-sm text-(--kt-ink-soft)">La llave ya tiene resultados: las zonas quedan cerradas.</p>}

      {d.podio.campeon && (
        <section aria-labelledby="podio-titulo" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 id="podio-titulo" className="flex items-center gap-2 font-bold text-amber-950"><Trophy size={18} aria-hidden="true" /> Campeones: {d.podio.campeon.nombre}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-amber-950"><Medal size={16} aria-hidden="true" /> Subcampeones: {d.podio.subcampeon?.nombre}</p>
          {d.podio.semifinalistas.length > 0 && <p className="mt-1 text-sm text-amber-950">Semifinalistas: {d.podio.semifinalistas.map((p) => p.nombre).join(" · ")}</p>}
        </section>
      )}

      {d.armada && (
        // Escritorio: una columna por ronda. Celular: las rondas una debajo de la otra.
        <div className="grid gap-4 lg:auto-cols-fr lg:grid-flow-col">
          {d.rondas.map((ronda) => (
            <section key={ronda.ronda} aria-labelledby={`ronda-${ronda.ronda}`} className="flex flex-col gap-3">
              <h3 id={`ronda-${ronda.ronda}`} className="kt-display text-base font-bold text-(--kt-ink)">{ronda.nombre}</h3>
              <ol className="space-y-3 lg:flex lg:flex-1 lg:flex-col lg:justify-around lg:gap-3 lg:space-y-0">
                {ronda.partidos.map((p) => {
                  const definido = p.pareja1 && p.pareja2;
                  return (
                    <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
                      {[p.pareja1, p.pareja2].map((pareja, i) => (
                        <p key={i} className={`flex items-center justify-between gap-2 py-1 ${pareja && p.ganador_id === pareja.id ? "font-bold text-(--kt-ink)" : "text-(--kt-ink-soft)"}`}>
                          <span className="min-w-0 break-words">{pareja?.nombre ?? "A definir"}</span>
                          {p.sets && <span className="shrink-0 font-mono">{p.sets.map((s) => s[i]).join(" ")}</span>}
                        </p>
                      ))}
                      {puedeCargar && definido && (
                        <button type="button" onClick={() => setPartidoAbierto(p)} className={`${BOTON} mt-2 w-full border-slate-300 bg-white text-slate-700`}
                          aria-label={`${p.sets ? "Corregir" : "Cargar"} resultado de ${p.pareja1.nombre} contra ${p.pareja2.nombre}`}>
                          {p.sets ? `Corregir (${marcador(p.sets)})` : "Cargar resultado"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog open={confirmarDeshacer} loading={deshacer.isPending} variant="warning" confirmLabel="Deshacer llave"
        title="¿Deshacer la llave?" message="Se borran los cruces (todavía no tienen resultados) y se reabren las zonas para corregirlas. Después la volvés a armar."
        onClose={() => setConfirmarDeshacer(false)} onConfirm={() => deshacer.mutate()} />
      {partidoAbierto && <ResultadoModal partido={partidoAbierto} guardar={guardar} borrar={borrar} onClose={() => { guardar.reset(); setPartidoAbierto(null); }} />}
    </div>
  );
}
