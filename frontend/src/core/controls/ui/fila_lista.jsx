import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * Una fila de un listado del panel (va dentro de un <ul>): foto o ícono, título, datos, etiquetas y, a la
 * derecha, un valor (ej. el total) o acciones.
 * - `to`: toda la fila lleva a esa dirección (no lleva `acciones`).
 * - `imagen` (dirección) o `icono` (componente de lucide): el recuadro de la izquierda; sin ninguno, no hay.
 * - `subtitulo`, `etiquetas` y `extra`: nodos (texto, <Etiqueta>…).
 */
export default function FilaLista({ to, imagen, icono: Icono, titulo, subtitulo, etiquetas, extra, acciones }) {
  const contenido = (
    <>
      {(imagen || Icono) && (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          {imagen ? <img src={imagen} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Icono size={24} aria-hidden="true" className="text-slate-400" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{titulo}</span>
        {subtitulo && <span className="mt-0.5 block text-sm text-slate-600">{subtitulo}</span>}
        {etiquetas && <span className="mt-1 flex flex-wrap gap-1">{etiquetas}</span>}
      </span>
      {extra && <span className="shrink-0 font-bold tabular-nums text-slate-900">{extra}</span>}
    </>
  );
  if (to) {
    return (
      <li>
        <Link to={to} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 sm:px-4">
          {contenido}
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-slate-400" />
        </Link>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:px-4">
      {contenido}
      {acciones && <span className="flex shrink-0 flex-col gap-2 sm:flex-row">{acciones}</span>}
    </li>
  );
}

/** La lista donde van las filas. */
export function Lista({ children }) {
  return <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">{children}</ul>;
}
