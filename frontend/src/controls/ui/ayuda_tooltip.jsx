import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";

/**
 * Ícono de ayuda con explicación corta. Se abre con hover, foco o toque (en
 * celular no hay hover) y se cierra con Escape o al salir; el texto queda
 * asociado al botón con aria-describedby para lectores de pantalla. En celular se
 * muestra fijo abajo para no salirse de la pantalla; desde sm, junto al ícono.
 */
export default function AyudaTooltip({ texto, etiqueta = "Ayuda", lado = "abajo", alinear = "izquierda", className = "" }) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const posicion = `${lado === "arriba" ? "sm:bottom-full sm:mb-1" : "sm:top-full sm:mt-1"} ${alinear === "derecha" ? "sm:right-0" : "sm:left-0"}`;
  return (
    <span className={`relative inline-flex ${className}`} onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)}>
      <button type="button" aria-label={etiqueta} aria-describedby={abierto ? id : undefined} aria-expanded={abierto}
        onClick={() => setAbierto(true)} onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)}
        onKeyDown={(e) => { if (e.key === "Escape" && abierto) { e.preventDefault(); e.stopPropagation(); setAbierto(false); } }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 outline-none hover:text-(--kt-teal-700) focus-visible:ring-2 focus-visible:ring-(--kt-turquoise)">
        <HelpCircle aria-hidden="true" size={18} />
      </button>
      {abierto && (
        <span id={id} role="tooltip"
          className={`fixed inset-x-4 bottom-4 z-30 rounded-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:w-72 bg-slate-900 px-3 py-2 text-left text-xs leading-relaxed font-normal text-white shadow-lg ${posicion}`}>
          {texto}
        </span>
      )}
    </span>
  );
}
