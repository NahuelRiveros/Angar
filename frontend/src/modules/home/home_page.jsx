import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useHomeContent } from "../../hooks/use_home_content.js";
import { useHomeConfig } from "../../hooks/use_home_config.js";
import { iconoHome } from "../../controls/config/home_iconos.js";
import { brandConfig } from "../../config/brand_config.js";
import { HOME_TEXTOS_DEFAULT, HOME_COMO_FUNCIONA, HOME_PILARES, HOME_CONTACTOS } from "../../config/home_config.js";
import HomeCarousel from "./home_carousel.jsx";

const esPlaceholder = (v) => /^\[.*\]$/.test(String(v ?? "").trim());

const marcasPadel = [
  { titulo: "Palas que marcan el juego", nombres: ["BULLPADEL", "NOX", "HEAD"] },
  { titulo: "Rendimiento dentro y fuera de la pista", nombres: ["adidas", "Wilson", "Babolat"] },
  { titulo: "El equipamiento de cada punto", nombres: ["Siux", "ASICS", "StarVie"] },
];

const referentesArgentinos = [
  {
    categoria: "El Mozart de Catamarca",
    nombre: "Agustín Tapia",
    imagen: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Agustin-tapia.jpg",
    descripcionImagen: "Agustín Tapia, jugador argentino de pádel",
    credito: "Daniel Luque Jiménez · CC BY-SA 4.0",
    fuente: "https://commons.wikimedia.org/wiki/File:Agustin-tapia.jpg",
  },
  {
    categoria: "Una referente argentina",
    nombre: "Delfina Brea",
    imagen: "https://images.pexels.com/photos/35248259/pexels-photo-35248259.jpeg?auto=compress&cs=tinysrgb&w=900",
    descripcionImagen: "Jugadora de pádel en una cancha; foto ilustrativa, no es Delfina Brea",
    credito: "Foto ilustrativa · Pexels",
    fuente: "https://www.pexels.com/photo/woman-playing-padel-tennis-indoors-with-focus-35248286/",
    ilustrativa: true,
  },
  {
    categoria: "El chaqueño de revés potente",
    nombre: "Franco Stupaczuk",
    imagen: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Stupaczuk_%28cropped%29.jpg",
    descripcionImagen: "Franco Stupaczuk, jugador argentino de pádel",
    credito: "Harpagornis · CC BY 4.0",
    fuente: "https://commons.wikimedia.org/wiki/File:Stupaczuk_(cropped).jpg",
  },
];

