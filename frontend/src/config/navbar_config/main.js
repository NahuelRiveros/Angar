import { Home, HelpCircle, Phone } from "lucide-react";
import { accountLinks } from "./account.js";
import { brandConfig } from "../brand_config.js";
import { projectModules } from "../gate_config.js";
import { catalogConfig } from "../catalog_config.js";
import CartIcon from "../../controls/carrito/cart_icon.jsx";
import CarritoDistribuidoraIcon from "../../modules/eccomerce_distribuidora/carrito/carrito_icon.jsx";

import { gymLinks, gymDropdown } from "./gym_dropdown.js";
import { kinesiologiaDropdown } from "./kinesiologia_dropdown.js";
import { eccomerceIndumentariaDropdown } from "./eccomerce_indumentaria_dropdown.js";
import { eccomerceDistribuidoraCatalogoLink } from "./eccomerce_distribuidora_dropdown.js";
import { panelGestionLink } from "./panel_gestion.js";

// Un archivo por dropdown (gym_dropdown.js, kinesiologia_dropdown.js,
// eccomerce_indumentaria_dropdown.js, admin_dropdown.js,
// super_admin_dropdown.js) — cada uno dueño de todo su árbol, sin
// importarse cosas entre sí. Este archivo solo ensambla: agrega el import
// y una línea de spread en `dropdowns`, nunca copia ítems de otro archivo.
// Si un dropdown tiene sub-menús (como "Admin" → Gestión/Configuración),
// eso se resuelve con `children` DENTRO de ese mismo archivo, no partiendo
// el dropdown en más archivos — ver admin_dropdown.js.
//
// `extras` son componentes que se renderizan en la barra, junto al login/user
// box — así controls/layout/navbar.jsx no necesita importar directamente
// módulos opcionales (ej. carrito). Cada componente decide por su cuenta si
// se muestra o no (CartIcon se auto-oculta si cartConfig.enableCart es false).
//
// DOS GATES, uno arriba del otro:
//   1. gate_config.js (el gate maestro) decide si el módulo EXISTE en este
//      proyecto — por eso los grupos se arman condicionalmente acá con
//      spreads (...(projectModules.gym ? [...] : [])). Si es false, ni se
//      define el ítem: no hay nada que un cliente pueda reactivar por su cuenta.
//   2. Dentro de un módulo ya habilitado en el código, cada ítem lleva
//      `modulo: "<codigo>"` y se filtra en vivo con moduloHabilitado() contra
//      la tabla modulo_negocio (togleable desde /super-admin/modulos, sin
//      redeploy). Así un super_admin puede apagar temporalmente "Gym" y esos
//      ítems desaparecen aunque gate_config.js siga en true.
// Los ítems del propio dropdown "super_admin" (Suscripción, Módulos
// habilitados) NO llevan `modulo:` — tienen que seguir accesibles aunque
// todo lo demás esté apagado, para poder volver a prenderlo.
export const navbar_config = {
  extras: [CartIcon, CarritoDistribuidoraIcon],
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
    ...(projectModules.gym ? gymLinks : []),
    ...(projectModules.eccomerce_distribuidora ? [eccomerceDistribuidoraCatalogoLink,
      { label: "Cómo pedir", to: "/#como-pedir", icon: HelpCircle },
      { label: "Contacto", to: "/#contacto", icon: Phone },
    ] : []),
    // "Distribuidora · Gestión", "Admin" y "Sistema" viven en el panel (/panel),
    // con su menú lateral; ver panel_gestion.js.
    panelGestionLink,
  ],

  dropdowns: [
    ...(projectModules.gym ? [gymDropdown] : []),
    ...(projectModules.kinesiologia ? [kinesiologiaDropdown] : []),
    ...(catalogConfig.enabled ? [eccomerceIndumentariaDropdown] : []),
  ],
};
