# CoreSistem

Base para sistemas web de gestión: ingreso, personal, roles y permisos, panel de gestión,
suscripción, carrito y catálogo genéricos, importación de planillas, facturación (ARCA) y
pruebas. Cada proyecto nuevo suma su **rubro** (el negocio) y su **configuración de cliente**.

JavaScript (ESM) en todo el sistema, nunca TypeScript. Frontend: React, Vite, Tailwind, TanStack Query.
Servidor: Node, Express, Sequelize y PostgreSQL.

## Las partes

| Carpeta | Qué tiene | ¿Se toca en un proyecto nuevo? |
| --- | --- | --- |
| `core/`, `frontend/src/core/`, `servidor/src/core/` | Todo lo reutilizable: componentes, hooks, APIs, sesión, permisos, panel, servicios, modelos, middleware | No. Se mejora acá y se sube al repo del core |
| `proyecto/`, `frontend/src/proyecto/`, `servidor/src/proyecto/` | Lo de cada cliente: nombre, logos, colores, textos, URLs, datos fiscales y qué rubros tiene | Sí, es lo único que se completa |
| `…/core/opcionales/<modulo>/` | Módulos que vienen apagados (catálogo, pedidos, turnos…) y cada proyecto prende en `proyecto/gate_config.js` ([spec](docs/specs/core/modulos.md)) | No. Solo se prenden o apagan |
| `frontend/src/modules/<rubro>/`, `servidor/src/modulos/<rubro>/`, `rubros/<rubro>/` | El negocio (ej. distribuidora: pedidos, cobros, catálogo) | Se crea el del proyecto copiando los moldes `frontend/src/core/modules/_scaffold/` y `servidor/src/core/{routes,controllers,services,models}/_scaffold/` |

Regla: **el core nunca importa un rubro** (lo controla un test, COR-01). Recibe los rubros por los
registros de `proyecto/` (`modulos_activos.js`, `pantallas_modulos.jsx`, `modulos.js`, `gate_config.js`).

## Arrancar un proyecto nuevo

1. Crear en GitHub el repo vacío del proyecto y clonar este (CoreSistem) en una carpeta nueva.
2. `node scripts/nuevo_proyecto.mjs --tipo <tipo> --repo <url del repo del proyecto>`: copia `plantilla_proyecto/`
   a su lugar sin pisar nada y prende los módulos de ese tipo. `--tipos` los muestra; `--con stock` suma un módulo.
   `--estilo minimalista|moderno|clasico` elige el diseño ([spec](docs/specs/core/estilos.md)); `--estilos` los muestra.
   `--repo` deja los push apuntando al repo del proyecto (no al core), arma `.git-core` para traer mejoras del
   core y prende el control de `.githooks`. Después, el primer `git push -u origin main` va al proyecto.
3. Buscar `[COMPLETAR]` y llenar los datos del cliente (marca, colores, URLs, `.env`).
4. `npm --prefix frontend ci` y `npm --prefix servidor ci`.
5. Copiar `servidor/.env.local.example` a `servidor/.env.local` y `frontend/.env.local.example` a
   `frontend/.env.local`, con una base PostgreSQL local.
6. `node scripts/verificar.mjs`: tests, lint y build.

## Mejorar el core en este repo

Se clona, se corre `node scripts/nuevo_proyecto.mjs` para tener un `proyecto/` de prueba y se trabaja
como en cualquier repo (`git commit` y `git push`). Para que las carpetas `proyecto/` de prueba nunca
se suban, anotarlas una vez en `.git/info/exclude`: `/proyecto/`, `/frontend/src/proyecto/`,
`/servidor/src/proyecto/`, `/frontend/index.html` y `/frontend/public/`.

## Sincronizar el core con un proyecto

El proyecto tiene un segundo repositorio git en `.git-core/` que apunta a este repo. `core_lista.txt` dice
qué archivos son del core. Solo viajan archivos ya commiteados, y nunca `proyecto/`, los rubros ni los `.env`.

- **Del proyecto al core:** `node scripts/core_subir.mjs` muestra qué cambió; `--subir` lo sube.
- **Del core al proyecto:** `node scripts/core_traer.mjs` muestra qué hay nuevo en este repo; `--traer` lo
  aplica a los archivos del proyecto (después: `node scripts/verificar.mjs` y commitear en el proyecto).
  Si los dos lados cambiaron la misma línea, quedan marcas `<<<<<<<`/`>>>>>>>`: elegir qué queda y correr
  `node scripts/core_traer.mjs --terminar`.
- Si el core tiene mejoras que el proyecto no trajo, `core_subir` avisa y pide traerlas primero.
- **¿Cómo está cada proyecto?** `node scripts/core_estado.mjs` revisa las carpetas de al lado y dice, sin tocar
  nada, cuál está al día, a cuál le faltan mejoras y cuál tiene cambios del core sin subir.
- Los `package.json` son de cada proyecto (COR-22): no se suben ni se traen. Un test avisa si el core usa una
  librería que el proyecto no tiene.
- En GitHub (`.github/workflows/verificar.yml`), el repo del core se prueba con un proyecto de prueba
  `distribuidora`: cada cambio del core prueba también catálogo, stock y pedidos.
