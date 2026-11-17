# Módulo: panel de gestión (`PAN`)

## Objetivo

Un lugar único, separado de la tienda, donde el equipo encuentra todo lo que su rol le permite
gestionar, sin ver lo que no le corresponde, en computadora y en celular.

## Alcance

- **Incluye:** quién entra al panel (`/panel`), el menú lateral, la pantalla de inicio y qué pasa
  al intentar abrir una pantalla sin permiso.
- **No incluye:** qué permisos existen y quién los tiene ([permisos.md](permisos.md)), qué muestra el
  resumen del negocio (spec de cada rubro), ni la suscripción del Administrador del sistema (spec de sistema).

## Actores

| Quién | Qué ve |
| --- | --- |
| Administrador del sistema | Todo el panel, incluido el grupo "Configuración". |
| Admin | Todos los grupos salvo "Sistema". |
| Supervisor, vendedor y roles creados en el panel | Solo los ítems de sus permisos. |
| Cliente | Nada: no tiene panel. |

## Menú

| Grupo | Ítems | Quién lo ve |
| --- | --- | --- |
| Inicio | Inicio | Quien entra al panel |
| Distribuidora | Los de la gestión del rubro (artículos, precios, pedidos…) | Según cada permiso (spec del rubro) |
| Gestión | Personal · Roles y permisos · Banners y promociones | `usuarios.gestionar` · `permisos.gestionar` · `contenido.editar` |
| Configuración | Suscripción del sistema | Solo el Administrador del sistema |

## Reglas

### Entrar al panel

| Código | Regla | Estado |
| --- | --- | --- |
| PAN-01 | Entra al panel quien puede ver al menos una de sus pantallas. Solo a esas personas les aparece "Panel de gestión" en el menú de la tienda. | ✅ `ux_rules.test.mjs` › "panel de gestión: cada uno ve las secciones de sus permisos y el cliente no entra"; `storefront.spec.js` › "supervisor entra al panel desde el navbar…" |
| PAN-02 | Un cliente no ve el enlace y, si escribe la dirección `/panel`, no entra. | ✅ `storefront.spec.js` › "vendedor ve solo pedidos; cliente no tiene panel…" |
| PAN-03 | Sin sesión, cualquier pantalla del panel lleva a ingresar y, después, vuelve a esa pantalla (USU-08). | ✅ `ux_rules.test.mjs` › "redirecciones internas conservan filtros…" (la redirección desde el panel: ⚠️) |
| PAN-04 | Quien abre una pantalla del panel sin el permiso que pide, pero tiene panel, va al inicio del panel con el aviso "No tenés permiso para ver esa pantalla". Quien no tiene panel (un cliente) va a la portada de la tienda. | ✅ `storefront.spec.js` › "PAN-04: sin permiso para una pantalla, quien tiene panel va al inicio con un aviso; el cliente, a la portada" |

### Menú

| Código | Regla | Estado |
| --- | --- | --- |
| PAN-10 | El menú muestra solo los ítems que el rol permite; un grupo que se queda sin ítems no aparece. | ✅ `ux_rules.test.mjs` › "panel de gestión: cada uno ve las secciones de sus permisos…"; `storefront.spec.js` › "vendedor ve solo pedidos…" |
| PAN-11 | Los ítems de un rubro aparecen solo si ese rubro está en `gate_config.js`; dentro, cada ítem se muestra según sus roles o permisos. | ✅ `ux_rules.test.mjs` › "PAN-11: navbar filtra árboles por rol, sin acoplarse a un rubro" |
| PAN-12 | Los grupos de cada rubro los aporta el rubro: el panel no conoce sus pantallas (sacar un rubro saca su grupo). | ✅ `ux_rules.test.mjs` › "panel de gestión…" (arma el menú desde los rubros activos) |
| PAN-13 | En computadora el menú se puede achicar a íconos, y ese navegador lo recuerda. | ⚠️ sin test |
| PAN-14 | En celular el menú se oculta y se abre con el botón ☰. | ✅ `storefront.spec.js` › "supervisor entra al panel desde el navbar…" (corre en escritorio, celular y celular chico) |
| PAN-15 | Al imprimir (por ejemplo, la lista de carga) el menú no sale en la hoja. | ⚠️ sin test |

### Inicio

| Código | Regla | Estado |
| --- | --- | --- |
| PAN-20 | El inicio saluda por el nombre, muestra el resumen del negocio de cada rubro activo y un acceso a cada pantalla permitida, agrupados como el menú. | ✅ `storefront.spec.js` › "supervisor entra al panel desde el navbar y ve dashboard y menú de su rol" |
| PAN-21 | Si el resumen no carga, se ofrece reintentar y el resto del inicio sigue funcionando. | ✅ `storefront.spec.js` › "vendedor ve solo pedidos; cliente no tiene panel; error del resumen ofrece reintentar" |
| PAN-22 | Lo que muestra el resumen depende del rol y lo filtra el servidor (por ejemplo, las ventas solo con "Ver ventas y saldos"). El detalle de la distribuidora está en [pedidos.md](../eccomerce_distribuidora/pedidos.md) (PED-70 a PED-74). | ✅ `checkout.integration.mjs` › "panel: resumen por rol, ventas en hora de Argentina…" |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Grupos e ítems del menú | `frontend/src/core/config/navbar_config/panel_gestion.js` (core) y `menu.panel` del `modulo.js` de cada rubro | ver tabla "Menú" |
| Menú achicado | Navegador (`localStorage` › `panel_menu_achicado`) | — |

## Dónde está el código

- Frontend: `controls/layout/panel/` (marco, menú, usuario), `config/navbar_config/panel_gestion.js`
  (grupos y quién entra), `app/routes/panel.routes.jsx`, `modules/panel/panel_inicio_page.jsx`;
  protección de pantallas en `controls/acceso/protected_route.jsx`.
- Servidor: no tiene rutas propias; cada pantalla usa las de su módulo, con su permiso.

## Decisiones

| Fecha | Regla | Decisión | Quién |
| --- | --- | --- | --- |
| 2026-11-08 | PAN-04 | Al inicio del panel con el aviso; el cliente sigue yendo a la portada. Se descartaron dejarlo como estaba y mostrar el aviso en el lugar de la pantalla. | Dueño del proyecto |

## Preguntas abiertas

Ninguna.
