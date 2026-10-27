# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MiPadel

Guía de trabajo para Claude Code en este repositorio. Las instrucciones explícitas
del usuario tienen prioridad; no volver a pedir una autorización ya otorgada.

## Proyecto y fuentes de verdad

Sistema web (SaaS) para organizar torneos de pádel. Un organizador paga una suscripción
mensual y gestiona sus torneos: categorías, reglas, premios, inscripción de parejas,
zonas (grupos), llaves eliminatorias y partidos. Los jugadores tienen cuenta gratis.

Nació de la base de DistribuCG (una distribuidora): se conservaron usuarios, registro,
login con Google, recuperación de contraseña, roles y permisos, panel de gestión, home
configurable, cinta de anuncios, ubicación, subida de imágenes y la suscripción con
MercadoPago. Distribuidora, indumentaria, stock, ARCA y el sistema de módulos de negocio
(`gate_config.js`, `modulo_negocio`) se eliminaron: no volver a agregarlos.

Decisiones de negocio ya tomadas (no inventar otras; preguntar lo que falte):
- Suscripción **por organizador**: MercadoPago automático y también extensión manual desde el
  panel (`/admin/suscripciones`). Prueba gratis de 14 días, una sola vez por cuenta. Cada pago suma
  30 días al vencimiento (o desde hoy si ya venció). Aviso 7 días antes; sin días de gracia.
  Vencida = solo lectura (ve sus torneos, no crea ni edita, tampoco carga resultados de un torneo
  en curso); la vista pública del torneo sigue andando.
- Al registrarse todos son `jugador`; el rol `organizador` se suma al empezar a organizar.
- Zonas configurables por torneo (parejas por zona, cuántas clasifican; la llave cruza
  zonas: 1ºA vs 2ºB). Formato de partido configurable (mejor de 3, super tie-break, set único).
- El precio del mes es configurable por variable de entorno; el valor del ejemplo no es real.

Plan por etapas: 1) limpieza de la base ✅ 2) suscripción por organizador ✅
3) torneos, categorías, reglas y premios 4) inscripciones y zonas 5) llaves y partidos
6) vista pública del torneo.

- `client_config.js`: id de la instalación y políticas de acceso (registro público, contraseñas).
- `permisos_config.js`: permisos del **equipo de la plataforma** (`suscripciones.ver`,
  `contenido.editar`, `usuarios.gestionar`…), sus grupos, dependencias (`requiere`) y los roles
  que los reciben al aparecer (`porDefecto`). Qué rol tiene cada permiso vive en la base
  (`rol_permiso`) y se edita en `/admin/permisos`. `admin` y `super_admin` tienen todos siempre.
  `organizador` y `jugador` son `rolesFuera`: no usan permisos; lo de un torneo lo autoriza
  ser su dueño y tener la suscripción vigente.
- `deployment_config.js`: direcciones públicas de Render/Vercel (hoy de EJEMPLO).
- `frontend/src/config/`: marca, tema, navegación y textos del home.
- Ante diferencias entre comentarios y código, comprobar rutas, servicios y tests antes de concluir.

## Stack y estructura

JavaScript ESM y JSX; no introducir TypeScript. React 19, Vite, Tailwind 4,
React Router, TanStack Query, axios, React Hook Form y Zod en el frontend.
Express 5, Sequelize 6 y PostgreSQL en el servidor. Zod no está instalado en el backend.

```text
frontend/src/
  app/router.jsx, app/routes/       rutas (sitio y panel)
  auth/                            sesión
  api/                             cliente HTTP y APIs comunes
  controls/                        controles compartidos, layout, acceso
  controls/layout/panel/           marco del panel de gestión (/panel): menú lateral por rol
  controls/ui/                     campos, modal, data_grid, confirm_dialog
  modules/                         pantallas por área (home, usuarios, panel; torneos a crear)
  hooks/                           hooks compartidos
  config/                          configuración visual y funcional
servidor/src/
  app.js, server.js                app y arranque con bootstrap/seed
  routes/ -> controllers/ -> services/  capas agrupadas por dominio
  services/common/                reglas compartidas y utilidades
  models/                         modelos y relaciones (models/index.js)
  database/                       conexión, bootstrap y seeds
  middleware/                     autenticación, permisos y suscripción
  configuracion_servidor/env.js    configuración de entorno
servidor/tests/                    node:test sin base de datos
frontend/tests/browser/           Playwright con API simulada (hoy sin specs)
```

