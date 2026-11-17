import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Carrusel horizontal con scroll-snap nativo (sin librería) — cada slide
 * ocupa la mayoría del ancho y deja asomar el siguiente, para que se note
 * que hay más contenido. Flechas + puntos sincronizados con el scroll real,
 * así funciona igual con mouse, touch o teclado sin lógica de swipe propia.
 */
// `anchoItem`: ancho de cada elemento (por defecto, imágenes grandes de la galería).
export default function HomeCarousel({ items, renderItem, anchoItem = "w-[85%] sm:w-[55%] lg:w-[38%]" }) {
  const trackRef = useRef(null);
  const [activo, setActivo] = useState(0);

  const actualizarActivo = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.firstElementChild?.offsetWidth ?? 1;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0");
    const idx = Math.round(track.scrollLeft / (slideWidth + gap));
    setActivo(Math.max(0, Math.min(items.length - 1, idx)));
  }, [items.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", actualizarActivo, { passive: true });
    return () => track.removeEventListener("scroll", actualizarActivo);
  }, [actualizarActivo]);

  function irA(idx) {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[idx];
    if (slide) track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }

  function mover(delta) {
    irA(Math.max(0, Math.min(items.length - 1, activo + delta)));
  }

  if (!items.length) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div key={i} className={`shrink-0 snap-start ${anchoItem}`}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => mover(-1)}
            disabled={activo === 0}
            aria-label="Anterior"
            className="absolute left-0 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--kt-border)] bg-white p-2.5 text-[var(--kt-petrol)] shadow-md transition hover:bg-(--kt-teal-700) hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            disabled={activo === items.length - 1}
            aria-label="Siguiente"
            className="absolute right-0 top-1/2 hidden translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--kt-border)] bg-white p-2.5 text-[var(--kt-petrol)] shadow-md transition hover:bg-(--kt-teal-700) hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRight size={18} />
          </button>

          <div className="mt-5 flex items-center justify-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => irA(i)}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === activo ? "w-6 bg-(--kt-teal-700)" : "w-1.5 bg-[var(--kt-border)] hover:bg-[var(--kt-turquoise)]"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
