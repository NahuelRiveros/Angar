import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useHomeContent } from "../../hooks/use_home_content.js";
import { useHomeConfig } from "../../hooks/use_home_config.js";
import { iconoHome } from "../../controls/config/home_iconos.js";
import { brandConfig } from "../../config/brand_config.js";
import { logoConfig } from "../../config/logo_config.js";
import { storefrontConfig } from "../../config/storefront_config.js";
import { HOME_TEXTOS_DEFAULT, HOME_COMO_PEDIR, HOME_PILARES, HOME_CONTACTOS } from "../../config/home_config.js";
import HomeCarousel from "./home_carousel.jsx";
import HomeTienda from "./home_tienda.jsx";

const esPlaceholder = (v) => /^\[.*\]$/.test(String(v ?? "").trim());

function contenidoASlide(c) {
  return { url: c.cloudinary_url, tipoMedia: c.tipo_media, title: c.titulo, subtitle: c.descripcion };
}

export default function HomePage() {
  const { areas, contenidosDeArea } = useHomeContent();
  const { texto, pilares, contactos, layoutDeArea } = useHomeConfig();
  const pilaresAMostrar = pilares.length > 0 ? pilares : HOME_PILARES;
  const contactosAMostrar = (contactos.length > 0 ? contactos : HOME_CONTACTOS).filter((c) => !esPlaceholder(c.valor));
  const areasConContenido = areas
    .map((a) => ({ ...a, slides: contenidosDeArea(a.descripcion).map(contenidoASlide) }))
    .filter((a) => a.slides.length > 0);

  return (
    <div className="kt-body min-h-screen bg-white text-(--kt-ink)">
      <HomeTienda texto={texto} textos={HOME_TEXTOS_DEFAULT} />

      {/* ── CÓMO PEDIR — 3 pasos, secuencia real (por eso la numeración) ── */}
      {HOME_COMO_PEDIR.length > 0 && (
        <section id="como-pedir" className="py-12 px-6">
          <div className="mx-auto max-w-5xl">
            <SectionKicker>{texto("como_pedir_kicker", HOME_TEXTOS_DEFAULT.como_pedir_kicker)}</SectionKicker>
            <h2 className="kt-display mt-3 text-2xl font-bold leading-tight sm:text-3xl">
              {texto("como_pedir_titulo", HOME_TEXTOS_DEFAULT.como_pedir_titulo)}
            </h2>

            <div className="mt-7 grid gap-8 md:grid-cols-3">
              {HOME_COMO_PEDIR.map(({ numero, titulo, texto: cuerpo }, i) => (
                <div key={numero} className="relative">
                  {/* Línea conectora entre pasos — solo desktop, no tiene
                      sentido en una columna sola de mobile. */}
                  {i < HOME_COMO_PEDIR.length - 1 && (
                    <div className="kt-line-grow absolute left-7 top-7 hidden h-px w-full bg-[var(--kt-border)] md:block" />
                  )}
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-(--kt-teal-700) to-[var(--kt-petrol)] text-white shadow-md shadow-[var(--kt-turquoise)]/25">
                    <span className="kt-display text-xl font-bold">{numero}</span>
                  </div>
                  <h3 className="kt-display mt-5 text-xl font-bold">{titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--kt-ink-soft)]">{cuerpo}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-linear-to-b from-[var(--kt-bg-soft)] to-white">
        <div className="kt-dotgrid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_55%_65%_at_85%_40%,black,transparent)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-6 py-12 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">

          <div className="mx-auto w-full max-w-48 lg:mx-0">
            <img src={logoConfig.home} alt={brandConfig.nombre} className="w-full" />
          </div>

          <div>
            <div>
              <SectionKicker>{texto("quienes_kicker", HOME_TEXTOS_DEFAULT.quienes_kicker)}</SectionKicker>
              <h2 className="kt-display mt-3 text-2xl font-bold leading-tight sm:text-3xl">
                {texto("quienes_titulo", HOME_TEXTOS_DEFAULT.quienes_titulo)}{" "}
                <span className="text-(--kt-teal-700)">
                  {texto("quienes_titulo_resaltado", HOME_TEXTOS_DEFAULT.quienes_titulo_resaltado)}
                </span>
              </h2>
            </div>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--kt-ink-soft)] sm:text-lg">
              Somos <strong className="font-bold text-[var(--kt-ink)]">{brandConfig.nombre}</strong>:{" "}
              {texto("quienes_texto", HOME_TEXTOS_DEFAULT.quienes_texto)}
            </p>

          </div>
        </div>
      </section>


      {/* ── PILARES (editables desde /admin/home-config) ──── */}
      <section id="pilares" className="bg-[var(--kt-bg-soft)] py-12 px-6">
        <div className="mx-auto max-w-5xl">
          <SectionKicker>{texto("pilares_kicker", HOME_TEXTOS_DEFAULT.pilares_kicker)}</SectionKicker>
          <h2 className="kt-display mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            {texto("pilares_titulo", HOME_TEXTOS_DEFAULT.pilares_titulo)}
            <span className="block text-(--kt-teal-700)">{texto("pilares_titulo_resaltado", HOME_TEXTOS_DEFAULT.pilares_titulo_resaltado)}</span>
          </h2>

          <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pilaresAMostrar.map(({ id, icono, titulo, texto: cuerpo }) => {
              const Icon = iconoHome(icono);
              return (
                <div
                  key={id}
                  className="kt-card group rounded-3xl border border-[var(--kt-border)] bg-white p-8 shadow-sm"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-(--kt-teal-700) to-[var(--kt-petrol)] text-white shadow-md shadow-[var(--kt-turquoise)]/25 transition-transform duration-300 group-hover:scale-105">
                    <Icon size={26} />
                  </div>
                  <h3 className="kt-display mt-6 text-2xl font-bold">{titulo}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[var(--kt-ink-soft)]">{cuerpo}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── GALERÍA CONFIGURABLE (grid o carrusel, por área) ── */}
      {areasConContenido.length > 0 && <section id="galeria" className="bg-[var(--kt-bg-soft)] py-12 px-6">
        <div className="mx-auto max-w-6xl">
          <SectionKicker>{texto("galeria_kicker", HOME_TEXTOS_DEFAULT.galeria_kicker)}</SectionKicker>
          <h2 className="kt-display mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            {texto("galeria_titulo", HOME_TEXTOS_DEFAULT.galeria_titulo)}
          </h2>

          {areasConContenido.map((area) => (
            <div key={area.id} className="mt-7 first:mt-10">
              <h3 className="kt-display text-xl font-bold text-[var(--kt-petrol)]">{area.descripcion}</h3>

              {layoutDeArea(area.descripcion) === "carrusel" ? (
                <div className="mt-5">
                  <HomeCarousel items={area.slides} renderItem={(slide, i) => <GalleryCard key={i} slide={slide} />} />
                </div>
              ) : (
                <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {area.slides.map((slide, i) => (
                    <GalleryCard key={i} slide={slide} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>}

      {/* ── CONTACTO (editable desde /admin/home-config) ──── */}
      <section id="contacto" className="py-12 px-6">
        <div className="mx-auto max-w-5xl">
          <SectionKicker>{texto("contacto_kicker", HOME_TEXTOS_DEFAULT.contacto_kicker)}</SectionKicker>
          <h2 className="kt-display mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            {texto("contacto_titulo", HOME_TEXTOS_DEFAULT.contacto_titulo)}
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {contactosAMostrar.map(({ id, icono, label, valor, href }) => {
              const Icon = iconoHome(icono);
              return (
                <a
                  key={id}
                  href={href || "#"}
                  className="kt-card group flex items-center gap-4 rounded-3xl border border-[var(--kt-border)] bg-white p-6 shadow-sm transition-colors hover:border-[var(--kt-turquoise)]"
                >
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[var(--kt-turquoise-soft)] text-[var(--kt-petrol)] transition-colors group-hover:bg-(--kt-teal-700) group-hover:text-white">
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--kt-ink)]">{label}</div>
                    <div className="mt-0.5 text-sm text-[var(--kt-ink-soft)]">{valor}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA (editable desde /admin/home-config) ── */}
      <section className="relative overflow-hidden border-t border-[var(--kt-border)] bg-linear-to-br from-[var(--kt-petrol)] to-(--kt-teal-700) py-12 px-6 text-center text-white">
        <div className="relative mx-auto max-w-2xl">
          <h2 className="kt-display text-3xl font-bold leading-tight sm:text-4xl">
            {texto("footer_cta_titulo", HOME_TEXTOS_DEFAULT.footer_cta_titulo)}
            <span className="block">{texto("footer_cta_titulo_resaltado", HOME_TEXTOS_DEFAULT.footer_cta_titulo_resaltado)}</span>
          </h2>
          <p className="mt-6 text-base text-white/85">
            {texto("footer_cta_texto", brandConfig.tagline)}
          </p>
          {storefrontConfig.enabled && <Link to={storefrontConfig.catalogPath} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-(--kt-petrol)">Ver catálogo <ArrowRight size={18} aria-hidden="true" /></Link>}
        </div>
      </section>

    </div>
  );
}

function SectionKicker({ children }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-(--kt-teal-700)">
      {children}
    </span>
  );
}

function GalleryCard({ slide }) {
  return (
    <div className="kt-img-card h-full rounded-3xl border border-[var(--kt-border)] bg-white shadow-sm overflow-hidden">
      <div className="relative h-56 overflow-hidden bg-[var(--kt-bg-soft)]">
        {slide.tipoMedia === "video" ? (
          <video
            src={slide.url}
            className="h-full w-full object-cover"
            autoPlay muted loop playsInline controls
          />
        ) : (
          <img src={slide.url} alt={slide.title || ""} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        )}
      </div>
      {(slide.title || slide.subtitle) && (
        <div className="p-5">
          {slide.title && <h4 className="text-sm font-bold text-[var(--kt-ink)]">{slide.title}</h4>}
          {slide.subtitle && <p className="mt-1 text-xs leading-relaxed text-[var(--kt-ink-soft)]">{slide.subtitle}</p>}
        </div>
      )}
    </div>
  );
}