Dos marcos en `app/router.jsx`: el sitio (`AppLayout`, navbar y footer) y el panel de gestión
(`PanelLayout`). Lo del equipo va en `app/routes/panel.routes.jsx` y su menú se arma en
`config/navbar_config/panel_gestion.js` reutilizando los ítems (roles y permisos) de cada dropdown.

Suscripción: tablas `suscripcion` (una por organizador) y `pago_suscripcion` (pagos de
MercadoPago, extensiones manuales y ajustes). Reglas puras en
`services/suscripciones/suscripcion_reglas.js` (fechas `YYYY-MM-DD` en hora argentina; rige mientras
hoy <= vencimiento); base de datos en `suscripcion_service.js`. El webhook consulta el pago a
MercadoPago y es idempotente por `mp_payment_id` (fila bloqueada en la transacción). Toda ruta que
crea o edita algo de un organizador lleva `requireAuth, requireSuscripcionVigente`
(`middleware/suscripcion_middleware.js`: 403 sin plan, 402 vencido; los GET no lo llevan).
Precio: `PRECIO_SUSCRIPCION_MENSUAL` (0 = pago online deshabilitado).

## Comandos reales (desde la raíz)

No hay package.json raíz ni workspaces; cada paquete instala sus dependencias.

| Acción | Comando |
| --- | --- |
| Instalar frontend | `npm --prefix frontend ci` |
| Instalar servidor | `npm --prefix servidor ci` |
| Frontend local | `npm --prefix frontend run dev` |
| Servidor local | `npm --prefix servidor run dev` (ver protección de base) |
| Lint del frontend | `npm --prefix frontend run lint` |
| Build del frontend | `npm --prefix frontend run build` |
| Reglas unitarias | `npm --prefix servidor test` |
| Integración (PostgreSQL local) | `npm --prefix servidor run test:integration` |
| Navegador | `npm --prefix frontend run test:e2e` |
| Revisar los `.env` (solo nombres, sin valores) | `npm --prefix servidor run env:verificar` (lo corre el usuario; lee sus `.env`) |

Un solo test: `node --test --test-name-pattern="permisos" servidor/tests/ux_rules.test.mjs`;
en Playwright, `npm --prefix frontend run test:e2e -- --project=desktop -g "texto del test"`
(proyectos: `desktop`, `mobile`, `small-mobile`).

No hay Vitest, MSW ni Supertest configurados, ni lint de backend.
No anunciar que se ejecutó una suite inexistente.
El script `test` apunta a archivos concretos: al agregar otro test,
actualizar el script o ejecutarlo explícitamente con `node --test`.

## Base de datos y pruebas

- Proteger los datos. No ejecutar migraciones, DDL, seeds, escrituras de prueba,
  scripts de mantenimiento ni sincronizaciones contra la base real como verificación.
- El arranque de `server.js` ejecuta bootstrap y seed; el bootstrap puede hacer
  `sync({ alter: true })`. Arrancar el backend no es una comprobación de solo lectura.
  Verificar un destino de desarrollo aislado antes de iniciarlo.
- Un cambio de esquema/modelos requiere una petición que lo incluya o una decisión explícita.
- La conexión está en `database/sequelize.js`; la URL sale de `BD_URL`.
  Esquemas: `mipadel` en producción y `mipadel_test` (predeterminado) para pruebas; solo minúsculas.
  Nunca apuntar a `gc_dist`/`gc_dist_test` (son de DistribuCG).
- Base local de desarrollo: PostgreSQL 17 en `localhost`, base `mipadel` (la de DistribuCG es
  `Distribuidora`: no usarla). El `.env` local deja `BD_URL` vacía y usa `DB_*`.
- `servidor/tests/ux_rules.test.mjs` prueba reglas sin conexión a la base.
- `suscripcion.integration.mjs` solo corre contra `localhost` (si `BD_URL` está cargada, se saltea),
  crea un schema `mipadel_it_<aleatorio>` y borra solo ese schema al terminar.
- Playwright levanta solo Vite en `127.0.0.1:4178` y simula la API; no necesita el backend.
- No enviar correos, procesar pagos externos ni subir archivos reales al ejecutar pruebas.

