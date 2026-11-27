/**
 * Botones para elegir una opción (talle, color, opción de un producto) o varias (`multiple`).
 * `opciones`: [{ valor, texto, tachada? }]: tachada = se puede elegir pero se marca (ej. sin stock).
 * `valor`: el elegido (o la lista, si es múltiple). Con React Hook Form, dentro de un <Controller>.
 */
export default function SelectorOpciones({ opciones, valor, onCambiar, multiple = false, etiqueta, aclaracionTachada = "sin stock" }) {
  const elegida = (v) => (multiple ? (valor ?? []).includes(v) : valor === v);
  const cambiar = (v) => {
    if (!multiple) return onCambiar(v);
    const actual = valor ?? [];
    return onCambiar(actual.includes(v) ? actual.filter((x) => x !== v) : [...actual, v]);
  };
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={elegida(o.valor)} onClick={() => cambiar(o.valor)}
          className={`min-h-11 rounded-xl border px-4 font-semibold focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:outline-none ${elegida(o.valor) ? "border-(--kt-teal-700) bg-(--kt-teal-700) text-white" : "border-(--kt-border) bg-white hover:border-(--kt-teal-700)"} ${o.tachada ? "line-through opacity-70" : ""}`}>
          {o.texto}{o.tachada && <span className="sr-only"> ({aclaracionTachada})</span>}
        </button>
      ))}
    </div>
  );
}
