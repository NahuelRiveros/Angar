import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, FileWarning, UserPlus } from "lucide-react";
import { useAuth } from "../../auth/auth_context.jsx";
import { avisosDeInscripciones } from "./avisos_inscripciones.js";
import { useMisInscripciones } from "./use_mis_inscripciones.js";
import { claveAvisos, marcarAvisosLeidos, useMisAvisos } from "./avisos_api.js";

const ICONOS = { invitacion: UserPlus, comprobante: FileWarning, comprobante_rechazado: FileWarning };
// El comprobante lleva directo al pago de esa inscripción (queda destacado y a la vista).
const destino = (aviso) => (aviso.tipo === "invitacion" ? "/mis-inscripciones" : `/mis-inscripciones?pagar=${aviso.id}`);
const cuando = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

/**
 * Campanita de la barra: lo que el jugador tiene que hacer (calculado de sus inscripciones) y las
 * novedades que le llegaron (confirmaciones, rechazos, horarios). Al abrirla, las novedades se
 * marcan leídas; el punto sigue en esa apertura para que se note qué era nuevo.
 */
export default function CampanaAvisos() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const [abierta, setAbierta] = useState(false);
  const [nuevasAlAbrir, setNuevasAlAbrir] = useState(() => new Set());
  const contenedor = useRef(null);
  const idLista = useId();
  const inscripciones = useMisInscripciones();
  const novedadesQuery = useMisAvisos();
  const pendientes = avisosDeInscripciones(inscripciones.data);
  const novedades = novedadesQuery.data?.avisos ?? [];
  const noLeidas = novedadesQuery.data?.no_leidos ?? 0;
  const marcar = useMutation({
    mutationFn: marcarAvisosLeidos,
    onSuccess: () => queryClient.setQueryData(claveAvisos(usuario?.usuario_id), (d) => d && ({
      ...d, no_leidos: 0, avisos: d.avisos.map((a) => ({ ...a, leido_en: a.leido_en ?? new Date().toISOString() })),
    })),
  });

  // Se cierra con Escape o tocando afuera, como cualquier menú.
  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e) => { if (!contenedor.current?.contains(e.target)) setAbierta(false); };
    const tecla = (e) => { if (e.key === "Escape") setAbierta(false); };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("keydown", tecla); };
  }, [abierta]);

  if (!usuario) return null;
  const cantidad = pendientes.length + noLeidas;
  const alternar = () => {
    if (!abierta && noLeidas > 0) {
      setNuevasAlAbrir(new Set(novedades.filter((a) => !a.leido_en).map((a) => a.id)));
      marcar.mutate();
    }
    setAbierta((a) => !a);
  };
  const cargando = inscripciones.isPending || novedadesQuery.isPending;
  const conError = inscripciones.isError || novedadesQuery.isError;

  return (
    <div ref={contenedor} className="relative">
      <button type="button" onClick={alternar} aria-expanded={abierta} aria-controls={idLista}
        aria-label={cantidad ? `Avisos: ${cantidad} pendiente${cantidad === 1 ? "" : "s"}` : "Avisos: nada pendiente"}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-(--kt-night) hover:bg-(--kt-bg-soft)">
        <Bell size={20} aria-hidden="true" />
        {cantidad > 0 && (
          <span aria-hidden="true" className="absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white">
            {cantidad > 9 ? "9+" : cantidad}
          </span>
        )}
      </button>
      {abierta && (
        // En celular la campanita no está en el borde: la lista va fija, a lo ancho de la pantalla.
        <div id={idLista} className="fixed inset-x-4 top-16 z-50 max-h-[75vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80">
          <p className="px-2 pt-1 pb-2 text-sm font-bold text-(--kt-ink)">Avisos</p>
          {conError ? (
            <div className="space-y-2 px-2 pb-2">
              <p className="text-sm text-red-700">No pudimos cargar tus avisos.</p>
              <button type="button" onClick={() => { inscripciones.refetch(); novedadesQuery.refetch(); }} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold">Reintentar</button>
            </div>
          ) : cargando ? (
            <p className="px-2 pb-2 text-sm text-(--kt-ink-soft)">Cargando…</p>
          ) : pendientes.length === 0 && novedades.length === 0 ? (
            <p className="px-2 pb-2 text-sm text-(--kt-ink-soft)">No tenés nada pendiente.</p>
          ) : (
            <>
              {pendientes.length > 0 && (
                <ul aria-label="Para hacer" className="space-y-1">
                  {pendientes.map((aviso) => {
                    const Icono = ICONOS[aviso.tipo];
                    return (
                      <li key={`${aviso.tipo}-${aviso.id}`}>
                        <Link to={destino(aviso)} onClick={() => setAbierta(false)} className="flex min-h-11 gap-2.5 rounded-xl p-2 hover:bg-(--kt-bg-soft)">
                          <Icono size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${aviso.tipo === "invitacion" ? "text-sky-700" : "text-amber-600"}`} />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-(--kt-ink)">{aviso.titulo}</span>
                            <span className="block text-xs text-(--kt-ink-soft)">{aviso.detalle}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {novedades.length > 0 && (
                <>
                  <p className="mt-2 border-t border-slate-100 px-2 pt-2 text-xs font-bold tracking-wide text-(--kt-ink-soft) uppercase">Novedades</p>
                  <ul aria-label="Novedades" className="space-y-1">
                    {novedades.map((n) => {
                      const nueva = nuevasAlAbrir.has(n.id) || !n.leido_en;
                      return (
                        <li key={n.id}>
                          <Link to={n.ruta || "/mis-inscripciones"} onClick={() => setAbierta(false)} className={`flex min-h-11 gap-2.5 rounded-xl p-2 hover:bg-(--kt-bg-soft) ${nueva ? "bg-sky-50/70" : ""}`}>
                            <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${nueva ? "bg-sky-600" : "bg-transparent"}`} />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-(--kt-ink)">{nueva && <span className="sr-only">Nueva: </span>}{n.titulo}</span>
                              {n.detalle && <span className="block text-xs text-(--kt-ink-soft)">{n.detalle}</span>}
                              <span className="block text-[11px] text-(--kt-ink-soft)">{cuando.format(new Date(n.creado_en))}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}
          <Link to="/mis-inscripciones" onClick={() => setAbierta(false)} className="mt-1 flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-(--kt-teal-700) hover:bg-(--kt-bg-soft)">Ver mis inscripciones</Link>
        </div>
      )}
    </div>
  );
}