## Forma de trabajar

- Explicar en español simple el objetivo y, antes de tocar más de cinco archivos, el plan.
- Revisar `git status`, las instrucciones aplicables y las implementaciones cercanas.
  Respetar cambios del usuario, la rama actual y los worktrees existentes.
- Buscar primero controles, hooks, servicios y configuración reutilizables.
- Continuar autónomamente con el trabajo autorizado. Preguntar solo por decisiones de negocio
  que no se puedan resolver con el código/documentación o por acciones fuera de alcance.
- Cambios enfocados; no extender una tarea con refactors ajenos.
- No hacer commit, push o despliegue salvo instrucción explícita del usuario.
- Al cerrar: qué cambió, verificación real y limitaciones. No afirmar que pasó lo que no se ejecutó.

## Convenciones de implementación

- Archivos nuevos en snake_case; componentes en PascalCase; nombres del negocio en español.
  Conservar convenciones existentes cuando se amplía un archivo.
- `const`, `async/await`, `===`, `?.` y `??`; comentarios sobre decisiones, no sobre lo obvio.
- React: controles genéricos en `controls/`; pantallas y lógica del rubro en `modules/`.
  APIs con el cliente `api/http.js`; usar TanStack Query y los patrones existentes para datos.
- Hooks antes de returns condicionales. Cubrir carga, error recuperable, vacío y envío pendiente.
  Formularios con React Hook Form/Zod cuando corresponda; labels, teclado y tamaños móviles.
- Reutilizar los tokens de tema y configuración de marca; no cambiar la identidad por aplicar un skill.
- Servidor: rutas autorizan, controladores adaptan HTTP y servicios contienen negocio/SQL.
  Mantener los contratos existentes `{ ok, data, mensaje, codigo, ... }`.
  Los controladores actuales usan try/catch: no quitarlos sin verificar el manejo de errores.
- Validar body/query/params a mano (no hay Zod en el backend); no inventar `req.datos` ni middlewares.
  Usar allowlists de campos y parámetros SQL; no interpolar entradas del usuario.
- Pagos de suscripción, resultados que avanzan una llave y operaciones concurrentes:
  transacciones, locks e idempotencia (el webhook de MercadoPago puede repetirse).
- Autorización efectiva en servidor: dueño del torneo y suscripción vigente para organizadores;
  `requirePermiso(...)` (alcanza con uno) para el equipo; `requireRole` para `super_admin`.
  Un permiso nuevo se agrega en `permisos_config.js` y lo sincroniza el arranque (`sincronizarPermisos`).
- Para fechas de negocio usar explícitamente `America/Argentina/Buenos_Aires`.
- Neon/Supabase: evitar N+1, listas ilimitadas y polling sin necesidad.

## Secretos y permisos de Claude

No leer ni mostrar archivos .env reales, tokens, contraseñas o cadenas de conexión.
Consultar nombres y ejemplos sanitizados; `VITE_*` es público. No copiar permisos locales
de otro proyecto ni habilitar bypass de permisos. `.claude/settings.json` conserva permisos
existentes. Las reglas de herramientas complementan estas instrucciones; no garantizan
bloquear todos los comandos equivalentes de otras shells.

## Skills y revisión

Skills en `.claude/skills/`: `feature`, `api-endpoint`, `react-component`,
`crud-admin`, `auth-rbac`, `e2e-test`, `pre-pr`, `security-audit`, `perf-audit`,
`frontend-design`. Usar cada uno según el trabajo, no ejecutar auditorías completas
para cualquier cambio. El revisor `.claude/agents/code-reviewer.md` revisa en solo lectura
cuando se solicita una revisión independiente.

El skill frontend-design ya existía en `frontend/.agents/skills/frontend-design/`.
Su copia en `.claude/skills/` permite invocarlo desde Claude en la raíz; conservar la licencia
y mantener ambas copias iguales si se actualiza ese skill.

## Definición de terminado

Verificar lo afectado con los comandos disponibles y comunicar resultados reales.
Agregar pruebas para lógica de negocio nueva o corregida, con caso válido y error relevante.
No exigir tests nuevos para cambios puramente documentales o de configuración del agente.
Sin secretos, depuración accidental, archivos temporales o cambios de base no autorizados.
Actualizar estas instrucciones si cambian rutas, comandos o arquitectura.
