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
- Suscripción **por organizador**. Hoy se cobra **por transferencia**: el organizador sube el
  comprobante y el equipo lo aprueba o rechaza en `/admin/suscripciones`. MercadoPago está
  programado pero apagado (`cobro_config.js`). También hay extensión manual desde el panel. Prueba gratis de 14 días, una sola vez por cuenta. Cada pago suma
  30 días al vencimiento (o desde hoy si ya venció). Aviso 7 días antes; sin días de gracia.
  Vencida = solo lectura (ve sus torneos, no crea ni edita, tampoco carga resultados de un torneo
  en curso); la vista pública del torneo sigue andando.
- Al registrarse todos son `jugador`; el rol `organizador` se suma al empezar a organizar.
- Zonas configurables por categoría (3 a 5 parejas, clasifican 1 o 2; la llave cruza
  zonas: 1ºA vs 2ºB). Formato de partido de zona: un set a 6, un set a 9, mejor de 3 o mejor
  de 3 con super tie-break (se copia al partido al crearlo).
- Inscripción por dos vías: el jugador con cuenta se anota online (queda pendiente hasta que
  el organizador la confirma o rechaza con motivo) y el organizador carga parejas a mano
  (entran confirmadas). Una inscripción viva por jugador y categoría; el cupo cuenta confirmadas.
- Zonas: sorteo automático con cabezas de serie separadas (azar criptográfico) y ajuste a mano;
  nunca una zona de 2 (salvo que haya solo 2 parejas). El cupo se elige de una lista de cantidades
  que dan zonas iguales (u "Otro número", con aviso de zonas desparejas); si al sortear las
  confirmadas no dan zonas iguales, se avisa y se deja sortear igual. Rearmar o mover solo sin resultados.
- Tabla: ganados → dif. de sets → dif. de games → entre ellas (empate de dos) → games a favor →
  sorteo (número al azar guardado en `inscripcion.sorteo` al entrar en una zona; la tabla marca
  `desempate`). El super tie-break cuenta como un set y un game.
- Llave sin pases: si sobran lugares, los completan los mejores del puesto siguiente (terceros, o
  segundos si clasifica 1) por promedio por partido (ganados, sets, games, games a favor, sorteo); si
  no alcanzan, pases. La lista de cupo marca con ★ los cupos de llave justa.
- Llave: se arma con las zonas terminadas y el torneo en juego. Los 1º de zona son cabezas en
  orden (A, B…), después los 2º y los mejores terceros; si quedan pases, son de los 1º. Nadie cruza
  en primera ronda a alguien de su zona y, si se puede, el 2º queda en la otra mitad. Sin partido por el 3º: los semifinalistas lo comparten.
  Con llave armada las zonas quedan cerradas; para corregirlas se deshace la llave (solo sin
  resultados de llave). Corregir un partido cuyo siguiente ya se jugó y cambia el ganador: se frena.
- El precio del mes es configurable por variable de entorno; el valor del ejemplo no es real.
- Jugadores: cada cuenta tiene un código público (`MP-XXXXX`). Al anotarse, el compañero va por
  nombre (sin cuenta) o se lo invita por su código: la inscripción queda "esperando" hasta que
  acepta (si rechaza, se cancela) y el organizador confirma recién después. El historial
  (torneos, títulos, mejor puesto) es público y solo deportivo, en participantes y perfiles.

Plan por etapas (todas hechas): 1) limpieza de la base ✅ 2) suscripción por organizador ✅
3) torneos, categorías, reglas y premios ✅ 4) inscripciones y zonas ✅ 5) llaves y partidos ✅
6) vista pública del torneo ✅. Etapa 7 (perfil de jugador) en parte: código de jugador, invitar
al compañero, historial, participantes y perfiles hechos; faltan estrellas, foto y ranking.

- `client_config.js`: id de la instalación y políticas de acceso (registro público, contraseñas).
- `permisos_config.js`: permisos del **equipo de la plataforma** (`suscripciones.ver`,
  `contenido.editar`, `usuarios.gestionar`…), sus grupos, dependencias (`requiere`) y los roles
  que los reciben al aparecer (`porDefecto`). Qué rol tiene cada permiso vive en la base
  (`rol_permiso`) y se edita en `/admin/permisos`. `admin` y `super_admin` tienen todos siempre.
  `organizador` y `jugador` son `rolesFuera`: no usan permisos; lo de un torneo lo autoriza
  ser su dueño y tener la suscripción vigente.
- `cobro_config.js`: medios de pago del plan (MercadoPago apagado), datos bancarios (hoy
  `[COMPLETAR]`: mientras falte alguno no se puede transferir) y reglas del comprobante.
- `torneo_config.js`: estados del torneo, transiciones, qué se edita en cada estado
  (`EDICION_POR_ESTADO`), niveles, ramas, puestos de premio y límites. Lo usan API e interfaz.
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
Precio: `PRECIO_SUSCRIPCION_MENSUAL`. Comprobantes de transferencia: archivo privado en Cloudinary
(`subirArchivoPrivado`), formato validado por contenido, se ven con enlace firmado de 5 minutos;
una sola transferencia pendiente por organizador; aprobar suma 30 días con la fila bloqueada.

