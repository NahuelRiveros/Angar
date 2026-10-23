/**
 * Identidad por cliente: textos, logo y fuentes.
 * La instalación activa se elige en client_config.js.
 * Paleta en theme_config.js; index.css conserva los tokens de base.
 */
import { clientConfig } from "../../../client_config.js";
export const clientes = {
  moovs: {
    nombre: "NOMBRE INC",
    rubro: "RUBRO FUTURO",
    tagline: "TAGLINE.",
    clienteActivo: true,

    logo: {
      tipo: "moovs-spine",
      texto: "MOOV",
      ariaLabel: "Moovs",
    },

    fuentes: {
      display: "'Bricolage Grotesque', sans-serif",
      body: "'Plus Jakarta Sans', sans-serif",
    },
  },

  gc: {
    nombre: "DC Formosa",
    nombreCorto: "DC Formosa",
    rubro: "Distribuidora mayorista y minorista",
    tagline: "Distribuciones mayorista y minorista.",
    // Identificador interno conservado para el componente de logo compartido.
    logo: {
      tipo: "gc-mark",
      texto: "DC Formosa",
      ariaLabel: "DC Formosa",
    },
    fuentes: {
      display: "'Bricolage Grotesque', sans-serif",
      body: "'Plus Jakarta Sans', sans-serif",
    },
    // Azul y rojo del logo: ver theme_config.js.
  },
};

export const clienteActivo = clientConfig.id;
export const brandConfig = clientes[clienteActivo];
