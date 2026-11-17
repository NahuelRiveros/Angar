/**
 * Identidad del cliente: nombre, logo y fuentes. La paleta está en theme_config.js.
 * Se elige con `id` de proyecto/client_config.js.
 */
import { clientConfig } from "../../../../proyecto/client_config.js";

export const clientes = {
  ejemplo: {
    nombre: "[COMPLETAR nombre]",
    nombreCorto: "[COMPLETAR]",
    rubro: "[COMPLETAR rubro]",
    tagline: "[COMPLETAR frase corta].",
    // "gc-mark" muestra las imágenes de logo_config.js; "simbolo-y-texto" muestra el símbolo
    // (logo_config.js o el favicon) y el nombre escrito, con `acento` en otro color (ej. texto "Mi", acento "Marca").
    logo: { tipo: "gc-mark", texto: "[COMPLETAR]", ariaLabel: "[COMPLETAR nombre]" },
    // Frases del menú del celular (opcionales; sin ellas se usan textos neutros):
    // menuMovil: { lema: "Arriba de los links", titulo: "Tarjeta de ingreso", texto: "Debajo del título", pie: "Al final" },
    fuentes: {
      display: "'Bricolage Grotesque', sans-serif",
      body: "'Plus Jakarta Sans', sans-serif",
    },
  },
};

export const clienteActivo = clientConfig.id;
export const brandConfig = clientes[clienteActivo];
