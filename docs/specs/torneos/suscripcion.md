# Módulo: plan del organizador (`SUS`)

## Objetivo

Que cada organizador pague su propio plan mensual para crear y manejar torneos, con una prueba
gratis, pago por transferencia (o MercadoPago cuando se active) y un panel donde el equipo de la
plataforma aprueba pagos y extiende planes.

> En MiPadel el plan es **por organizador** (cada uno paga el suyo). No es la suscripción del core,
> que es de toda la instalación: al pasar al core, esto queda como parte del rubro.

## Alcance

- **Incluye:** empezar a organizar, prueba gratis, vencimiento, avisos, pago por transferencia con
  comprobante, MercadoPago (apagado), extensión manual y el panel de suscripciones.
- **No incluye:** el cobro de la inscripción de las parejas ([inscripciones.md](inscripciones.md)).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Jugador | Activar su cuenta de organizador (empieza la prueba). |
| Organizador | Ver su plan, transferir y mandar el comprobante, pagar con MercadoPago (cuando esté prendido). |
| Soporte (permiso `suscripciones.ver`) | Ver organizadores, vencimientos, pagos y comprobantes; no aprueba ni extiende. |
| Admin (permiso `suscripciones.gestionar`) | Además, aprobar o rechazar transferencias y sumar días o fijar la fecha a mano. |

## Reglas

### Prueba y vencimiento

| Código | Regla | Estado |
| --- | --- | --- |
| SUS-01 | Empezar a organizar suma el rol organizador y da 14 días de prueba (hoy cuenta como el día 1), una sola vez por cuenta. | ✅ `suscripcion.integration.mjs` › "empezar a organizar…"; `suscripcion.spec.js` › "un jugador activa su cuenta…" |
| SUS-02 | Las fechas son de Argentina; el plan rige mientras hoy no pase la fecha de vencimiento. | ✅ `ux_rules.test.mjs` › "plan: 14 días de prueba, estados por fecha argentina…" |
| SUS-03 | Aviso en el sitio 7 días antes de vencer (se puede cerrar). Sin días de gracia. | ✅ `ux_rules.test.mjs` › "plan… aviso 7 días antes"; `suscripcion.spec.js` › "plan por vencer…" |
| SUS-04 | Cada pago suma 30 días al final del plan, o desde hoy si ya había vencido. | ✅ `ux_rules.test.mjs` › "plan: cada pago suma 30 días al final…" |
| SUS-05 | Plan vencido = solo lectura: ve sus torneos pero no crea ni edita nada, tampoco carga resultados de un torneo en juego. Sin plan responde 403; vencido, 402. La vista pública sigue andando. | ✅ `suscripcion.integration.mjs` › "requireSuscripcionVigente…"; `torneos.spec.js` › "con el plan vencido…" |

### Pago por transferencia

| Código | Regla | Estado |
| --- | --- | --- |
| SUS-06 | El organizador ve los datos bancarios y copia el CBU. Mientras falte alguno (`[COMPLETAR]`), la pantalla avisa que no se puede transferir y que hay que escribirnos. | ✅ `suscripcion.spec.js` › "transferencia: el organizador ve los datos…" y "sin datos bancarios ni MercadoPago…" |
| SUS-07 | Manda el comprobante (jpg, png, webp o pdf, hasta 5 MB, reconocido por su contenido) con una nota opcional; queda "en revisión". Una sola transferencia pendiente por organizador. | ✅ `suscripcion.integration.mjs` › "transferencia…"; `ux_rules.test.mjs` › "transferencia: el comprobante se reconoce por su contenido…" |
| SUS-08 | El comprobante es privado y se ve con un enlace que vence a los 5 minutos. | ✅ `ux_rules.test.mjs` › "SUS-08: el comprobante privado… vence a los 5 minutos" |
| SUS-09 | El equipo la aprueba (suma 30 días) o la rechaza con motivo; el organizador ve el motivo y puede mandar otra. | ✅ `suscripcion.integration.mjs` › "transferencia…"; `suscripcion.spec.js` › "transferencia rechazada…" y "panel: el admin abre el comprobante…" |

