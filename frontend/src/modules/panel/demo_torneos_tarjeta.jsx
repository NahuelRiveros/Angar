import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Sparkles, Trash2 } from "lucide-react";
import ConfirmDialog from "../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../controls/ui/error_banner.jsx";
import { useToast } from "../../controls/toast/toast_context.jsx";
import { EstadoTorneo } from "../torneos/torneo_ui.jsx";
import { getTorneosDemo, crearTorneosDemo, borrarTorneosDemo } from "./demo_api.js";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const mensajeDe = (error, porDefecto) => error?.response?.data?.mensaje || porDefecto;
const CLAVE = ["admin", "demo"];

/** Super admin: torneos de muestra para enseñar MiPadel (crearlos o borrarlos en cascada). */
export default function DemoTorneosTarjeta() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmar, setConfirmar] = useState(false);
  const demo = useQuery({ queryKey: CLAVE, queryFn: getTorneosDemo, staleTime: 5 * 60 * 1000 });
  const alTerminar = async (r) => {
    toast.success(r.mensaje);
    setConfirmar(false);
    // La lista pública de torneos cambia: que se vuelva a pedir.
    await Promise.all([queryClient.setQueryData(CLAVE, r.data), queryClient.invalidateQueries({ queryKey: ["publico", "torneos"] })]);
  };
  const crear = useMutation({ mutationFn: crearTorneosDemo, onSuccess: alTerminar, onError: (e) => toast.error(mensajeDe(e, "No pudimos crear los torneos demo.")) });
  const borrar = useMutation({ mutationFn: borrarTorneosDemo, onSuccess: alTerminar, onError: (e) => { setConfirmar(false); toast.error(mensajeDe(e, "No pudimos borrar los torneos demo.")); } });
  const torneos = demo.data ?? [];

  return (
    <section aria-labelledby="panel-demo" className="space-y-3">
      <div>
        <h2 id="panel-demo" className="text-lg font-bold text-(--kt-ink)">Torneos demo</h2>
        <p className="text-sm text-(--kt-ink-soft)">Torneos de muestra con datos ficticios para enseñar cómo se ven las zonas, la llave y los resultados. Pasales el link de la página pública.</p>
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {demo.isPending && <p className="text-sm text-(--kt-ink-soft)">Cargando…</p>}
        {demo.isError && (
          <div className="space-y-2">
            <ErrorBanner message={mensajeDe(demo.error, "No pudimos ver los torneos demo.")} />
            <button type="button" onClick={() => demo.refetch()} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Reintentar</button>
          </div>
        )}
        {demo.isSuccess && torneos.length === 0 && <p className="text-sm text-(--kt-ink-soft)">No hay torneos demo creados.</p>}
        {torneos.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {torneos.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-(--kt-ink)">{t.nombre} <EstadoTorneo estado={t.estado} /></span>
                <span className="flex flex-wrap gap-x-3">
                  <Link to={`/torneos/${t.id}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-(--kt-teal-700) hover:underline">Página pública <ExternalLink size={14} aria-hidden="true" /></Link>
                  <Link to={`/mis-torneos/${t.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-(--kt-teal-700) hover:underline">Como organizador</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
        {demo.isSuccess && (
          <div className="flex flex-wrap gap-2">
            {torneos.length === 0 ? (
              <button type="button" disabled={crear.isPending} onClick={() => crear.mutate()} className={`${BOTON} border-(--kt-petrol) bg-(--kt-petrol) text-white`}>
                <Sparkles size={16} aria-hidden="true" /> {crear.isPending ? "Creando… (puede tardar un minuto)" : "Crear torneos demo"}
              </button>
            ) : (
              <button type="button" disabled={borrar.isPending} onClick={() => setConfirmar(true)} className={`${BOTON} border-red-200 bg-white text-red-800`}>
                <Trash2 size={16} aria-hidden="true" /> Borrar torneos demo
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-(--kt-ink-soft)">Con la variable DEMO_AL_INICIAR=si en Render, cada deploy los vuelve a crear si no están. Si no los querés más, dejala vacía.</p>
      </div>
      <ConfirmDialog open={confirmar} loading={borrar.isPending} confirmLabel="Borrar"
        title="¿Borrar los torneos demo?" message="Se borran en cascada sus partidos, zonas, parejas, premios y categorías. Solo los torneos DEMO: los tuyos y los de tus clientes no se tocan."
        onClose={() => setConfirmar(false)} onConfirm={() => borrar.mutate()} />
    </section>
  );
}
