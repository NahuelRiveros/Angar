# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## DistribuCG

Guía de trabajo para Claude Code en este repositorio. Adaptada de `../dynamic-gym`
a la estructura y los comandos reales de DistribuCG. Las instrucciones explícitas
del usuario tienen prioridad; no volver a pedir una autorización ya otorgada.

## Proyecto y fuentes de verdad

Distribuidora con catálogo, presentaciones de productos, carrito invitado y de cuenta,
notas de pedido, cobros manuales e importación de productos.
El proyecto es solo distribuidora: gimnasio y kinesiología se eliminaron (código, seeds y
tablas). El bootstrap borra sus tablas viejas en cada arranque (`TABLAS_RETIRADAS` en
`database/bootstrap.js`); no volver a agregar código de esos rubros. Quedan, apagados,
`eccomerce_indumentaria` y `stock`: su presencia no significa que estén activos.

- `gate_config.js`: módulos de la instalación; solo `eccomerce_distribuidora` está activo.
  Frontend y servidor (`configuracion_servidor/gate_config.js`) re-exportan este mismo
  archivo. Decide qué tablas crea el bootstrap; no cambiarlo como un simple ajuste visual.
- `client_config.js`: cliente activo, acceso público y políticas del carrito.
- `order_config.js`: estados, transiciones, stock por estado y comprobantes de cobro.
- `permisos_config.js`: lista de permisos del personal (`pedidos.ver`, `cobros.gestionar`, `precios.editar`…),
  sus grupos, dependencias (`requiere`) y los roles que los reciben al aparecer (`porDefecto`). Qué rol tiene
  cada permiso vive en la base (`rol_permiso`) y se edita en `/admin/permisos`. `admin` y `super_admin` tienen
  todos siempre. El rol `staff` se renombró a `supervisor` (`renombrarStaffASupervisor` en `seed_rbac.js`).
- `catalog_import_config.js`: configuración compartida de importación.
- `fiscal_config.js`: condiciones frente al IVA, validación de CUIT/DNI, tipo de factura sugerida y la
  condición de la distribuidora (`emisor`, a completar). La facturación con ARCA está documentada, no programada:
  `docs/facturacion-arca.md`. Los precios guardados son FINALES (con IVA); `nota_pedido_item.iva_porcentaje` los desglosa.
- `unidades_config.js`: unidades de venta, bultos (equivalencia) y el cálculo de bultos/sueltos
  que usan la ficha del artículo, el catálogo y la lista de carga.
- `docs/distribuidora-pedidos.md`: contrato y reglas del pedido; leer para cambios de negocio.
- Catálogo en dos niveles (Familia › Categoría). Las marcas son tabla propia (`marca_distribuidora`)
  asociada a familias o categorías (`marca_categoria_distribuidora`); el artículo guarda `marca_id` y
  `producto_distribuidora.marca` es una copia del nombre que mantiene `marcas_distribuidora_service.js`
  (no escribirla a mano). El bootstrap migra marcas en texto viejas (`sincronizarMarcasLegado`).
- Precios: la "General" es `variedad.precio`/`precio_anterior`. Las listas regionales (`lista_precio*`) solo
  guardan excepciones por presentación y aplican por la localidad del perfil del cliente (una localidad, una
  lista). Todo precio que ve o paga un cliente pasa por `listas_precio_service.js` (catálogo, detalle,
  ofertas, carrito y pedido); la gestión ve la General. Oferta = `precio_anterior > precio` de su lista.
- `frontend/src/config/`: marca, tema, navegación, catálogo y textos.
- Ante diferencias entre comentarios y código, comprobar rutas, servicios y tests antes de concluir.

## Stack y estructura

JavaScript ESM y JSX; no introducir TypeScript. React 19, Vite, Tailwind 4,
React Router, TanStack Query, axios, React Hook Form y Zod en el frontend.
Express 5, Sequelize 6 y PostgreSQL en el servidor. Zod no está instalado en el backend.

