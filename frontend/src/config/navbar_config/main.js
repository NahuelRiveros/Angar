import { Home } from "lucide-react";
import { accountLinks } from "./account.js";
import { brandConfig } from "../brand_config.js";
import { panelGestionLink } from "./panel_gestion.js";

// Cada ítem puede pedir `requiereAuth`, `roles` o `permisos`; navbar_permissions.js
// filtra lo que no corresponde al usuario. Lo del equipo vive en el panel (/panel).
export const navbar_config = {
  extras: [],
  accountLinks,

  brand: {
    titulo: brandConfig.nombre,
    subtitulo: brandConfig.rubro,
    logoUrl: null,
    mostrarTitulo: true,
    mostrarSubtitulo: true,
    linkTo: "/",
  },

  labels: {
    menuAbrir: "Abrir menú",
    dropdownAbrir: "Abrir submenú",
    seccionDropdownMobile: "Administración",
    botonSalir: "Cerrar sesión",
  },

  links: [
    { label: "Inicio", to: "/", exact: true, icon: Home },
    panelGestionLink,
  ],

  dropdowns: [],
};