Torneos (`/api/torneos`, pantallas `/mis-torneos` y `/mis-torneos/:id`): tablas `torneo`,
`torneo_categoria` y `torneo_premio`. Reglas puras en `services/torneos/torneo_reglas.js`; el
servicio verifica el dueño (ajeno = 404) y bloquea el torneo en cada escritura. Lecturas solo con
`requireAuth`; escrituras con `requireSuscripcionVigente`. Cada escritura devuelve el torneo
completo y el frontend lo guarda directo en la caché (`detalle/use_cambio_torneo.js`). Cada pestaña del
detalle abre con `detalle/guia_seccion.jsx` (qué se hace ahí y qué se puede según el estado, leído de
`EDICION_POR_ESTADO`/`PERMITIDO`); si cambia una regla, actualizar también esos textos.

Juego (etapa 4): tablas `inscripcion`, `zona` y `partido` (+ formato de zona en `torneo_categoria`).
Lógica pura en `services/torneos/zona_reglas.js` (marcadores, tamaños de zonas, sorteo, fixture
por fechas y tabla) e `inscripcion_reglas.js`; servicios `inscripcion_service.js`,
`zona_service.js` y `publico_service.js`. Cuándo se puede cada cosa: `PERMITIDO` de
`torneo_config.js`. Rutas: `/api/torneos/:id/inscripciones|categorias/:id/zonas|partidos/:id/resultado`
(organizador), `/api/inscripciones` (jugador) y `/api/publico/torneos` (sin cuenta, nunca borradores
ni teléfonos). Pantallas: pestañas Inscripciones y Zonas del detalle, `/torneos`, `/torneos/:id` y
`/mis-inscripciones`. Probar con `curl` desde Git Bash rompe la ñ (no manda UTF-8): usar Node o el navegador.

Llave (etapa 5): `partido` con fase "llave", `ronda` y `orden` (posición; define a qué partido
avanza el ganador) y parejas vacías hasta que se definen; `formato_llave` en la categoría.
Lógica pura en `services/torneos/llave_reglas.js` (siembra, pases, avance, podio) y base en
`llave_service.js`. El tamaño de zonas y de llave (`tamaniosDeZonas`, `potenciaDeDos`, `nombreRonda`,
`planDeLlave`, `zonasIguales`, `cuposConZonasIguales`) vive en `torneo_config.js` porque también lo muestra la interfaz
(`detalle/calculo_llave.jsx`: formulario y tarjeta de categoría, pestaña Zonas antes de sortear);
`zona_reglas`/`llave_reglas` lo reexportan y un test cruza el cálculo con el sorteo y la llave reales.
La clasificación (tablas + mejores terceros) sale de una sola función, `clasificacionDeCategoria`
(`zona_reglas.js`), que usan las zonas y la llave vía `clasificacionDe` (`llave_service.js`).
Modelos de reglamento editables: `detalle/reglamentos_modelo.js` (el de zonas y llave se arma con las categorías). El resultado de cualquier partido va por `PUT /partidos/:id/resultado`, que
responde las zonas o la llave según la fase (`fase` en la respuesta). Día, hora y cancha (opcionales) van por
`PUT /partidos/:id/programacion` (`PERMITIDO.programarPartidos`: inscripción o en juego); rearmar zonas los borra. Pestaña Llave en el detalle.

Cobro de la inscripción (por torneo): `torneo.monto_inscripcion` (general) y `cobro_titular|banco|cbu|alias`
(públicos en la ficha), `torneo_categoria.monto_inscripcion` (por pareja; null = no cobra por MiPadel) e
`inscripcion.pago_*` (estado null | en_revision | aprobado | rechazado, comprobante privado en Cloudinary).
La pareja manda el comprobante (`POST /api/inscripciones/:id/comprobante`, reglas en `motivoParaNoSubirComprobante`);
el organizador lo ve con enlace firmado y lo aprueba (confirma con el cupo controlado) o lo rechaza con motivo
(`/api/torneos/:id/inscripciones/:id/pago/aprobar|rechazar`). Confirmar sin comprobante (efectivo) sigue andando.

Avisos por correo (`services/common/avisos_service.js`, textos en `avisos_reglas.js`): a `SUPERADMIN_EMAIL`
cuando alguien activa por primera vez su cuenta de organizador y cuando manda el comprobante del plan; al organizador
del torneo con cada inscripción online nueva y cada comprobante de inscripción. Se mandan en segundo plano después de
guardar (un error del correo nunca rompe la acción), nunca a dominios de prueba (`@example.test`…) y se apagan con
`AVISOS_POR_CORREO=no` (los tests de integración y la demo lo hacen solos).
Al anotarse en una categoría que cobra, la ficha pública lleva a `/mis-inscripciones?pagar=<id>&nueva=1` (pago destacado).
Campanita de la barra (`modules/torneos/campana_avisos.jsx`, en `navbar_config.extras`): invitaciones sin responder y
comprobantes por mandar o rechazados (`avisos_inscripciones.js`, mismas reglas que el servidor), con la misma consulta
de Mis inscripciones (`use_mis_inscripciones.js`, 5 min en caché, sin polling).
Mis inscripciones: pestañas Activas / Jugadas / Bajas (`?ver=`), lo que pide acción primero y un "próximo paso"
por tarjeta (`secciones_inscripciones.js`).

