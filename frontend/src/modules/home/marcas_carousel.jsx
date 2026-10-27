import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { MARCAS_HOME } from "./home_media.js";

export default function MarcasCarousel() {
  const [pausado, setPausado] = useState(false);
  return (
    <section className="padel-brands" aria-labelledby="marcas-titulo">
      <div className="padel-brands-heading">
        <div><p className="padel-eyebrow">EL UNIVERSO DEL PÁDEL</p><h2 id="marcas-titulo" className="kt-display">Las marcas del juego.</h2></div>
        <button type="button" className="padel-motion-toggle" aria-pressed={pausado} onClick={() => setPausado(!pausado)}
          aria-label={pausado ? "Reanudar carrusel de marcas" : "Pausar carrusel de marcas"}>
          {pausado ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />} <span>{pausado ? "Reanudar" : "Pausar"}</span>
        </button>
      </div>
      <div className="padel-brands-window" role="region" aria-label="Logos de marcas de pádel" tabIndex={0} data-paused={pausado ? "true" : "false"}>
        <div className="padel-brands-track">
          {[0, 1].map((copia) => (
            <ul key={copia} className="padel-brands-group" aria-hidden={copia === 1 ? "true" : undefined}>
              {MARCAS_HOME.map((marca) => <li key={marca.nombre}>
                <img src={marca.imagen} alt={copia === 0 ? marca.nombre : ""} width="160" height="65" loading="lazy" decoding="async"
                  className={`${marca.compacta ? "compact" : ""} ${marca.monocromo ? "monochrome" : ""}`} />
              </li>)}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
