# Cambio: conectar MiPadel al core (CoreSistem)

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| Aprobada | Dueño | 2026-11-17 | Core: `docs/specs/core/*.md` (llegan con el core) · torneos: [../torneos/](../torneos/) |

## Por qué

MiPadel, DistribuCG y Stilos nacieron de la misma base, pero MiPadel quedó aparte: cada mejora del
esqueleto (ingreso, registro, personal, permisos, panel, barra, pie) hay que hacerla dos veces.
Conectado al core, MiPadel recibe las mejoras con `core_traer` y aporta las suyas con `core_subir`,
con la misma estructura y el mismo diseño que los otros proyectos. **Lo que hace MiPadel no cambia:**
torneos, inscripciones, zonas, llave, jugadores, avisos y el plan de los organizadores siguen igual.

## Cómo queda armado

El core es el esqueleto; todo lo que es de pádel pasa a ser el **rubro `torneos`**, una carpeta que
se "enchufa" al esqueleto a través de los registros de `proyecto/`.

| Hoy (MiPadel) | Después | Qué es |
| --- | --- | --- |
| `frontend/src/controls`, `api`, `auth`, `hooks`, `utils`, `app` y `modules/usuarios`, `home`, `panel` | `frontend/src/core/` (viene del core) | Esqueleto: se reemplaza por el del core; lo propio de MiPadel se pasa antes al core o al rubro |
| `servidor/src/` (usuarios, permisos, sistema, ubicación, upload, middleware, database) | `servidor/src/core/` (viene del core) | Ídem |
| `frontend/src/modules/torneos`, `jugadores`, `suscripcion` | `frontend/src/modules/torneos/` | Rubro: pantallas, menú, campanita y portada |
| `servidor/src/` torneos, jugadores, avisos, demo, suscripciones (plan del organizador) | `servidor/src/modulos/torneos/` | Rubro: modelos, rutas, servicios, arranque y datos iniciales |
| `torneo_config.js`, `cobro_config.js` | `rubros/torneos/` | Configuración del rubro (la usan API e interfaz) |
| `client_config.js`, `deployment_config.js`, `permisos_config.js` | `proyecto/` y `core/permisos_config.js` | Datos de esta instalación; permisos del core + `proyecto/permisos_rubros.js` |
| `frontend/src/config/` (marca, colores, textos) | `frontend/src/proyecto/config/` | Identidad de MiPadel: colores y logo actuales, frases del menú (`menuMovil`) |

Se trabaja en el mismo repo de MiPadel (se conserva el historial), en una rama `core`, y se suma
`.git-core/` para `core_traer`/`core_subir` como en DistribuCG y Stilos.

## Requisitos

| Código | Requisito | Estado |
| --- | --- | --- |
| MIG-01 | Ningún archivo del core importa el rubro `torneos` (el test COR-01 del core pasa en MiPadel). | 🚧 |
| MIG-02 | Todas las reglas de las specs de torneos (TOR, INS, JUE, PUB, JUG, SUS) siguen cumpliéndose: los tests de hoy pasan después de mover los archivos (solo cambian sus rutas de import). | 🚧 |
| MIG-03 | Quien se registra recibe el rol `jugador` (no `cliente`) y, si no venía de otra página, termina en `/mi-perfil?bienvenida=1`. `jugador` y `organizador` no usan permisos del personal (son "roles fuera", como `cliente`). | 🚧 (necesita el punto de extensión C1 y C2 del core) |
| MIG-04 | Cada jugador conserva su código `MP-XXXXX` y su preferencia de mails. Las cuentas nuevas reciben su código al crearse. | 🚧 (ver D3) |
| MIG-05 | La portada de MiPadel es la de hoy (la aporta el rubro con `inicio`, SIS-53) y la campanita sigue en la barra (`extrasNavbar`). | 🚧 |
| MIG-06 | El plan de los organizadores (prueba, transferencia, aprobación, vencido = solo lectura) funciona igual, en una ruta que no choca con la suscripción del software del core. | 🚧 (ver D2) |
| MIG-07 | Al arrancar contra la base de producción no se pierde ningún dato: torneos, inscripciones, partidos, pagos, avisos, usuarios, roles y permisos quedan como estaban. | 🚧 (ver Riesgos) |
| MIG-08 | `core_subir` y `core_traer` funcionan en MiPadel y no viajan al core ni el rubro, ni `proyecto/`, ni los `.env`. | 🚧 |
| MIG-09 | La suscripción del software del core (la que paga una instalación) está apagada en MiPadel: no bloquea y sus pantallas no aparecen. | 🚧 (C3) |

**Fuera de alcance:** funciones nuevas de torneos (estrellas, foto, ranking), cambiar el diseño de
las pantallas de torneos, y pasar MercadoPago a encendido.

## Decisiones que necesito de vos

**D1 — Suscripción del software del core.** El core trae un "plan" que paga cada instalación al dueño
del software (vos) y bloquea al personal si vence. MiPadel es tu propio producto: no tiene sentido que
se cobre a sí mismo.
- **Recomendado:** apagarla en MiPadel con un interruptor en `proyecto/` (cambio chico en el core, que
  por defecto la deja prendida para DistribuCG y Stilos). Las pantallas de esa suscripción no aparecen.
- Alternativa: dejarla, sin crear la fila del plan (hoy, sin fila, no bloquea; pero las pantallas quedan).

**Respuesta:** Apagarla en MiPadel (recomendada). 2026-11-17.

**D2 — La ruta del plan de los organizadores.** Hoy es `/api/suscripcion`, la misma que usa el core para
su suscripción del software.
- **Recomendado:** pasarla a `/api/plan-organizador` (y la pantalla sigue en `/mi-suscripcion`). El aviso
  de pago de MercadoPago cambia de dirección, pero hoy MercadoPago está apagado.

