import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, MoveUpRight, Pause, Play } from "lucide-react";
import { HOME_TEXTOS_DEFAULT } from "../../config/home_config.js";
import { JUGADORES_HOME } from "./home_media.js";

export default function HomeHero({ texto }) {
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hover, setHover] = useState(false);
  const [foco, setFoco] = useState(false);
  const enPausa = pausado || hover || foco;
  const jugador = JUGADORES_HOME[activo];

  useEffect(() => {
    if (enPausa) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActivo((actual) => (actual + 1) % JUGADORES_HOME.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [enPausa, activo]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const actualizar = () => setPausado(media.matches);
    media.addEventListener("change", actualizar);
    return () => media.removeEventListener("change", actualizar);
  }, []);

  return (
    <section className="padel-hero" aria-labelledby="home-titulo">
      <div className="padel-court" aria-hidden="true" />
      <div className="padel-hero-word kt-display" aria-hidden="true">PÁDEL</div>
      <div className="padel-hero-inner">
        <div className="padel-hero-copy">
          <p className="padel-eyebrow"><span /> HECHO PARA VIVIR EL JUEGO</p>
          <p className="padel-hero-kicker">{texto("hero_kicker", HOME_TEXTOS_DEFAULT.hero_kicker)}</p>
          <h1 id="home-titulo" className="kt-display">
            {texto("hero_titulo", HOME_TEXTOS_DEFAULT.hero_titulo)}
            <span>{texto("hero_titulo_resaltado", HOME_TEXTOS_DEFAULT.hero_titulo_resaltado)}</span>
          </h1>
          <p className="padel-hero-description">{texto("hero_subtitulo", HOME_TEXTOS_DEFAULT.hero_subtitulo)}</p>
          <div className="padel-hero-actions">
            <Link to="/register" className="padel-primary">
              {texto("hero_cta_primario", HOME_TEXTOS_DEFAULT.hero_cta_primario)} <ArrowRight size={19} aria-hidden="true" />
            </Link>
            <Link to="/torneos" className="padel-secondary">Explorar torneos <MoveUpRight size={17} aria-hidden="true" /></Link>
          </div>
          <a className="padel-how" href="#como-funciona"><ArrowDown size={15} aria-hidden="true" /> {texto("hero_cta_secundario", HOME_TEXTOS_DEFAULT.hero_cta_secundario)}</a>
        </div>

        <div className="padel-athletes"
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setHover(true); }}
          onPointerLeave={() => setHover(false)}
          onFocusCapture={() => setFoco(true)}
          onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFoco(false); }}>
          <div className="padel-athletes-halo" aria-hidden="true" />
          <span className="padel-argentina" aria-hidden="true">ARG<span />PASIÓN SIN LÍMITES</span>
          <div className="padel-athlete-stage" role="img" aria-label={`Composición de referentes argentinos del pádel. Destacado: ${jugador.nombre}.`}>
            {JUGADORES_HOME.map((p, index) => {
              const posicion = (index - activo + JUGADORES_HOME.length) % JUGADORES_HOME.length;
              return <img key={p.id} src={p.imagen} alt="" aria-hidden="true" width="750" height="558"
                fetchPriority={index === 0 ? "high" : "auto"} decoding="async"
                className={`padel-athlete padel-athlete-position-${posicion}`} />;
            })}
          </div>
          <div className="padel-player-caption" aria-live={enPausa ? "polite" : "off"} aria-atomic="true">
            <span>REFERENTES ARGENTINOS</span>
            <strong className="kt-display">{jugador.nombre}</strong>
            <span>{jugador.origen}</span>
          </div>
          <div className="padel-player-picker" role="group" aria-label="Elegir jugador destacado">
            {JUGADORES_HOME.map((p, index) => (
              <button key={p.id} type="button" aria-pressed={index === activo} onClick={() => setActivo(index)}>
                {p.corto}
              </button>
            ))}
            <button type="button" className="padel-player-toggle" aria-label={pausado ? "Reanudar carrusel de jugadores" : "Pausar carrusel de jugadores"}
              onClick={() => setPausado((actual) => !actual)}>
              {pausado ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
      <div className="padel-hero-baseline"><span>De la primera inscripción al último punto.</span><span>ZONAS <i /> LLAVES <i /> RESULTADOS</span></div>
    </section>
  );
}
