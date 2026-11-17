import { Home } from "lucide-react";
import { accountLinks } from "./account.js";
import { brandConfig } from "../../../proyecto/config/brand_config.js";
import { modulosActivos } from "../../../proyecto/modulos_activos.js";
import { pantallasActivas } from "../../../proyecto/pantallas_modulos.jsx";

import { panelGestionLink } from "./panel_gestion.js";

// Un archivo por dropdown (admin_dropdown.js,
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
// se muestra o no.
//
// Qué rubros existen lo decide gate_config.js: los menús de un rubro apagado ni se arman.
// Dentro de lo que existe, cada ítem se muestra según los roles o permisos que pide.
export const navbar_config = {
  extras: pantallasActivas.flatMap((pantallas) => pantallas.extrasNavbar ?? []),
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
    ...modulosActivos.flatMap((modulo) => modulo.menu?.links ?? []),
    // "Distribuidora · Gestión", "Admin" y "Sistema" viven en el panel (/panel),
    // con su menú lateral; ver panel_gestion.js.
    panelGestionLink,
  ],

  dropdowns: [],
};