**Respuesta:** `/api/plan-organizador` (recomendada). 2026-11-17.

**D3 — Código de jugador y preferencia de mails.** Hoy son columnas que MiPadel agregó a la tabla
`usuario` del core (`codigo_jugador`, `recibir_mails`) más un "hook" que pone el código al crear la cuenta.
El core no conoce los torneos, así que no puede tenerlas.
- **Recomendado:** una tabla del rubro, `jugador` (usuario, código y recibir mails), que el arranque del
  rubro completa copiando los datos de `usuario` (una vez, sin borrar nada). Las columnas viejas se
  dejan sin usar en esta entrega y se borran en una posterior, cuando todo esté probado en producción.
- Alternativa: sumarle al core un "lugar" para que un rubro agregue columnas a `usuario` (más simple de
  migrar, pero mezcla al rubro con el esqueleto).

**Respuesta:** Tabla `jugador` del rubro (recomendada). 2026-11-17.

**D4 — El home editable y la cinta.** MiPadel tiene un home que se edita desde el panel (tablas `home_*`)
y una cinta de anuncios propia (`banner_anuncio`). El core las reemplazó por banners con fecha
(carrusel y cinta, en "Banners y promociones").
- **Recomendado:** la portada de MiPadel pasa al rubro tal como está (con sus tablas y su editor), y la
  cinta pasa a los banners del core copiando los anuncios de hoy (como hizo DistribuCG).
- Alternativa: pasar también la portada a los banners del core (más simple, pero cambia cómo se edita).

**Respuesta:** Home igual (al rubro, con su editor) y la cinta a los banners del core (recomendada). 2026-11-17.

**D5 — La base de producción.**
- ¿MiPadel tiene su propio proyecto de Supabase o comparte la base con DistribuCG o Stilos? El core guarda
  la suscripción del software en el esquema `public`; si la base es compartida, hay que evitar que se mezclen.
- ¿Ya hay organizadores o jugadores reales usando MiPadel? Define cuánto cuidado lleva el pase
  (copia de seguridad y horario).

**Respuesta:** Supabase propio de MiPadel y todavía sin usuarios reales (todo es de prueba). 2026-11-17.

## Cambios que necesita el core (compatibles: DistribuCG y Stilos no cambian)

- **C1 — Roles fuera de los rubros:** hoy `rolesFuera` es fijo (`["cliente"]`); pasa a sumar los que declare
  `proyecto/permisos_rubros.js` (MiPadel: `jugador`, `organizador`).
- **C2 — Registro:** el rol que recibe quien se registra y el destino después de registrarse los puede
  poner el rubro (hoy `cliente` y la página de origen; MiPadel: `jugador` y `/mi-perfil?bienvenida=1`).
- **C3 — Suscripción del software apagable** desde `proyecto/` (D1: se apaga en MiPadel).
- Cada uno con su regla en la spec del core y su test; se suben con `core_subir` y se traen en Stilos.

## Tareas

1. [x] Aprobar esta spec (D1 a D5 respondidas).
2. [x] ~~Copia de seguridad~~: no hace falta, todavía no hay datos reales (D5).
3. [x] Core: C1, C2 y C3 con tests (PER-37, USU-43, SIS-56), en CoreSistem `4f8f83a` y traídos a Stilos.
4. [ ] MiPadel, rama `core`: traer el esqueleto del core, armar `proyecto/` con la marca y los colores de hoy,
   y conectar `.git-core/`.
5. [ ] Mover torneos, jugadores, avisos, demo y plan del organizador al rubro `torneos` (servidor y web),
   con su `modulo.js` y `modulo_pantallas.jsx`; arreglar imports.
6. [ ] Lo propio de MiPadel que hoy está en archivos del esqueleto (destino del registro, campanita, mails
   del super admin, impresión) pasa al rubro o ya llegó al core.
7. [ ] Arranque del rubro: tabla `jugador` con los datos copiados (D3) y cintas a banners (D4), sin borrar nada.
8. [ ] Tests: los de hoy (unitarios, integración y navegador) movidos y en verde; nuevos para MIG-03, MIG-04 y la
   copia de datos (con una base local armada como la de producción).
9. [ ] Capturas en compu y celular de las pantallas principales (inicio, torneos, detalle, panel, ingreso).
10. [ ] Probar el arranque contra una copia de la base de producción en tu PC antes de desplegar.
11. [ ] Desplegar (Render y Vercel) y revisar; recién después, en otra entrega, borrar las columnas viejas.
12. [ ] Pasar las reglas a las specs (core y torneos) y marcar este cambio como hecho.

## Riesgos

- **Datos de producción.** El arranque hace `sync({ alter: true })` con los modelos del core: si un modelo del
  core no tiene una columna que MiPadel sí tiene, Sequelize **no** la borra, pero cualquier diferencia de tipos
  o índices se aplica sola. Por eso: copia de seguridad antes y prueba del arranque contra una copia de la base.
- **Tablas que el core borra.** El core borra al arrancar las tablas de `proyecto/tablas_retiradas.js`. En
  MiPadel esa lista arranca **vacía** (las `home_*` no se tocan; ver D4).
- **Índices únicos (SIS-51/52).** El core renombra y limpia restricciones únicas repetidas al arrancar; está
  probado en Stilos, pero en MiPadel corre por primera vez sobre datos reales: se prueba primero con la copia.
- **Tamaño.** Se mueven unos 290 archivos (167 de la web y 120 del servidor). Se hace por pasos, cada uno con
  los tests en verde, en la rama `core`; `main` (producción) no se toca hasta el final.
- **Volver atrás.** Si algo sale mal al desplegar: se vuelve a desplegar el último commit de `main` y, si hiciera
  falta, se restaura la copia de seguridad.
