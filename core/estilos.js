// Estilos de diseño que un proyecto elige con `estilo` en proyecto/config/theme_config.js
// (spec: docs/specs/core/estilos.md). Cada uno es un juego de variables: colores de marca (--kt-*),
// grises (--color-neutral-*, que usan todos los slate-* y gray-*), esquinas (--radius-*), sombras
// (--shadow-*) y tipografías. Los colores propios del proyecto (themeConfig) se aplican encima.
// Toman principios de sistemas de diseño públicos (contraste, espacio, jerarquía), no la marca de nadie:
// tipografías libres de Google Fonts y colores propios.

/** Escalas de grises de Tailwind (50 → 950). */
const GRISES = {
  neutros: ["#fafafa", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3", "#737373", "#525252", "#404040", "#262626", "#171717", "#0a0a0a"],
  frios: ["#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b", "#0f172a", "#020617"],
  calidos: ["#fafaf9", "#f5f5f4", "#e7e5e4", "#d6d3d1", "#a8a29e", "#78716c", "#57534e", "#44403c", "#292524", "#1c1917", "#0c0a09"],
};
const PASOS_GRIS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const grises = (escala) => Object.fromEntries(PASOS_GRIS.map((paso, i) => [`--color-neutral-${paso}`, GRISES[escala][i]]));
const esquinas = ([lg, xl, xl2, xl3]) => ({ "--radius-lg": lg, "--radius-xl": xl, "--radius-2xl": xl2, "--radius-3xl": xl3 });

export const ESTILOS = {
  minimalista: {
    nombre: "Minimalista",
    descripcion: "Blanco y negro, mucho aire, esquinas apenas redondeadas y casi sin sombras.",
    fuentes: { display: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    google: "family=Inter:wght@400..800",
    variables: {
      "--kt-teal-900": "#0a0a0a", "--kt-teal-700": "#171717", "--kt-teal-500": "#525252", "--kt-petrol": "#404040", "--kt-night": "#171717",
      "--kt-turquoise": "#2563eb", "--kt-turquoise-soft": "#eff6ff", "--kt-turquoise-border": "#bfdbfe",
      "--kt-bg": "#ffffff", "--kt-bg-soft": "#fafafa", "--kt-ink": "#171717", "--kt-ink-soft": "#525252", "--kt-ink-mute": "#a3a3a3", "--kt-border": "#e5e5e5",
      "--kt-accent-comercial": "#171717", "--kt-accent-comercial-hover": "#404040", "--kt-accent-comercial-soft": "#f5f5f5",
      ...grises("neutros"), ...esquinas(["0.375rem", "0.5rem", "0.75rem", "1rem"]),
      "--shadow-sm": "0 1px 2px rgb(0 0 0 / 0.04)", "--shadow-lg": "0 4px 12px rgb(0 0 0 / 0.06)",
      "--font-sans": "'Inter', ui-sans-serif, system-ui, sans-serif",
    },
  },
  moderno: {
    nombre: "Moderno",
    descripcion: "Color vivo, esquinas bien redondeadas, sombras suaves y botones grandes.",
    fuentes: { display: "'Manrope', sans-serif", body: "'Manrope', sans-serif" },
    google: "family=Manrope:wght@400..800",
    variables: {
      "--kt-teal-900": "#312e81", "--kt-teal-700": "#4f46e5", "--kt-teal-500": "#818cf8", "--kt-petrol": "#4338ca", "--kt-night": "#1e1b4b",
      "--kt-turquoise": "#06b6d4", "--kt-turquoise-soft": "#ecfeff", "--kt-turquoise-border": "#a5f3fc",
      "--kt-bg": "#ffffff", "--kt-bg-soft": "#f8fafc", "--kt-ink": "#0f172a", "--kt-ink-soft": "#475569", "--kt-ink-mute": "#94a3b8", "--kt-border": "#e2e8f0",
      "--kt-accent-comercial": "#be185d", "--kt-accent-comercial-hover": "#9d174d", "--kt-accent-comercial-soft": "#fdf2f8",
      ...grises("frios"), ...esquinas(["0.75rem", "1rem", "1.5rem", "2rem"]),
      "--shadow-sm": "0 1px 3px rgb(15 23 42 / 0.08)", "--shadow-lg": "0 12px 32px -8px rgb(79 70 229 / 0.25)",
      "--font-sans": "'Manrope', ui-sans-serif, system-ui, sans-serif",
    },
  },
  clasico: {
    nombre: "Clásico",
    descripcion: "Títulos con serifa, tonos sobrios (azul marino, bordó y dorado), bordes finos.",
    fuentes: { display: "'Playfair Display', serif", body: "'Source Sans 3', sans-serif" },
    google: "family=Playfair+Display:wght@500..800&family=Source+Sans+3:wght@400..700",
    variables: {
      "--kt-teal-900": "#0f2238", "--kt-teal-700": "#1e3a5f", "--kt-teal-500": "#4a6fa5", "--kt-petrol": "#16304f", "--kt-night": "#0f2238",
      "--kt-turquoise": "#a67c2e", "--kt-turquoise-soft": "#fbf5e9", "--kt-turquoise-border": "#e8d9b5",
      "--kt-bg": "#fffdf8", "--kt-bg-soft": "#f7f3ec", "--kt-ink": "#2a2520", "--kt-ink-soft": "#5c5248", "--kt-ink-mute": "#a39a8f", "--kt-border": "#e5ded3",
      "--kt-accent-comercial": "#7a2e2e", "--kt-accent-comercial-hover": "#5e2222", "--kt-accent-comercial-soft": "#f8eded",
      ...grises("calidos"), ...esquinas(["0.25rem", "0.375rem", "0.5rem", "0.75rem"]),
      "--shadow-sm": "0 1px 2px rgb(42 37 32 / 0.06)", "--shadow-lg": "0 6px 16px rgb(42 37 32 / 0.08)",
      "--font-sans": "'Source Sans 3', ui-sans-serif, system-ui, sans-serif",
    },
  },
};

/** Las variables que todo estilo define (lo controla tests/estilos.test.mjs). */
export const VARIABLES_DE_ESTILO = Object.keys(ESTILOS.minimalista.variables);
