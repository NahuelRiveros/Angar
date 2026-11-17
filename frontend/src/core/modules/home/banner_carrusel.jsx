import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { imagenCloudinary } from "../../utils/imagen_cloudinary.js";

const PASAR_MS = 5000;
const ANCHOS = [800, 1600, 2400];

/**
 * Carrusel de promociones del home (SIS-31). Usa el scroll nativo con "snap": deslizar con el dedo,
 * la rueda o el teclado funciona sin código propio. Pasa solo cada 5 s, salvo que el mouse o el
 * foco estén encima o la persona haya pedido menos movimiento. Con un banner no hay controles.
 */
export default function BannerCarrusel({ banners }) {
  const pistaRef = useRef(null);
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const varios = banners.length > 1;
  // Todas las diapositivas miden lo mismo, si no el carrusel salta de alto al pasar. La imagen
  // vertical del celular se usa solo si todos la tienen; si no, se recorta la de computadora.
  const conCelular = banners.every((banner) => banner.imagen_celular_url);

  const irA = useCallback((indice) => {
    const pista = pistaRef.current;
    if (!pista) return;
    const destino = (indice + banners.length) % banners.length;
    pista.scrollTo({ left: destino * pista.clientWidth, behavior: "smooth" });
  }, [banners.length]);

  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;
    const alMover = () => setActivo(Math.round(pista.scrollLeft / Math.max(pista.clientWidth, 1)));
    pista.addEventListener("scroll", alMover, { passive: true });
    return () => pista.removeEventListener("scroll", alMover);
  }, []);

  useEffect(() => {
    const menosMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!varios || pausado || menosMovimiento) return;
    const id = setTimeout(() => irA(activo + 1), PASAR_MS);
    return () => clearTimeout(id);
  }, [activo, pausado, varios, irA]);

  if (!banners.length) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Promociones"
      className="relative"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div
        ref={pistaRef}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${banners.length}`}
            className="w-full shrink-0 snap-start"
          >
            <EnlaceBanner enlace={banner.enlace} titulo={banner.titulo}>
              <ImagenBanner banner={banner} primera={i === 0} conCelular={conCelular} />
            </EnlaceBanner>
          </div>
        ))}
      </div>

      {varios && (
        <>
          <BotonFlecha lado="izquierda" onClick={() => irA(activo - 1)} />
          <BotonFlecha lado="derecha" onClick={() => irA(activo + 1)} />
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => irA(i)}
                aria-label={`Ver promoción ${i + 1}`}
                aria-current={i === activo}
                className="flex h-6 items-center px-0.5"
              >
                <span className={`block h-2 rounded-full shadow transition-all ${i === activo ? "w-6 bg-white" : "w-2 bg-white/60"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ImagenBanner({ banner, primera, conCelular }) {
  const srcSet = (url) => ANCHOS.map((ancho) => `${imagenCloudinary(url, ancho)} ${ancho}w`).join(", ");
  return (
    <picture>
      {conCelular && <source media="(max-width: 639px)" srcSet={srcSet(banner.imagen_celular_url)} sizes="100vw" />}
      <img
        src={imagenCloudinary(banner.imagen_url, 1600)}
        srcSet={srcSet(banner.imagen_url)}
        sizes="100vw"
        alt={banner.titulo}
        // La primera es lo primero que se ve: se carga ya. El resto, cuando haga falta.
        loading={primera ? "eager" : "lazy"}
        fetchPriority={primera ? "high" : "auto"}
        decoding="async"
        className={`w-full bg-(--kt-bg-soft) object-cover ${conCelular ? "aspect-4/5 sm:aspect-3/1" : "aspect-video sm:aspect-3/1"}`}
      />
    </picture>
  );
}

function EnlaceBanner({ enlace, titulo, children }) {
  if (!enlace) return children;
  if (enlace.startsWith("/")) return <Link to={enlace} aria-label={titulo} className="block">{children}</Link>;
  return <a href={enlace} target="_blank" rel="noopener noreferrer" aria-label={titulo} className="block">{children}</a>;
}

function BotonFlecha({ lado, onClick }) {
  const Icono = lado === "izquierda" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "izquierda" ? "Promoción anterior" : "Promoción siguiente"}
      className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-(--kt-petrol) shadow-md transition hover:bg-white sm:flex ${lado === "izquierda" ? "left-4" : "right-4"}`}
    >
      <Icono size={22} aria-hidden="true" />
    </button>
  );
}
