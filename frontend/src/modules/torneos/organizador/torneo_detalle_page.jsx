import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Printer, Trash2 } from "lucide-react";
import AdminSpinner from "../../../controls/ui/admin_spinner.jsx";
import ConfirmDialog from "../../../controls/ui/confirm_dialog.jsx";
import ErrorBanner from "../../../controls/ui/error_banner.jsx";
import { useToast } from "../../../controls/toast/toast_context.jsx";
import { useMiSuscripcion } from "../../../hooks/use_mi_suscripcion.js";
import { ESTADOS_TORNEO } from "../../../../../torneo_config.js";
import { getTorneo, cambiarEstadoTorneo, eliminarTorneo, duplicarTorneo } from "../api/torneos_api.js";
import { EstadoTorneo } from "../comun/torneo_ui.jsx";
import AvisoSoloLectura from "../comun/aviso_solo_lectura.jsx";
import { claveTorneo, mensajeDe, useCambioTorneo } from "../detalle/use_cambio_torneo.js";
import DatosTorneoForm from "../detalle/datos_torneo_form.jsx";
import ReglamentoForm from "../detalle/reglamento_form.jsx";
import CategoriasSeccion from "../detalle/categorias_seccion.jsx";
import InscripcionesSeccion from "../detalle/inscripciones_seccion.jsx";
import ZonasSeccion from "../detalle/zonas_seccion.jsx";
import LlaveSeccion from "../detalle/llave_seccion.jsx";
import GuiaSeccion from "../detalle/guia_seccion.jsx";

const BOTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const SECCIONES = [["datos", "Datos"], ["categorias", "Categorías y premios"], ["reglamento", "Reglamento"], ["inscripciones", "Inscripciones"], ["zonas", "Zonas"], ["llave", "Llave"]];

// Qué significa cada paso, para confirmar sabiendo qué pasa.
const AVISOS = {
  inscripcion: "El torneo queda publicado y las parejas se van a poder anotar.",
  borrador: "Deja de estar publicado hasta que lo vuelvas a abrir.",
  en_juego: "Se cierra la inscripción. Desde acá ya no se agregan ni quitan categorías.",
  finalizado: "El torneo queda cerrado como historial y ya no se puede editar.",
  cancelado: "El torneo queda cancelado y ya no se puede editar ni reabrir.",
};

