import { brandConfig } from "../../config/brand_config.js";
import { logoConfig } from "../../config/logo_config.js";
import logoS from "../../assets/logoS1.svg";

// Recreación en SVG del isotipo "moovs" (wordmark "moov" + una S final
// estilizada como columna vertebral, degradé gris → turquesa) a partir del
// logo que mandó el cliente — no es el archivo original, así que puede
// necesitar un ajuste fino de curvas/posición una vez que se vea en pantalla.
const SIZE = {
  sm: {
    text: "text-xl",
    spine: "h-[1.46em]",
    spineBox: "w-[0.72em] -ml-[0.21em] translate-y-[0.19em]",
    markBox: "h-8 w-14",
  },
  md: {
    text: "text-3xl sm:text-4xl",
    spine: "h-[1.52em]",
    spineBox: "w-[0.76em] -ml-[0.22em] translate-y-[0.2em]",
    markBox: "h-12 w-20",
  },
  hero: {
    text: "text-6xl sm:text-7xl md:text-[8.15rem]",
    spine: "h-[1.72em]",
    spineBox: "w-[0.95em] -ml-[0.25em] translate-y-[0.25em]",
    markBox: "h-16 w-28",
  },
};

const WORDMARK_STYLE = {
  fontFamily: '"Raleway", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif',
  fontWeight: 500,
  letterSpacing: "0",
};

function ImagenSpinaS({ className = "" }) {
  return (
    <span className={`${className} relative inline-block overflow-hidden`} aria-hidden="true">
      <img
        src={logoS}
        alt=""
        className="absolute left-1/2 top-0 h-full w-auto max-w-none -translate-x-1/2 object-contain"
      />
    </span>
  );
}

/**
 * Isotipo solo (la S-columna, sin el texto "MOOV") — para espacios chicos
 * donde no entra o no hace falta el wordmark completo (ej. header del
 * drawer mobile).
 */
export function LogoMoovsIcon({ className = "" }) {
  const logo = brandConfig.logo ?? {};
  const sizing = SIZE.sm;

  if (logo.tipo === "moovs-spine") {
    return (
      <span
        aria-label={logo.ariaLabel || brandConfig.nombre}
        className={`inline-flex leading-none ${sizing.text} ${className}`}
      >
        <ImagenSpinaS className={`${sizing.spine} ${sizing.spineBox}`} />
      </span>
    );
  }

  if (logo.tipo === "gc-mark") {
    return (
      <img
        src={logoConfig.navbar}
        alt={logo.ariaLabel || brandConfig.nombre}
        className={`${sizing.markBox} shrink-0 object-contain ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={logo.ariaLabel || brandConfig.nombre}
      className={`inline-flex leading-none ${sizing.text} ${className}`}
      style={WORDMARK_STYLE}
    >
      {logo.texto || brandConfig.nombre}
    </span>
  );
}

/**
 * Wordmark de marca completo. `variant="light"` es para fondos oscuros
 * (footer, CTA final del home); `animated` prende el shimmer (pensado para
 * usos grandes tipo hero). `slot` elige qué imagen usar para logo.tipo
 * "gc-mark" — "navbar" (default) o "footer" — ver logo_config.js, el único
 * lugar que hay que tocar para cambiar el logo. El ícono YA tiene la letra
 * dibujada adentro — a diferencia de la S de moovs-spine (que es solo un
 * trazo, sin letras), acá no hace falta agregar texto al lado, sería
 * repetirla dos veces. El ícono está pensado para fondo claro (viene de un
 * PNG sin base propia) — en `variant="light"` (fondos oscuros como el
 * footer) se le agrega una tarjeta blanca detrás para que no se pierda
 * contra el fondo oscuro. Se renderiza igual que LogoMoovsIcon, más grande
 * según `size`.
 */
export default function LogoMoovs({ size = "md", variant = "dark", slot = "navbar", animated = false, className = "" }) {
  const sizing = SIZE[size] ?? SIZE.md;
  const isLight = variant === "light";
  const logo = brandConfig.logo ?? {};
  const textClass = animated ? "kt-shimmer-text" : isLight ? "text-white" : "text-[var(--kt-ink)]";

  if (logo.tipo === "moovs-spine") {
    return (
      <span
        aria-label={logo.ariaLabel || brandConfig.nombre}
        className={`inline-flex items-end leading-none ${sizing.text} ${className}`}
        style={WORDMARK_STYLE}
      >
        <span aria-hidden="true" className={textClass}>
          {(logo.texto || "MOOV").toUpperCase()}
        </span>
        <ImagenSpinaS className={`${sizing.spine} ${sizing.spineBox}`} />
      </span>
    );
  }

  if (logo.tipo === "gc-mark") {
    return (
      <img
        src={logoConfig[slot] ?? logoConfig.navbar}
        alt={logo.ariaLabel || brandConfig.nombre}
        className={`${sizing.markBox} shrink-0 rounded-lg object-contain ${isLight ? "bg-white p-1.5" : ""} ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={logo.ariaLabel || brandConfig.nombre}
      className={`inline-flex leading-none ${sizing.text} ${textClass} ${className}`}
      style={WORDMARK_STYLE}
    >
      {logo.texto || brandConfig.nombre}
    </span>
  );
}
