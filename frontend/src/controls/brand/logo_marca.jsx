import { brandConfig } from "../../config/brand_config.js";

const TAMANIOS = { sm: "text-xl", md: "text-3xl sm:text-4xl", hero: "text-6xl sm:text-7xl" };

/** Logo de texto con el nombre de la marca. `variant="light"` es para fondos oscuros. */
export default function LogoMarca({ size = "md", variant = "dark", className = "" }) {
  const color = variant === "light" ? "text-white" : "text-(--kt-ink)";
  return (
    <span
      aria-label={brandConfig.logo.ariaLabel}
      className={`kt-display inline-flex font-bold leading-none tracking-tight ${TAMANIOS[size] ?? TAMANIOS.md} ${color} ${className}`}
    >
      {brandConfig.logo.texto}
    </span>
  );
}
