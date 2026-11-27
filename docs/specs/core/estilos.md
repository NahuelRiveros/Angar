# Estilos de diseño (`EST`)

## Objetivo

Que un proyecto nuevo elija cómo se ve (minimalista, moderno o clásico) con una línea, y que todo el sistema
(tienda, panel, módulos y rubros) cambie a la vez, sin reescribir pantallas.

## Cómo funciona

- Cada estilo es un juego de **variables** (`core/estilos.js`, lo leen la web y los scripts):
  - colores de marca `--kt-*` (botón principal, compra, fondos, textos, bordes, acento);
  - grises `--color-neutral-50…950`: todos los `slate-*` y `gray-*` del código apuntan ahí;
  - esquinas `--radius-lg/xl/2xl/3xl` (las de `rounded-xl`, `rounded-2xl`…);
  - sombras `--shadow-sm` y `--shadow-lg`;
  - tipografías (`--kt-font-display`, `--kt-font-body`, `--font-sans`), libres de Google Fonts. Solo se descargan
    las del estilo elegido.
- El proyecto lo elige en `frontend/src/proyecto/config/theme_config.js` (`export const estilo = "moderno";`) o al
  crearlo: `node scripts/nuevo_proyecto.mjs --tipo ecommerce --estilo moderno` (`--estilos` los lista).
- Encima del estilo se aplican los colores propios del cliente (`themeConfig`) y sus tipografías
  (`brandConfig.fuentes`), si las tiene: el estilo es el punto de partida, la marca manda.
- Sin `estilo` (o `null`), todo queda como siempre: los proyectos de antes no cambian.

| Estilo | Idea | Tipografías |
| --- | --- | --- |
| `minimalista` | Blanco y negro, mucho aire, esquinas apenas redondeadas y casi sin sombras. | Inter |
| `moderno` | Color vivo (índigo, cian, fucsia para comprar), esquinas bien redondeadas, sombras suaves. | Manrope |
| `clasico` | Títulos con serifa, tonos sobrios (azul marino, bordó y dorado), fondos crema, bordes finos. | Playfair Display y Source Sans 3 |

Toman principios de sistemas de diseño públicos (contraste, jerarquía, espacio, tamaños para el dedo), nunca la
marca de una empresa: ni logos, ni colores exactos de marca, ni tipografías propietarias.

## Reglas

Tests: `estilos.test.mjs`.

| Código | Regla | Estado |
| --- | --- | --- |
| EST-01 | Los tres estilos definen las mismas variables, y sus tipografías se cargan de Google Fonts. | ✅ |
| EST-02 | Cada estilo cumple contraste WCAG AA: texto blanco sobre botones (también al pasar el mouse), texto secundario y grises de texto chico, 4,5:1; texto principal sobre fondo, 7:1. | ✅ |
| EST-03 | Sin `estilo`, el aspecto es el de siempre (los proyectos actuales no cambian). | ✅ capturas comparadas |
| EST-04 | Un estilo que no existe se avisa en la consola y no rompe la página; `nuevo_proyecto.mjs --estilo` lo rechaza. | ✅ |
| EST-05 | Un estilo nuevo se agrega en `estilos.js` con las mismas variables; el test controla que estén todas y que se lea bien. | ✅ |
