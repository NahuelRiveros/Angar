import { useId, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";

const sinAcentos = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Selector con buscador para listas largas (miles de opciones), donde un <select>
 * no se puede recorrer. Muestra hasta `maxResultados` coincidencias; `onChange`
 * recibe el value elegido o "" al limpiar.
 * Opciones: { value, label, hint?, grupo? } (las de un mismo `grupo` van seguidas y
 * llevan un título). `onTextoChange` avisa lo que se escribe (para buscar en el
 * servidor), `opcionExtra(texto)` agrega una opción al final (ej. "+ Crear…") y
 * `etiquetaSeleccionada` muestra un valor que no está entre las opciones cargadas.
 */
export default function ComboboxField({
  label, options = [], value, onChange, placeholder = "Escribí para buscar…", vacioLabel = "",
  required = false, disabled = false, helperText, maxResultados = 50, className = "",
  onTextoChange, opcionExtra, etiquetaSeleccionada,
}) {
  const id = useId();
  const listaId = `${id}-lista`;
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [activo, setActivo] = useState(0);

  const seleccionada = options.find((o) => String(o.value) === String(value ?? ""));
  const indice = useMemo(() => options.map((o) => ({ ...o, buscar: sinAcentos(o.label) })), [options]);
  const coincidencias = useMemo(() => {
    const palabras = sinAcentos(texto).split(/\s+/).filter(Boolean);
    const todas = palabras.length ? indice.filter((o) => palabras.every((p) => o.buscar.includes(p))) : indice;
    const extra = abierto ? opcionExtra?.(texto.trim()) : null;
    return { total: todas.length, visibles: [...todas.slice(0, maxResultados), ...(extra ? [extra] : [])] };
  }, [indice, texto, maxResultados, opcionExtra, abierto]);
  const textoSeleccionado = seleccionada?.label ?? (value ? (etiquetaSeleccionada ?? String(value)) : "");
  const cambiarTexto = (nuevo) => { setTexto(nuevo); onTextoChange?.(nuevo); };

  function abrir() {
    if (disabled) return;
    cambiarTexto("");
    setActivo(0);
    setAbierto(true);
  }
  function elegir(opcion) {
    onChange(opcion ? opcion.value : "");
    setAbierto(false);
    cambiarTexto("");
  }
  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierto) return abrir();
      const ultimo = coincidencias.visibles.length - 1;
      setActivo((i) => (e.key === "ArrowDown" ? Math.min(ultimo, i + 1) : Math.max(0, i - 1)));
    } else if (e.key === "Enter" && abierto) {
      e.preventDefault();
      const opcion = coincidencias.visibles[activo];
      if (opcion) elegir(opcion);
    } else if (e.key === "Escape" && abierto) {
      e.preventDefault();
      e.stopPropagation(); // no cerrar el modal que lo contiene
      setAbierto(false);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}{required && <span className="text-red-500"> *</span>}</label>
      <div className="relative mt-1">
        <input
          id={id} type="text" role="combobox" autoComplete="off" disabled={disabled} required={required && !textoSeleccionado}
          aria-expanded={abierto} aria-controls={listaId} aria-autocomplete="list"
          aria-activedescendant={abierto && coincidencias.visibles[activo] ? `${id}-op-${activo}` : undefined}
          value={abierto ? texto : textoSeleccionado}
          placeholder={abierto ? placeholder : (vacioLabel || placeholder)}
          onFocus={abrir} onClick={() => !abierto && abrir()}
          onChange={(e) => { cambiarTexto(e.target.value); setActivo(0); setAbierto(true); }}
          onKeyDown={onKeyDown}
          onBlur={() => setAbierto(false)}
          className="min-h-11 w-full rounded-xl border border-gray-300 bg-white py-2 pr-16 pl-3 text-gray-900 outline-none transition placeholder:text-gray-500 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:bg-gray-100"
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {textoSeleccionado && !required && !disabled && (
            <button type="button" aria-label={`Quitar ${label}`} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(null)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={16} /></button>
          )}
          <ChevronDown aria-hidden="true" size={16} className="mr-2 text-slate-400" />
        </div>
      </div>
      {abierto && (
        <ul id={listaId} role="listbox" aria-label={label}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {coincidencias.visibles.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Sin coincidencias</li>}
          {coincidencias.visibles.map((o, i) => [
            o.grupo && o.grupo !== coincidencias.visibles[i - 1]?.grupo && (
              <li key={`grupo-${o.grupo}`} role="presentation" className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">{o.grupo}</li>
            ),
            <li key={o.value} id={`${id}-op-${i}`} role="option" aria-selected={String(o.value) === String(value ?? "")}
              onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(o)} onMouseEnter={() => setActivo(i)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${i === activo ? "bg-(--kt-turquoise-soft)" : ""} ${String(o.value) === String(value ?? "") ? "font-semibold" : ""}`}>
              <span className="min-w-0 break-words">{o.label}</span>
              {o.hint && <span className="shrink-0 text-xs text-slate-500">{o.hint}</span>}
            </li>,
          ])}
          {coincidencias.total > coincidencias.visibles.length && (
            <li className="px-3 py-2 text-xs text-slate-500">Mostrando {coincidencias.visibles.length} de {coincidencias.total}: seguí escribiendo para acotar.</li>
          )}
        </ul>
      )}
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
