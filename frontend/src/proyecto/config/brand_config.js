/**
 * Identidad de MiPadel: nombre, logo, fuentes y frases del menú. La paleta está en theme_config.js.
 * Se elige con `id` de proyecto/client_config.js.
 */
import { clientConfig } from "../../../../proyecto/client_config.js";

export const clientes = {
  mipadel: {
    nombre: "MiPadelCup",
    nombreCorto: "MiPadelCup",
    rubro: "Gestión de torneos de pádel",
    tagline: "Organizá tu torneo de pádel de punta a punta.",
    // Símbolo de pádel (el favicon, ver logo_config.js) y el nombre con "Cup" resaltado.
    logo: { tipo: "simbolo-y-texto", texto: "MiPadel", acento: "Cup", ariaLabel: "MiPadelCup" },
    menuMovil: {
      lema: "Tu próximo partido empieza acá",
      titulo: "Nos vemos en la cancha.",
      texto: "Entrá a tu cuenta y viví tu próximo torneo.",
      pie: "Pádel. Comunidad. Competencia.",
    },
    fuentes: {
      display: "'Bricolage Grotesque', sans-serif",
      body: "'Plus Jakarta Sans', sans-serif",
    },
  },
};

export const clienteActivo = clientConfig.id;
export const brandConfig = clientes[clienteActivo];
