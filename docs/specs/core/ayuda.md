# Módulo: Ayuda del panel (`AYU`)

## Objetivo

Que quien usa el panel entienda qué hace cada función y cómo se hace, con guías cortas en lenguaje simple, sin
preguntarle al programador, y viendo solo la ayuda de lo que su rol puede usar.

## Alcance

- **Incluye:** la pantalla `/panel/ayuda` (lista, buscador y cada tema en su dirección), el ítem del menú, el botón "?"
  de las pantallas y la regla de quién ve cada tema.
- **No incluye:** el contenido de cada rubro (lo escribe el rubro en su `ayuda/temas.js`), ayuda para clientes de la tienda.

## Actores

| Quién | Qué ve |
| --- | --- |
| Quien entra al panel (super admin, admin, encargado, vendedor, roles con algún permiso del panel) | El ítem "Ayuda" y los temas de las funciones que puede usar. |
| Cliente | Nada. |

## Reglas

Tests: `servidor/tests/ayuda.test.mjs` (AYU-01, AYU-02, AYU-04, AYU-07, AYU-08), `ux_rules.test.mjs` › "panel de gestión…"
(AYU-01) y `storefront.spec.js` › "AYU-01 a AYU-06…" y "AYU-05…" (pantalla, buscador, tema, botón "?", celular).

| Código | Regla | Estado |
| --- | --- | --- |
| AYU-01 | El ítem "Ayuda" va al final del menú del panel y lo ve solo quien entra al panel (`accesoPanel`); un cliente no la ve ni entra a `/panel/ayuda`. | ✅ |
| AYU-02 | Temas agrupados y buscador que filtra por título y contenido mientras se escribe, sin acentos ni mayúsculas; sin resultados lo avisa y deja la lista completa. | ✅ |
| AYU-03 | Cada tema es una guía para alguien que nunca usó el sistema: para qué sirve, qué ve en la pantalla, paso a paso con los nombres reales de los botones, ejemplo con números, consejos, errores comunes con su solución y "Relacionado". Hay guías de inicio para todos ("Empezá acá", "Tu día a día" por puesto y un glosario), y la portada invita a empezar por "Empezá acá". | ✅ |
| AYU-04 | Cada uno ve solo la ayuda de lo que puede usar, con la regla del menú (`itemVisible`): lista, buscador, secciones dentro del tema, "Relacionado", dirección directa ("Esta ayuda es para otra función del panel") y botón "?". Un tema de una pantalla que la instalación no tiene no se muestra. | ✅ |
| AYU-05 | Las pantallas principales tienen un "?" junto al título que abre su tema. | ✅ |
| AYU-06 | Cada tema tiene su dirección `/panel/ayuda/<tema>` para compartirlo. | ✅ |
| AYU-07 | Los temas viven en el código, no en la base: los del core en `core/modules/ayuda/temas_core.js`, los de cada rubro en su `modulo.js` › `ayuda`. | ✅ |
| AYU-08 | Cada tema cita las reglas que explica; un test comprueba que existan en las specs, que el tema esté completo y que su pantalla esté en el menú. | ✅ |
| AYU-09 | Se lee bien en celular y con teclado, y carga sin esperar al servidor. | ✅ |

## Dónde está el código

- Core: `frontend/src/core/modules/ayuda/` (`ayuda_temas.js` reglas puras, `registro_ayuda.js`, `ayuda_page.jsx`,
  `boton_ayuda.jsx`, `use_temas_ayuda.js`, `temas_core.js`); ítem en `core/config/navbar_config/panel_gestion.js`.
- Rubro: `frontend/src/modules/eccomerce_distribuidora/ayuda/temas.js`.

## Decisiones

| Fecha | Regla | Decisión | Quién |
| --- | --- | --- | --- |
| 2026-11-20 | AYU-01, AYU-04 | Ayuda solo para quien entra al panel, y cada uno ve solo la de sus funciones ([cambio](../cambios/2026-11-ayuda-panel.md)). | Dueño del proyecto |

## Preguntas abiertas

Ninguna.
