/**
 * Filtros de un listado como pestañas, con su cantidad ("Recibido 3"). En el celular se desplazan de costado
 * sin ensanchar la página. `opciones`: [{ valor, texto, cantidad? }]; el valor "" es "Todos".
 */
export default function Pestanas({ opciones, valor = "", onCambiar, etiqueta }) {
  return (
    <nav aria-label={etiqueta} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-2">
        {opciones.map((opcion) => {
          const activa = valor === opcion.valor;
          return (
            <button key={opcion.valor} type="button" aria-pressed={activa} onClick={() => onCambiar(opcion.valor)}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${activa ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
              {opcion.texto}
              {opcion.cantidad !== undefined && <span className={`rounded-full px-1.5 text-xs tabular-nums ${activa ? "bg-white/20" : "bg-slate-100"}`}>{opcion.cantidad}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
