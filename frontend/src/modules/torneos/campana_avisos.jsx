import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, FileWarning, UserPlus } from "lucide-react";
import { useAuth } from "../../auth/auth_context.jsx";
import { avisosDeInscripciones } from "./avisos_inscripciones.js";
import { useMisInscripciones } from "./use_mis_inscripciones.js";

const ICONOS = { invitacion: UserPlus, comprobante: FileWarning, comprobante_rechazado: FileWarning };
// El comprobante lleva directo al pago de esa inscripción (queda destacado y a la vista).
const destino = (aviso) => (aviso.tipo === "invitacion" ? "/mis-inscripciones" : `/mis-inscripciones?pagar=${aviso.id}`);

/** Campanita de la barra: invitaciones sin responder y comprobantes que faltan mandar. */
export default function CampanaAvisos() {
  const { usuario } = useAuth();
  const [abierta, setAbierta] = useState(false);
  const contenedor = useRef(null);
  const idLista = useId();
  const inscripciones = useMisInscripciones();
  const avisos = avisosDeInscripciones(inscripciones.data);

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
  const cantidad = avisos.length;

  return (
    <div ref={contenedor} className="relative">
      <button type="button" onClick={() => setAbierta((a) => !a)} aria-expanded={abierta} aria-controls={idLista}
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
        <div id={idLista} className="fixed inset-x-4 top-16 z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80">
          <p className="px-2 pt-1 pb-2 text-sm font-bold text-(--kt-ink)">Avisos</p>
          {inscripciones.isError ? (
            <div className="space-y-2 px-2 pb-2">
              <p className="text-sm text-red-700">No pudimos cargar tus avisos.</p>
              <button type="button" onClick={() => inscripciones.refetch()} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold">Reintentar</button>
            </div>
          ) : inscripciones.isPending ? (
            <p className="px-2 pb-2 text-sm text-(--kt-ink-soft)">Cargando…</p>
          ) : cantidad === 0 ? (
            <p className="px-2 pb-2 text-sm text-(--kt-ink-soft)">No tenés nada pendiente.</p>
          ) : (
            <ul className="space-y-1">
              {avisos.map((aviso) => {
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
          <Link to="/mis-inscripciones" onClick={() => setAbierta(false)} className="mt-1 flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-(--kt-teal-700) hover:bg-(--kt-bg-soft)">Ver mis inscripciones</Link>
        </div>
      )}
    </div>
  );
}
