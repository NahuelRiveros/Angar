/**
 * Identidad de la marca: textos, logo y fuentes.
 * Paleta en theme_config.js; index.css conserva los tokens de base.
 */
export const brandConfig = {
  nombre: "MiPadel",
  nombreCorto: "MiPadel",
  rubro: "Gestión de torneos de pádel",
  tagline: "Organizá tu torneo de pádel de punta a punta.",
  // Sin logo propio todavía: se muestra el nombre como logo (ver logo_marca.jsx).
  logo: { texto: "MiPadel", ariaLabel: "MiPadel" },
  fuentes: {
    display: "'Bricolage Grotesque', sans-serif",
    body: "'Plus Jakarta Sans', sans-serif",
  },
};
