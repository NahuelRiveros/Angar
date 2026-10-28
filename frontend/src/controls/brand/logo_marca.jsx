import { brandConfig } from "../../config/brand_config.js";

const TAMANIOS = {
  sm: { texto: "text-lg", icono: "h-9 w-9" },
  md: { texto: "text-3xl sm:text-4xl", icono: "h-12 w-12 sm:h-14 sm:w-14" },
  hero: { texto: "text-4xl sm:text-7xl", icono: "h-16 w-16 sm:h-24 sm:w-24" },
};

/** Símbolo de pádel y marca; la variante clara se usa sobre fondos oscuros. */
export default function LogoMarca({ size = "md", variant = "dark", className = "" }) {
  const claro = variant === "light";
  const tamanio = TAMANIOS[size] ?? TAMANIOS.md;
  return (
    <span aria-label={brandConfig.logo.ariaLabel}
      className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <img src="/favicon.svg" alt="" aria-hidden="true" width="64" height="64"
        className={`shrink-0 ${tamanio.icono}`} />
      <span aria-hidden="true" className={`kt-display whitespace-nowrap font-extrabold leading-none tracking-[-0.055em] ${tamanio.texto} ${claro ? "text-white" : "text-(--kt-night)"}`}>
        {brandConfig.logo.texto}<span className={claro ? "text-(--kt-accent-on-dark)" : "text-(--kt-teal-500)"}>{brandConfig.logo.acento}</span>
      </span>
    </span>
  );
}
