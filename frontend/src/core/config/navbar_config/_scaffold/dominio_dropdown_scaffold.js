/**
 * PLANTILLA — la contribución de un módulo nuevo al navbar: un dropdown de
 * primer nivel + (opcional) unos links sueltos. Ver gym_dropdown.js,
 * kinesiologia_dropdown.js o eccomerce_indumentaria_dropdown.js (carpeta
 * hermana) para ejemplos reales ya funcionando con este patrón.
 *
 * No se importa desde ningún lado — punto de partida para copiar.
 *
 * Un ítem es UNA de estas dos formas, nunca las dos juntas:
 *   - Link:  tiene `to`, NO tiene `children` (ver "Item 1" abajo).
 *   - Grupo: tiene `children` (un array de links), NO tiene `to` — no es
 *     clickeable, solo abre un submenú (ver "Item 2 (grupo)" abajo).
 * Si tu dropdown no necesita ningún grupo, borrá "Item 2 (grupo)" entero
 * y listo — no dejes `children: []` en un link, o un grupo sin ítems.
 *
 * Sigue siendo UN solo archivo, dueño de todo su árbol (los `children`
 * también se escriben acá, no en otro archivo). Nunca partas un dropdown en
 * varios archivos ni importes ítems de otro dropdown: cada archivo de acá
 * adentro es autocontenido, main.js es el único lugar que los conecta entre sí.
 *
 * Cómo usarla:
 *   1. Copiá a `navbar_config/mi_dominio_dropdown.js`.
 *   2. Cambiá los íconos, labels, rutas y roles por los reales.
 *   3. En cada ítem, `permisos: ["..."]` (o `roles`) dice quién lo ve.
 *   4. Si el módulo también necesita links sueltos fuera de un dropdown
 *      (como gymLinks en gym_dropdown.js), exportalos aparte, en el mismo archivo.
 *   5. Registralo en `navbar_config/main.js`:
 *        import { miDominioDropdown } from "./mi_dominio_dropdown.js";
 *        // en dropdowns: ...(algúnConfig.enableMiDominio ? [miDominioDropdown] : []),
 *      El gate maestro (¿existe este módulo en este proyecto?) SIEMPRE va acá,
 *      con el spread condicional — nunca dentro de este archivo.
 */

import { Sparkles } from "lucide-react"; // TODO: ícono real

export const dominioDropdown = {
  id: "mi_dominio", // único entre los dropdowns de main.js
  labelNoAuth: "Mi Dominio",
  labelAuth: "Mi Dominio",
  icon: Sparkles,
  items: [
    // Link directo — clickeable, va a una ruta. TODO: borrar si no hace falta.
    {
      label: "Item 1",
      to: "/admin/mi-dominio",
      requiereAuth: true,
      roles: ["admin"], // TODO: roles reales
      icon: Sparkles,
    },
    // Grupo/submenú — NO clickeable, agrupa links adentro de `children`.
    // TODO: borrar este ítem entero si tu dropdown no necesita submenús.
    {
      label: "Item 2 (grupo)",
      icon: Sparkles,
      requiereAuth: true,
      roles: ["admin"],
      children: [
        {
          label: "Sub-item 1",
          to: "/admin/mi-dominio/sub-item-1",
          requiereAuth: true,
          roles: ["admin"],
          icon: Sparkles,
        },
      ],
    },
  ],
};

// TODO: si el módulo también necesita links sueltos (fuera de un dropdown,
// como gymLinks en gym_dropdown.js), sumar acá:
// export const dominioLinks = [
//   { label: "Algo", to: "/algo", permisos: ["mi_dominio.ver"], icon: Sparkles },
// ];