```text
frontend/src/
  app/router.jsx, app/routes/       rutas por módulo
  auth/                            sesión y permisos de interfaz
  api/                             cliente HTTP y APIs comunes
  controls/                        controles compartidos, layout, carrito, pedidos
  controls/layout/panel/           marco del panel de gestión (/panel): menú lateral por rol
  controls/ui/                     campos, modal, data_grid, confirm_dialog
  modules/eccomerce_distribuidora/  pantallas y API de distribuidora
  hooks/                           hooks compartidos
  config/                          configuración visual y funcional
servidor/src/
  app.js, server.js                app y arranque con bootstrap/seed
  routes/ -> controllers/ -> services/  capas agrupadas por dominio
  services/common/                reglas compartidas y utilidades
  models/                         modelos y relaciones actuales
  database/                       conexión, bootstrap y seeds
  middleware/                     autenticación, roles y módulos
  validator/                      validadores manuales de body (sin Zod)
  configuracion_servidor/env.js    configuración de entorno
servidor/tests/                    node:test y PostgreSQL local
frontend/tests/browser/           Playwright con API simulada
```

Dos marcos en `app/router.jsx`: la tienda (`AppLayout`, navbar y footer) y el panel de gestión
(`PanelLayout`). Todo lo que maneja el personal va en `app/routes/panel.routes.jsx` y su menú se arma en
`config/navbar_config/panel_gestion.js` reutilizando los ítems (roles y `modulo`) de cada dropdown.
El resumen del inicio sale de `GET /api/distribuidora/panel/resumen`, filtrado por rol en el servidor.

No existen `servidor/src/nucleo/`, `models_v2/`, ni `frontend/src/components/ui/`
en esta instalación. No copiar imports o fixtures del gimnasio suponiendo que existen.
No trabajar sobre `proyecto_futuro/`, `sin_usar/` o scaffolds sin verificar sus consumidores.

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
| Integración PostgreSQL | `npm --prefix servidor run test:integration` |
| Navegador | `npm --prefix frontend run test:e2e` |
| Precios de demostración (escribe en la base del `.env`; nunca en `gc_dist`) | `npm --prefix servidor run seed:precios-demo` (lo corre el usuario). Con `CATALOGO_DEMO_AL_INICIAR=true` lo hace el arranque (`seed/catalogo_demo.js`) |
| Revisar los `.env` (solo nombres, sin valores) | `npm --prefix servidor run env:verificar` (lo corre el usuario; lee sus `.env`) |

Un solo test: `node --test --test-name-pattern="carrito" servidor/tests/ux_rules.test.mjs`;
en Playwright, `npm --prefix frontend run test:e2e -- --project=desktop -g "texto del test"`
(proyectos: `desktop`, `mobile`, `small-mobile`).

No hay Vitest, MSW ni Supertest configurados, ni lint de backend.
No anunciar que se ejecutó una suite inexistente.
Los scripts unitarios y de integración apuntan a archivos concretos: al agregar otro test,
actualizar el script correspondiente o ejecutarlo explícitamente con `node --test`.

## Base de datos y pruebas

- Proteger los datos de negocio. No ejecutar migraciones, DDL, seeds, escrituras de prueba,
  scripts de mantenimiento ni sincronizaciones contra la base real como verificación.
- El arranque de `server.js` ejecuta bootstrap y seed; el bootstrap existente puede hacer
  `sync({ alter: true })`. Arrancar el backend no es una comprobación de solo lectura.
  Verificar un destino de desarrollo aislado antes de iniciarlo.
- Un cambio de esquema/modelos requiere una petición que lo incluya o una decisión explícita.
  Si hace falta pero está fuera del alcance, explicar el cambio concreto y continuar lo independiente.
- No agregar sincronizaciones automáticas ni importar las bases/esquemas del gimnasio.
  La conexión actual está en `database/sequelize.js`; la URL sale de `BD_URL` (Supabase).
  Esquemas: `gc_dist` en producción y `gc_dist_test` (predeterminado) para pruebas; solo minúsculas.
