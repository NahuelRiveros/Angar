# Cambio: un core para varios proyectos (DistribuCG, Stilos y MiPadel)

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| Hecha | Dueño | 2026-11-17 / 18 | [core/sistema.md](../core/sistema.md), [core/permisos.md](../core/permisos.md), [core/usuarios.md](../core/usuarios.md) |

## Por qué

El core nació de DistribuCG y lo usaba también Stilos. MiPadel, del mismo origen, había quedado aparte y cada mejora
del esqueleto se hacía dos veces. El dueño pidió: el mismo core en los tres proyectos, la misma estructura de carpetas,
el diseño del marco de MiPadel para todos y un home distinto en cada proyecto.

## Requisitos

| Código | Requisito | Estado |
| --- | --- | --- |
| SIS-53 | El home es de cada proyecto: la portada es `frontend/src/proyecto/inicio.jsx`; el core no trae uno. La plantilla trae un home de tienda como punto de partida. | ✅ `core_estructura.test.mjs` |
| SIS-54 | Barra y menú de celular con el diseño de MiPadel; frases (`menuMovil`), logo (`simbolo-y-texto`) y colores son de cada proyecto. "Ver tienda" o "Ver sitio" según haya tienda. | ⚠️ capturas |
| SIS-55 | Al imprimir solo sale el contenido (sin cinta, barra, avisos ni pie). | ⚠️ |
| SIS-56 | `suscripcionDelSoftware: false` en `proyecto/client_config.js` apaga la suscripción del software (bloqueo, rutas, plan inicial, aviso y pantallas). | ✅ `core_roles.test.mjs` |
| SIS-57 | Un rubro puede poner avisos para todo el sitio debajo de la barra (`avisosSitio`). | ⚠️ (pruebas del navegador de MiPadel) |
| PER-37 | Un rubro declara sus roles sin permisos del personal y el rol de quien se registra (`ROLES_DE_RUBROS` en `proyecto/permisos_rubros.js`). | ✅ `core_roles.test.mjs` |
| USU-43 | El rubro puede elegir a dónde va quien se registra (`registro.destino` en su `modulo.js`). | ⚠️ |

**Fuera de alcance:** que cada proyecto elija sus roles de equipo (el core sigue sembrando `supervisor` y `vendedor`).

## Diseño

- **Estructura igual en todos los proyectos:**
  - core: `core/`, `frontend/src/core/`, `servidor/src/core/` (se traen con `core_traer`, se suben con `core_subir`);
  - proyecto: `proyecto/`, `frontend/src/proyecto/` (marca, colores, `inicio.jsx`), `servidor/src/proyecto/`;
  - rubro: `frontend/src/modules/<rubro>/` (`modulo.js`, `modulo_pantallas.jsx`, `rutas.jsx`, `menu.js`),
    `servidor/src/modulos/<rubro>/` (`modulo.js`, `arranque.js`, models, routes, controllers, services) y, si hace falta,
    `rubros/<rubro>/` (configuración que comparten API e interfaz);
  - specs: `docs/specs/core/` y este README son del core; cada rubro tiene `docs/specs/<rubro>/README.md`.
- **Base de datos:** sin cambios en el core. Un rubro que necesita datos por usuario usa su propia tabla (ej. `jugador`
  en MiPadel), nunca columnas nuevas en `usuario`.
- **Versiones del kit (`controls`):** 2.1.0 (diseño), 2.2.0 (roles, registro, suscripción apagable), 2.3.0 (`avisosSitio`),
  3.0.0 (home por proyecto: hace falta `frontend/src/proyecto/inicio.jsx`).

## Conectar un proyecto existente al core (lo que se hizo con MiPadel)

1. Rama aparte. Copiar los archivos de CoreSistem tal cual y armar `.git-core/` apuntando a esa versión.
2. `node scripts/nuevo_proyecto.mjs` para crear `proyecto/` y completarlo (marca, colores, `inicio.jsx`, permisos del rubro).
3. Mover lo propio al rubro con `git mv` (conserva el historial) y borrar lo que el core ya trae; reescribir imports.
4. Ajustar al core: el registro lanza errores en vez de devolver `ok: false`, `useToast` está en `toast/use_toast.js`,
   las variables de entorno van con los nombres nuevos (ver `servidor/.env.produccion.example`).
5. Unitarios, integración, navegador y capturas en verde antes de pasar a `main`.

## Riesgos

- `sync({ alter: true })` borra columnas que el modelo del core no tiene: lo que un proyecto agregó a una tabla del core
  hay que copiarlo **antes** de conectarlo (en MiPadel no había datos reales y los códigos de jugador se generaron de nuevo).
- `.claude/settings.json` y este README son del core: si se cambian en un proyecto, `core_traer` no mezcla hasta commitearlos.