Usuarios registrados (inicio del panel, solo `super_admin` con `requireRole`): `GET /api/admin/registrados`
(`registrados_service.js`): totales (todos, 7 y 30 días) y los últimos con nombre y fecha, sin contacto ni cuentas de prueba.

Demo: `servidor/scripts/demo_torneos.mjs` crea con los servicios dos torneos de la cuenta "Organización Demo"
(`@example.test`, contraseña al azar): uno finalizado y otro en juego (mixto en llave, caballeros en zonas, Suma 9
con zonas terminadas). Solo toca torneos de esa cuenta con la marca `DEMO:` en la descripción.

Lista pública `/torneos`: `GET /api/publico/torneos?q&estado&rama&nivel` (filtros con allowlist en
`publico_reglas.js`; rama/nivel = alguna categoría que lo juegue) trae por torneo categorías, formato, parejas,
lugares libres y premio del campeón en dos consultas por página; los filtros viven en la URL (`tarjeta_torneo.jsx`).

Vista pública (etapa 6): `GET /api/publico/torneos/:id/categorias/:categoriaId` devuelve zonas
(tabla, fixture, resultados) y llave con podio, solo con nombres de parejas, para torneos en
inscripción, en juego o finalizados. Cache-Control de 30 s y botón "Actualizar": sin consultas
automáticas (Neon cobra mientras está despierta). En `/torneos/:id`: `ResultadosPublicos` y
`BotonCompartir` (menú del sistema en celular; en la compu copia el link).

Jugadores (etapa 7, parte): `usuario.codigo_jugador` (lo pone un hook al crear; el arranque completa
las cuentas viejas con `asignarCodigosFaltantes`) e `inscripcion.usuario2_id` (compañero invitado).
Índices únicos parciales impiden estar dos veces vivo en una categoría como titular o invitado; el
cruce (titular en una e invitado en otra) lo frena `yaAnotado` con la categoría bloqueada. Historial:
`services/jugadores/jugador_service.js` (`participacionesDe` trae a varios jugadores en una sola
consulta) y `jugador_reglas.js` (puesto alcanzado por ronda de llave; etiquetas `PUESTOS_ALCANZADOS`
en `torneo_config.js`). Rutas: `/api/jugadores/yo`, `/api/jugadores/:codigo` (público),
`/api/publico/torneos/:id/participantes`, `POST /api/inscripciones/:id/invitacion`. Pantallas:
`/mi-perfil`, `/jugadores/:codigo` y la sección Participantes de `/torneos/:id`. El registro sin
`returnTo` termina en `/mi-perfil?bienvenida=1`; Mi perfil muestra `suscripcion/tarjeta_organizador.jsx`
(invita a organizar o resume el plan; la activación sigue siendo automática en `/mi-suscripcion`).

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
| Integración (PostgreSQL local: suscripción y torneos) | `npm --prefix servidor run test:integration` |
| Navegador | `npm --prefix frontend run test:e2e` |
| Revisar los `.env` (solo nombres, sin valores) | `npm --prefix servidor run env:verificar` (lo corre el usuario; lee sus `.env`) |
| Torneos demo (también en producción, pide `--confirmo`) | `npm --prefix servidor run demo -- --ver` · `--crear --confirmo` · `--borrar --confirmo` |

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
- Variables de entorno: `.env.example` simple (una línea de comentario con qué es, de dónde sale y
  [RENDER]/[PC], y la variable), en orden alfabético como el panel de Render. Esquema y SSL: `BD_ESQUEMA`
  y `BD_SSL` (`DB_SCHEMA`/`DB_SSL` se leen como respaldo). Al agregar una variable: sumarla al
  `.env.example` con ese formato y `env:verificar` la controla.
  Esquemas: `mipadel` en producción y `mipadel_test` (predeterminado) para pruebas; solo minúsculas.
  Nunca apuntar a `gc_dist`/`gc_dist_test` (son de DistribuCG).
- Base local de desarrollo: PostgreSQL 17 en `localhost`, base `mipadel` (la de DistribuCG es
  `Distribuidora`: no usarla). El `.env` local deja `BD_URL` vacía y usa `DB_*`.
- `servidor/tests/ux_rules.test.mjs` prueba reglas sin conexión a la base.
- `suscripcion`, `torneo`, `juego`, `llave` y `jugadores` `.integration.mjs` solo corren contra `localhost` (si `BD_URL` está cargada, se saltea),
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