- `servidor/tests/ux_rules.test.mjs` prueba reglas sin conexión a la base.
- `checkout.integration.mjs` fuerza localhost, vacía `BD_URL`, crea un schema
  `codex_ux_test_<uuid>` y elimina solo ese schema al terminar. Necesita PostgreSQL local.
  Sus sincronizaciones están limitadas a ese schema temporal; conservar esos límites.
- Playwright levanta solo Vite en `127.0.0.1:4178` y simula la API; no necesita iniciar el backend.
  Usa Chromium en desktop, mobile y small-mobile. No prueba por sí solo la persistencia real.
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
  Mantener el adapter de persistencia del carrito, sin reemplazarlo por consultas independientes.
- Hooks antes de returns condicionales. Cubrir carga, error recuperable, vacío y envío pendiente.
  Formularios con React Hook Form/Zod cuando corresponda; labels, teclado y tamaños móviles.
- Reutilizar los tokens de tema y configuración de marca; no cambiar la identidad por aplicar un skill.
- Servidor: rutas autorizan, controladores adaptan HTTP y servicios contienen negocio/SQL.
  Mantener los contratos existentes `{ ok, data, mensaje, codigo, ... }`.
  Los controladores actuales usan try/catch: no quitarlos sin verificar el manejo de errores.
- Validar body/query/params con las utilidades reales; no inventar `req.datos` ni middlewares.
  Usar allowlists de campos y parámetros SQL; no interpolar entradas del usuario.
- Dinero, envío, fusión del carrito y operaciones concurrentes: conservar transacciones,
  locks y claves de idempotencia. Revisar `services/common/` y tests existentes.
- Autorización efectiva en servidor, incluyendo propietario del recurso y módulo habilitado.
  Las rutas del personal usan `requirePermiso(...)` (alcanza con uno) y la interfaz `permisos`/`cumpleAcceso`;
  no asumir privilegios por nombre de rol. `requireRole` queda para `super_admin` y módulos apagados.
  Un permiso nuevo se agrega en `permisos_config.js` y lo sincroniza el arranque (`sincronizarPermisos`).
- Para fechas de negocio usar explícitamente `America/Argentina/Buenos_Aires`.
- Neon: evitar N+1, listas ilimitadas y polling nuevo sin necesidad. El polling existente de
  pedidos es parte del comportamiento actual: evaluar su necesidad antes de cambiarlo.

## Secretos y permisos de Claude

No leer ni mostrar archivos .env reales, tokens, contraseñas o cadenas de conexión.
Consultar nombres y ejemplos sanitizados; `VITE_*` es público. No copiar permisos locales
de otro proyecto ni habilitar bypass de permisos. `.claude/settings.json` conserva permisos
existentes y agrega comandos de verificación y restricciones del flujo importado.
Las reglas de herramientas complementan estas instrucciones; no garantizan bloquear todos
los comandos equivalentes de otras shells.

## Skills y revisión

Skills en `.claude/skills/`: `feature`, `api-endpoint`, `react-component`,
`crud-admin`, `auth-rbac`, `dominio-distribuidora`, `e2e-test`, `pre-pr`,
`security-audit`, `perf-audit`, `frontend-design`.
Usar cada uno según el trabajo, no ejecutar auditorías completas para cualquier cambio.
El revisor `.claude/agents/code-reviewer.md` revisa en solo lectura cuando se solicita
una revisión independiente; no exige delegar todo trabajo.

El skill frontend-design ya existía en `frontend/.agents/skills/frontend-design/`.
Su copia en `.claude/skills/` permite invocarlo desde Claude en la raíz; conservar la licencia
y mantener ambas copias iguales si se actualiza ese skill.

## Definición de terminado

Verificar lo afectado con los comandos disponibles y comunicar resultados reales.
Agregar pruebas para lógica de negocio nueva o corregida, con caso válido y error relevante.
No exigir tests nuevos para cambios puramente documentales o de configuración del agente.
Sin secretos, depuración accidental, archivos temporales o cambios de base no autorizados.
Actualizar estas instrucciones si cambian rutas, comandos o arquitectura.