### MercadoPago (apagado)

| Código | Regla | Estado |
| --- | --- | --- |
| SUS-10 | Programado y probado pero apagado (`cobroConfig.mercadoPagoHabilitado: false`). | ✅ (configuración) |
| SUS-11 | Solo un pago aprobado, en pesos y por el precio vigente o más suma días; pendiente, monto menor, otra moneda o usuario inexistente no habilitan nada. El aviso repetido suma una sola vez. | ✅ `suscripcion.integration.mjs` › "aviso de MercadoPago…" (2 tests); `ux_rules.test.mjs` › "MercadoPago…" |

### Panel de suscripciones

| Código | Regla | Estado |
| --- | --- | --- |
| SUS-12 | Listado de organizadores con filtros, historial de pagos y comprobantes. Soporte ve; solo quien gestiona aprueba, rechaza o extiende. Un jugador no entra. | ✅ `suscripcion.spec.js` › "panel: …" (5 tests) |
| SUS-13 | Extensión manual: de 1 a 365 días, o fijar una fecha, con nota. Queda en el historial. | ✅ `ux_rules.test.mjs` › "plan: extensión manual y ajuste de fecha…"; `suscripcion.integration.mjs` › "panel: extender a mano…" |
| SUS-14 | Inicio del panel: organizadores por estado y comprobantes para revisar sin salir; el super admin además ve cuántos usuarios hay (solo nombre y fecha) y maneja los torneos demo. | ✅ `suscripcion.spec.js` › "inicio del panel…" (4 tests) |
| SUS-15 | El plan del organizador responde en `/api/plan-organizador`: no choca con `/api/suscripcion`, que en el core es la suscripción del software (apagada en MiPadel, SIS-56). | ✅ `suscripcion.integration.mjs` (todas las pruebas del plan usan esa ruta) |
| SUS-16 | El super admin nunca queda en solo lectura ni recibe el aviso de plan vencido, aunque su cuenta también sea de organizador: igual que el servidor (`requireSuscripcionVigente` lo deja pasar). | ✅ `ux_rules.test.mjs` › "plan vencido: el organizador queda en solo lectura; el super admin no…" |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Precio del mes | `.env` del servidor › `PRECIO_SUSCRIPCION_MENSUAL` | ❓ el del ejemplo no es real |
| MercadoPago prendido o apagado | `rubros/torneos/cobro_config.js` › `mercadoPagoHabilitado` | Apagado |
| Datos para transferir | `rubros/torneos/cobro_config.js` › `transferencia` | `[COMPLETAR]` (titular, banco, CBU, alias, CUIT) |
| Días de prueba, por pago, de aviso y tope manual | `services/suscripciones/suscripcion_reglas.js` | 14 · 30 · 7 · 365 |

## Dónde está el código

- Servidor: `services/suscripciones/` (reglas en `suscripcion_reglas.js`), `middleware/plan_middleware.js`
  (`requireSuscripcionVigente`), rutas `routes/suscripciones/` montadas en `/api/plan-organizador`.
- Frontend: `/mi-suscripcion`, `/admin/suscripciones`, `plan/` y `admin/`.

## Preguntas abiertas

1. **[SUS-06] — Precio del plan y datos bancarios reales.** Hacen falta para publicar: precio mensual,
   titular, banco, CBU o CVU, alias y CUIT. Se cargan en el `.env.produccion` (`PRECIO_SUSCRIPCION_MENSUAL`) y en `rubros/torneos/cobro_config.js`.
   **Respuesta:**
2. **[SUS-05] — ¿Días de gracia?** Hoy, al día siguiente del vencimiento queda en solo lectura, aunque
   tenga un torneo en juego ese fin de semana. Opciones: (a) sin gracia, como hoy; (b) si tiene un torneo
   En juego, puede seguir cargando resultados de **ese** torneo hasta terminarlo. Recomendación: (b), para
   no cortar un torneo a la mitad.
   **Respuesta:**