const referentePorPilar = {
  zonas: referentesArgentinos[0],
  llaves: referentesArgentinos[2],
  premios: referentesArgentinos[1],
};

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
      <section className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-(--kt-night) px-6 py-16 text-white sm:min-h-[680px] sm:py-20">
        <img
          src="https://images.pexels.com/photos/38155778/pexels-photo-38155778/free-photo-of-indoor-padel-tennis-courts-with-blue-surface.jpeg?auto=compress&cs=tinysrgb&w=1800"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#062F22]/95 via-[#073D2B]/75 to-[#073D2B]/25" />
        <div className="pointer-events-none absolute -right-36 -top-40 h-120 w-120 rounded-full border border-[#D2F36B]/25" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-88 w-88 rounded-full border border-white/20" />
        <div className="relative mx-auto w-full max-w-6xl">
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D2F36B]/45 bg-[#073D2B]/50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#D2F36B] backdrop-blur-sm sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-[#D2F36B] shadow-[0_0_14px_#D2F36B]" />
              La pasión se juega en equipo
            </span>
            <div className="mt-4">
              <SectionKicker claro>{texto("hero_kicker", HOME_TEXTOS_DEFAULT.hero_kicker)}</SectionKicker>
            </div>
            <h1 className="kt-display mt-5 max-w-3xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              {texto("hero_titulo", HOME_TEXTOS_DEFAULT.hero_titulo)}{" "}
              <span className="text-(--kt-accent-on-dark)">{texto("hero_titulo_resaltado", HOME_TEXTOS_DEFAULT.hero_titulo_resaltado)}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
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
        </div>
        <div className="absolute bottom-7 right-6 hidden items-center gap-3 text-white/85 sm:flex lg:right-12">
          <span className="h-px w-12 bg-[#D2F36B]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Tu cancha, tus reglas</span>
        </div>
      </section>

      <section aria-label="Marcas reconocidas de pádel" className="overflow-hidden bg-[#EAF2D8] px-6 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <SectionKicker>En cada punto</SectionKicker>
              <h2 className="kt-display mt-2 text-2xl font-bold leading-tight text-(--kt-ink) sm:text-3xl">
                El universo del pádel
              </h2>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-[var(--kt-ink-soft)] sm:text-right sm:text-sm">
              Marcas que acompañan a quienes viven el juego. Mencionadas con fines informativos, sin afiliación comercial.
            </p>
          </div>
          <HomeCarousel
            items={marcasPadel}
            anchoItem="w-full"
            renderItem={(slide, index) => (
              <div className="relative flex min-h-44 items-center overflow-hidden rounded-[1.75rem] bg-(--kt-night) px-6 py-8 text-white shadow-xl sm:min-h-52 sm:px-12">
                <span className="pointer-events-none absolute -right-8 -top-24 h-64 w-64 rounded-full border border-[#D2F36B]/20" />
                <span className="pointer-events-none absolute -right-2 -top-16 h-48 w-48 rounded-full border border-white/10" />
                <div className="relative z-10 w-full">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#D2F36B]">Selección MiPadel · 0{index + 1}</p>
                  <h3 className="kt-display mt-2 text-xl font-bold sm:text-2xl">{slide.titulo}</h3>
                  <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 sm:gap-x-14">
                    {slide.nombres.map((marca) => (
                      <span key={marca} className="kt-display text-xl font-extrabold tracking-tight text-white sm:text-3xl">
                        {marca}
                      </span>
                    ))}
                  </div>
                </div>
                <span aria-hidden="true" className="absolute bottom-0 right-5 kt-display text-8xl font-black leading-none text-white/5 sm:right-10 sm:text-9xl">
                  P
                </span>
              </div>
            )}
          />
        </div>
      </section>

      {/* ── PILARES CON IMÁGENES (editables desde /admin/home-config) ── */}
      <section id="pilares" aria-labelledby="pilares-titulo" className="relative isolate overflow-hidden bg-(--kt-night) px-6 py-14 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-[#D2F36B]/15" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionKicker claro>{texto("pilares_kicker", HOME_TEXTOS_DEFAULT.pilares_kicker)}</SectionKicker>
              <h2 id="pilares-titulo" className="kt-display mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                {texto("pilares_titulo", HOME_TEXTOS_DEFAULT.pilares_titulo)}
                <span className="block text-[#D2F36B]">{texto("pilares_titulo_resaltado", HOME_TEXTOS_DEFAULT.pilares_titulo_resaltado)}</span>
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/75 sm:text-right">
              De las zonas a la final: organizá cada etapa con la energía del pádel argentino.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {pilaresAMostrar.map(({ id, icono, titulo, texto: cuerpo }, index) => {
              const Icon = iconoHome(icono);
              const referente = referentePorPilar[id] ?? referentesArgentinos[index % referentesArgentinos.length];
              return (
                <article
                  key={id}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-xl shadow-black/15 transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative h-52 overflow-hidden bg-(--kt-petrol) sm:h-60">
                    <img
                      src={referente.imagen}
                      alt={referente.descripcionImagen}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#062F22]/90 via-[#062F22]/10 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/40 bg-[#073D2B]/70 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                      {referente.ilustrativa ? "Imagen ilustrativa" : "Referente del pádel"}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D2F36B]">{referente.categoria}</p>
                        <p className="kt-display mt-1 text-xl font-bold text-white">{referente.nombre}</p>
                      </div>
                      <a
                        href={referente.fuente}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-full bg-white/15 px-3 py-2 text-[10px] font-bold text-white underline underline-offset-2 backdrop-blur-sm transition hover:bg-white/25"
                      >
                        Ver fuente
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--kt-turquoise-soft)] text-(--kt-teal-700)">
                      <Icon size={23} aria-hidden="true" />
                    </div>
                    <h3 className="kt-display mt-5 text-xl font-bold text-[var(--kt-ink)]">{titulo}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--kt-ink-soft)]">{cuerpo}</p>
                    <p className="mt-5 border-t border-[var(--kt-border)] pt-3 text-[10px] leading-relaxed text-[var(--kt-ink-soft)]">
                      {referente.credito}
                      {referente.ilustrativa && " · La imagen no retrata a Delfina Brea."}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#D2F36B]/25 bg-white/5 px-5 py-4 text-sm leading-relaxed text-white/85">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#D2F36B]" size={20} aria-hidden="true" />
            <p>
              <strong className="text-white">Permisos claros:</strong> cada organizador gestiona sus propios torneos; para crear o editar necesita tener la suscripción vigente.
            </p>
          </div>
        </div>
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
