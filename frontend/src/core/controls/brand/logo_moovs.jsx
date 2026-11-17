import { brandConfig } from "../../../proyecto/config/brand_config.js";
import { logoConfig } from "../../../proyecto/config/logo_config.js";

// Logo de la marca: "gc-mark" muestra las imágenes de proyecto/config/logo_config.js;
// cualquier otro tipo muestra el nombre (o logo.texto) como texto.
const SIZE = {
  sm: {
    text: "text-xl",
    markBox: "h-8 w-14",
  },
  md: {
    text: "text-3xl sm:text-4xl",
    markBox: "h-12 w-20",
  },
  hero: {
    text: "text-6xl sm:text-7xl md:text-[8.15rem]",
    markBox: "h-16 w-28",
  },
};

// logo.tipo "simbolo-y-texto": el símbolo (logoConfig o el favicon) y el nombre, con `acento` en otro color.
const SIMBOLO = { sm: "h-9 w-9", md: "h-12 w-12 sm:h-14 sm:w-14", hero: "h-16 w-16 sm:h-24 sm:w-24" };
const NOMBRE = { sm: "text-lg", md: "text-3xl sm:text-4xl", hero: "text-4xl sm:text-7xl" };

function SimboloYTexto({ logo, size, slot, isLight, className }) {
  return (
    <span aria-label={logo.ariaLabel || brandConfig.nombre} className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <img src={logoConfig[slot] ?? logoConfig.navbar ?? "/favicon.svg"} alt="" aria-hidden="true" width="64" height="64"
        className={`shrink-0 object-contain ${SIMBOLO[size] ?? SIMBOLO.md}`} />
      <span aria-hidden="true" className={`kt-display whitespace-nowrap font-extrabold leading-none tracking-[-0.055em] ${NOMBRE[size] ?? NOMBRE.md} ${isLight ? "text-white" : "text-(--kt-night)"}`}>
        {logo.texto || brandConfig.nombre}
        {logo.acento && <span className={isLight ? "text-(--kt-accent-on-dark)" : "text-(--kt-teal-500)"}>{logo.acento}</span>}
      </span>
    </span>
  );
}

const WORDMARK_STYLE = {
  fontFamily: '"Raleway", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif',
  fontWeight: 500,
  letterSpacing: "0",
};

/**
 * Isotipo solo, para espacios chicos (ej. header del drawer mobile).
 */
export function LogoMoovsIcon({ className = "" }) {
  const logo = brandConfig.logo ?? {};
  const sizing = SIZE.sm;

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
 * lugar que hay que tocar para cambiar el logo. El ícono está pensado para fondo claro (viene de un
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

  if (logo.tipo === "simbolo-y-texto") return <SimboloYTexto logo={logo} size={size} slot={slot} isLight={isLight} className={className} />;

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
