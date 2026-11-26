import { arbolCategorias } from "../arbol.js";

const CHIP = "min-h-11 shrink-0 rounded-full border px-5 text-sm font-semibold transition focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:outline-none";
const ELEGIDO = "border-(--kt-teal-700) bg-(--kt-teal-700) text-white";
const NORMAL = "border-(--kt-border) bg-white hover:border-(--kt-teal-700)";

/** MCA-05: las del primer nivel y, al elegir una, sus subcategorías. Sin categorías no muestra nada. */
export default function FiltroCategorias({ categorias, elegida = "", onElegir }) {
  const arbol = arbolCategorias(categorias);
  if (!arbol.length) return null;
  const abierta = arbol.find((c) => c.slug === elegida || c.hijas.some((h) => h.slug === elegida));
  const chip = (slug, nombre, marcado) => (
    <button key={slug} type="button" aria-pressed={marcado} onClick={() => onElegir(slug)} className={`${CHIP} ${marcado ? ELEGIDO : NORMAL}`}>{nombre}</button>
  );
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Categorías" className="-mx-1 flex gap-2 overflow-x-auto p-1">
        {chip("", "Todo", !elegida)}{arbol.map((c) => chip(c.slug, c.nombre, abierta?.id === c.id))}
      </div>
      {abierta?.hijas.length > 0 && (
        <div role="group" aria-label={`Dentro de ${abierta.nombre}`} className="-mx-1 flex gap-2 overflow-x-auto p-1">
          {chip(abierta.slug, "Todas", elegida === abierta.slug)}{abierta.hijas.map((h) => chip(h.slug, h.nombre, elegida === h.slug))}
        </div>
      )}
    </div>
  );
}
