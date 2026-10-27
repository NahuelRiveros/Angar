import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useHomeContent } from "../../hooks/use_home_content.js";
import { useHomeConfig } from "../../hooks/use_home_config.js";
import { iconoHome } from "../../controls/config/home_iconos.js";
import { brandConfig } from "../../config/brand_config.js";
import { HOME_TEXTOS_DEFAULT, HOME_COMO_FUNCIONA, HOME_PILARES, HOME_CONTACTOS } from "../../config/home_config.js";
import HomeCarousel from "./home_carousel.jsx";

const esPlaceholder = (v) => /^\[.*\]$/.test(String(v ?? "").trim());

const marcasPadel = ["BULLPADEL", "NOX", "HEAD", "adidas", "Wilson", "Babolat"];

const referentesArgentinos = [
  { categoria: "Circuito masculino", nombre: "Agustín Tapia", apodo: "El Mozart de Catamarca" },
  { categoria: "Circuito femenino", nombre: "Delfina Brea", apodo: "Talento argentino en la élite" },
];

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
      {/* ── HERO ── */}
      <section className="relative isolate overflow-hidden bg-(--kt-night) px-6 py-12 text-white sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute -right-36 -top-40 h-120 w-120 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-88 w-88 rounded-full border border-white/10" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="relative z-10">
            <SectionKicker claro>{texto("hero_kicker", HOME_TEXTOS_DEFAULT.hero_kicker)}</SectionKicker>
            <h1 className="kt-display mt-4 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {texto("hero_titulo", HOME_TEXTOS_DEFAULT.hero_titulo)}{" "}
              <span className="text-(--kt-accent-on-dark)">{texto("hero_titulo_resaltado", HOME_TEXTOS_DEFAULT.hero_titulo_resaltado)}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              {texto("hero_subtitulo", HOME_TEXTOS_DEFAULT.hero_subtitulo)}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/register" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-(--kt-accent-comercial) px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-(--kt-accent-comercial-hover)">
                {texto("hero_cta_primario", HOME_TEXTOS_DEFAULT.hero_cta_primario)} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#como-funciona" className="inline-flex min-h-11 items-center text-sm font-semibold text-white/85 underline-offset-4 hover:underline">
                {texto("hero_cta_secundario", HOME_TEXTOS_DEFAULT.hero_cta_secundario)}
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-2xl lg:py-3">
            <div className="absolute -inset-3 rotate-2 rounded-[2rem] border border-white/15" />
            <div className="relative h-72 overflow-hidden rounded-[1.75rem] bg-(--kt-petrol) shadow-2xl sm:h-96 lg:h-112">
              <img
                src="https://images.pexels.com/photos/36227708/pexels-photo-36227708.jpeg?auto=compress&cs=tinysrgb&w=1400"
                alt=""
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-(--kt-night)/85 via-(--kt-night)/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-(--kt-accent-on-dark)">El juego empieza acá</p>
                  <p className="kt-display mt-2 text-2xl font-bold sm:text-3xl">Viví cada punto.</p>
                </div>
                <span className="mb-1 hidden rounded-full border border-white/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white sm:inline-flex">
                  Pádel · En juego
                </span>
              </div>
            </div>
            <div className="absolute -bottom-5 left-4 rounded-2xl border border-white/15 bg-white px-4 py-3 text-(--kt-ink) shadow-xl sm:left-8 sm:px-5">
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-(--kt-teal-700)">Tu próximo torneo</span>
              <span className="kt-display mt-1 block text-lg font-bold">Se organiza en MiPadel</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Marcas reconocidas de pádel" className="overflow-hidden border-b border-[var(--kt-border)] bg-white px-6 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--kt-ink-soft)] sm:text-left">
            El universo del pádel
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:justify-between sm:gap-x-5">
            {marcasPadel.map((marca, index) => (
              <span
                key={marca}
                className={`kt-display text-xl font-extrabold tracking-tight text-(--kt-petrol)/75 transition duration-300 hover:-translate-y-1 hover:text-(--kt-teal-700) sm:text-2xl ${index % 2 === 0 ? "italic" : ""}`}
              >
                {marca}
              </span>
            ))}
          </div>
          <p className="mt-4 text-center text-[10px] text-[var(--kt-ink-soft)] sm:text-right">
            Marcas mencionadas con fines informativos; sin afiliación comercial.
          </p>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--kt-bg-soft)] px-6 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionKicker>Orgullo argentino</SectionKicker>
            <h2 className="kt-display mt-3 max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
              De acá, para el mundo.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--kt-ink-soft)]">
              El talento argentino es protagonista en el circuito internacional, en la cancha masculina y en la femenina.
            </p>
            <div className="mt-7 divide-y divide-[var(--kt-border)] border-y border-[var(--kt-border)]">
              {referentesArgentinos.map(({ categoria, nombre, apodo }) => (
                <div key={nombre} className="group flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-(--kt-teal-700)">{categoria}</p>
                    <h3 className="kt-display mt-1 text-xl font-bold text-(--kt-ink) sm:text-2xl">{nombre}</h3>
                    <p className="mt-0.5 text-sm text-[var(--kt-ink-soft)]">{apodo}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--kt-border)] text-(--kt-teal-700) transition duration-300 group-hover:-rotate-45 group-hover:bg-(--kt-teal-700) group-hover:text-white" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative grid grid-cols-[1.1fr_0.9fr] items-center gap-3 sm:gap-5">
            <div className="relative mt-8 h-64 overflow-hidden rounded-[1.5rem] bg-(--kt-petrol) shadow-xl sm:h-88">
              <img
                src="https://images.pexels.com/photos/35248259/pexels-photo-35248259.jpeg?auto=compress&cs=tinysrgb&w=1000"
                alt="Jugadora con raqueta de pádel en una cancha cubierta"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-(--kt-night)/65 to-transparent" />
              <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-(--kt-night)">
                El circuito
              </span>
            </div>
            <div className="relative -mt-8 h-52 overflow-hidden rounded-[1.5rem] bg-(--kt-petrol) shadow-xl sm:h-72">
              <img
                src="https://images.pexels.com/photos/36227708/pexels-photo-36227708.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="Jugador disputando un partido de pádel en una cancha cubierta"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-(--kt-night)/65 to-transparent" />
              <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-(--kt-night)">
                Mujeres y hombres
              </span>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-7 max-w-6xl text-right text-[10px] text-[var(--kt-ink-soft)]">
          Fotos ilustrativas de Pexels; no representan a las personas mencionadas.
        </p>
      </section>

      {/* ── CÓMO FUNCIONA — 3 pasos, secuencia real (por eso la numeración) ── */}
      {HOME_COMO_FUNCIONA.length > 0 && (
        <section id="como-funciona" className="py-12 px-6">
          <div className="mx-auto max-w-5xl">
            <SectionKicker>{texto("como_funciona_kicker", HOME_TEXTOS_DEFAULT.como_funciona_kicker)}</SectionKicker>
            <h2 className="kt-display mt-3 text-2xl font-bold leading-tight sm:text-3xl">
              {texto("como_funciona_titulo", HOME_TEXTOS_DEFAULT.como_funciona_titulo)}
            </h2>

            <div className="mt-7 grid gap-8 md:grid-cols-3">
              {HOME_COMO_FUNCIONA.map(({ numero, titulo, texto: cuerpo }, i) => (
                <div key={numero} className="relative">
                  {/* Línea conectora entre pasos — solo desktop, no tiene
                      sentido en una columna sola de mobile. */}
                  {i < HOME_COMO_FUNCIONA.length - 1 && (
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

      <section className="relative overflow-hidden bg-linear-to-b from-[var(--kt-bg-soft)] to-white px-6">
        <div className="kt-dotgrid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_55%_65%_at_85%_40%,black,transparent)]" />

        <div className="relative mx-auto max-w-5xl py-12">
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

      {/* ── CONTACTO (editable desde /admin/home-config); sin datos reales no se muestra ── */}
      {contactosAMostrar.length > 0 && <section id="contacto" className="py-12 px-6">
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
      </section>}

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
          <Link to="/register" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-(--kt-petrol)">Empezar gratis <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>

    </div>
  );
}

function SectionKicker({ children, claro = false }) {
  return (
    <span className={`text-[11px] font-bold uppercase tracking-[0.3em] ${claro ? "text-(--kt-accent-on-dark)" : "text-(--kt-teal-700)"}`}>
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