export default function TorneoDetallePage() {
  const { torneoId } = useParams();
  const [seccion, setSeccion] = useState("datos");
  const plan = useMiSuscripcion();
  const torneo = useQuery({ queryKey: claveTorneo(torneoId), queryFn: () => getTorneo(torneoId) });
  const soloLectura = plan.data?.es_organizador && !plan.data.vigente;

  if (torneo.isPending) return <div className="p-8"><AdminSpinner /></div>;
  if (torneo.isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-8">
        <ErrorBanner message={mensajeDe(torneo.error, "No pudimos cargar el torneo.")} />
        <div className="flex gap-2">
          {torneo.error?.response?.status !== 404 && <button type="button" onClick={() => torneo.refetch()} className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Reintentar</button>}
          <Link to="/mis-torneos" className={`${BOTON} border-slate-300 bg-white text-slate-700`}>Volver a mis torneos</Link>
        </div>
      </div>
    );
  }

  const t = torneo.data;
  const puede = (parte) => !soloLectura && Boolean(t.edicion?.[parte]);
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <Link to="/mis-torneos" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Mis torneos
      </Link>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="kt-display text-2xl font-bold text-(--kt-ink) sm:text-3xl">{t.nombre}</h1>
          <EstadoTorneo estado={t.estado} />
        </div>
        <p className="text-sm text-(--kt-ink-soft)">{ESTADOS_TORNEO[t.estado]?.descripcion}</p>
        <div className="flex flex-wrap items-center gap-x-4">
          {t.estado !== "borrador" && t.estado !== "cancelado" && (
            <Link to={`/torneos/${t.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline">
              <ExternalLink size={16} aria-hidden="true" /> Ver la página pública (para compartir con los jugadores)
            </Link>
          )}
          {t.categorias.length > 0 && (
            <Link to={`/mis-torneos/${t.id}/imprimir`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline">
              <Printer size={16} aria-hidden="true" /> Imprimir fixture y llave
            </Link>
          )}
          {!soloLectura && <BotonDuplicar torneo={t} />}
        </div>
        {/* Cambia la clave cuando cambia lo que se pide para avanzar: un error viejo ("falta una categoría") no queda a la vista. */}
        {!soloLectura && <AccionesEstado key={[t.estado, t.sede, t.fecha_inicio, t.categorias.length].join("|")} torneo={t} />}
      </div>
      {soloLectura && <AvisoSoloLectura mensaje={plan.data.mensaje} />}

      <div role="tablist" aria-label="Secciones del torneo" className="grid grid-cols-3 border-b border-slate-200 sm:grid-cols-6">
        {SECCIONES.map(([codigo, etiqueta]) => (
          <button key={codigo} type="button" role="tab" aria-selected={seccion === codigo} onClick={() => setSeccion(codigo)}
            className={`-mb-px min-h-11 border-b-2 px-2 text-sm font-semibold sm:px-4 ${seccion === codigo ? "border-(--kt-petrol) text-(--kt-ink)" : "border-transparent text-(--kt-ink-soft) hover:text-(--kt-ink)"}`}>
            {codigo === "categorias" ? <><span className="sm:hidden">Categorías</span><span className="hidden sm:inline">{etiqueta}</span> ({t.categorias.length})</> : etiqueta}
          </button>
        ))}
      </div>
      <section role="tabpanel" className="rounded-3xl border border-(--kt-border) bg-white p-4 shadow-sm sm:p-6">
        <GuiaSeccion seccion={seccion} estado={t.estado} soloLectura={soloLectura} />
        {seccion === "datos" && <DatosTorneoForm torneo={t} editable={puede("datos")} />}
        {seccion === "categorias" && <CategoriasSeccion torneo={t} editarCategorias={puede("categorias")} editarPremios={puede("premios")} />}
        {seccion === "reglamento" && <ReglamentoForm torneo={t} editable={puede("datos")} />}
        {seccion === "inscripciones" && <InscripcionesSeccion torneo={t} editable={puede("datos")} />}
        {seccion === "zonas" && <ZonasSeccion torneo={t} editable={puede("datos")} />}
        {seccion === "llave" && <LlaveSeccion torneo={t} editable={puede("datos")} />}
      </section>
    </div>
  );
}

/** Copia el torneo (datos, cobro, categorías y premios) a uno nuevo en borrador y lo abre. */
function BotonDuplicar({ torneo }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmar, setConfirmar] = useState(false);
  const duplicar = useMutation({
    mutationFn: () => duplicarTorneo(torneo.id),
    onSuccess: async (r) => {
      toast.success(r.mensaje);
      setConfirmar(false);
      queryClient.setQueryData(claveTorneo(r.data.id), r.data);
      await queryClient.invalidateQueries({ queryKey: ["torneos", "mios"] });
      navigate(`/mis-torneos/${r.data.id}`);
    },
    onError: (e) => { setConfirmar(false); toast.error(mensajeDe(e, "No pudimos duplicar el torneo.")); },
  });
  return (
    <>
      <button type="button" onClick={() => setConfirmar(true)} disabled={duplicar.isPending}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--kt-teal-700) hover:underline disabled:opacity-50">
        <Copy size={16} aria-hidden="true" /> Duplicar torneo
      </button>
      <ConfirmDialog open={confirmar} loading={duplicar.isPending} variant="warning" confirmLabel="Duplicar"
        title={`¿Duplicar "${torneo.nombre}"?`}
        message="Se crea un torneo nuevo en borrador con los mismos datos, reglamento, cobro, categorías y premios. Las fechas quedan vacías y no se copian parejas ni resultados."
        onClose={() => setConfirmar(false)} onConfirm={() => duplicar.mutate()} />
    </>
  );
}

function AccionesEstado({ torneo }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [paso, setPaso] = useState(null); // { a, accion } | { borrar: true }
  const cambiar = useCambioTorneo(torneo.id, (destino) => cambiarEstadoTorneo(torneo.id, destino), { onExito: () => setPaso(null) });
  const borrar = useCambioTorneo(torneo.id, () => eliminarTorneo(torneo.id), {
    onExito: () => { queryClient.removeQueries({ queryKey: claveTorneo(torneo.id) }); navigate("/mis-torneos"); },
  });
  const ocupado = cambiar.isPending || borrar.isPending;
  if (!torneo.transiciones.length) return null;

  const peligro = (a) => a === "cancelado" || a === "finalizado";
  return (
    <div className="flex flex-wrap gap-2">
      {torneo.transiciones.map((t) => (
        <button key={t.a} type="button" disabled={ocupado} onClick={() => { cambiar.reset(); setPaso(t); }}
          className={`${BOTON} ${t.a === "cancelado" ? "border-red-200 bg-red-50 text-red-800" : t.a === "borrador" ? "border-slate-300 bg-white text-slate-700" : "border-(--kt-petrol) bg-(--kt-petrol) text-white"}`}>
          {t.accion}
        </button>
      ))}
      {torneo.estado === "borrador" && (
        <button type="button" disabled={ocupado} onClick={() => setPaso({ borrar: true })} className={`${BOTON} border-red-200 bg-white text-red-800`}>
          <Trash2 size={15} aria-hidden="true" /> Borrar
        </button>
      )}
      {cambiar.isError && <ErrorBanner className="w-full" message={mensajeDe(cambiar.error, "No pudimos cambiar el estado.")} />}

      <ConfirmDialog open={Boolean(paso?.a)} loading={cambiar.isPending} variant={peligro(paso?.a) ? "danger" : "warning"}
        title={`¿${paso?.accion}?`} message={AVISOS[paso?.a]} confirmLabel={paso?.accion}
        onClose={() => setPaso(null)} onConfirm={() => cambiar.mutate(paso.a, { onError: () => setPaso(null) })} />
      <ConfirmDialog open={Boolean(paso?.borrar)} loading={borrar.isPending} title={`¿Borrar "${torneo.nombre}"?`}
        message="Se borran el torneo, sus categorías y premios. No se puede deshacer." confirmLabel="Borrar torneo"
        onClose={() => setPaso(null)} onConfirm={() => borrar.mutate(undefined, { onError: (e) => toast.error(mensajeDe(e, "No pudimos borrar el torneo.")) })} />
    </div>
  );
}
