import { brandConfig } from "../../../proyecto/config/brand_config.js";
import * as tema from "../../../proyecto/config/theme_config.js";
import { ESTILOS } from "../../../../../core/estilos.js";

// Orden: el estilo elegido (si hay), después los colores propios del proyecto y sus fuentes. Sin `estilo`
// en theme_config.js (los proyectos de antes), queda todo como siempre.
const raiz = document.documentElement;
const estilo = tema.estilo ? ESTILOS[tema.estilo] : null;
if (tema.estilo && !estilo) console.error(`theme_config.js: no existe el estilo "${tema.estilo}". Los que hay: ${Object.keys(ESTILOS).join(", ")}.`);
if (estilo) {
  raiz.dataset.estilo = tema.estilo;
  for (const [nombre, valor] of Object.entries(estilo.variables)) raiz.style.setProperty(nombre, valor);
  raiz.style.setProperty("--kt-font-display", estilo.fuentes.display);
  raiz.style.setProperty("--kt-font-body", estilo.fuentes.body);
  // Solo se descargan las tipografías del estilo elegido.
  const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: `https://fonts.googleapis.com/css2?${estilo.google}&display=swap` });
  document.head.append(link);
}
for (const [name, value] of Object.entries(tema.themeConfig ?? {})) raiz.style.setProperty(name, value);
if (brandConfig.fuentes?.display) raiz.style.setProperty("--kt-font-display", brandConfig.fuentes.display);
if (brandConfig.fuentes?.body) raiz.style.setProperty("--kt-font-body", brandConfig.fuentes.body);
