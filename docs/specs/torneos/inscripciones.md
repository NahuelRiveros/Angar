# Módulo: inscripciones (`INS`)

## Objetivo

Que las parejas se anoten en una categoría (solas, online, o cargadas por el organizador), que el
organizador decida quién entra respetando el cupo y que, si la categoría cobra, la pareja pague por
transferencia con comprobante.

## Alcance

- **Incluye:** anotarse online, invitar al compañero por código, carga a mano, confirmar o rechazar,
  cupo, baja, pago de la inscripción con comprobante y "Mis inscripciones".
- **No incluye:** armar zonas con los inscriptos ([zonas_y_llave.md](zonas_y_llave.md)); el código y el
  perfil del jugador ([jugadores.md](jugadores.md)); los datos de la cuenta para transferir
  ([TOR-06](torneos.md)).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Visitante | Ver la ficha; para anotarse se le pide ingresar. |
| Jugador (con cuenta) | Anotarse con su compañero, aceptar o rechazar una invitación, mandar el comprobante, darse de baja. |
| Organizador (dueño, plan vigente) | Confirmar, rechazar con motivo, cargar o editar parejas a mano, ver comprobantes y aprobarlos o rechazarlos. |

## Estados de una inscripción

| Estado | Significa |
| --- | --- |
| Esperando | El compañero fue invitado por su código y todavía no aceptó. |
| Pendiente | Anotada online; espera que el organizador la confirme. |
| Confirmada | Entra en el torneo (cuenta para el cupo). |
| Rechazada | El organizador la rechazó, con motivo. |
| Dada de baja | La pareja se bajó, o el compañero rechazó la invitación. |

## Reglas

### Anotarse

| Código | Regla | Estado |
| --- | --- | --- |
| INS-01 | Un jugador con cuenta se anota online solo con el torneo en Inscripción; queda **Pendiente** hasta que el organizador confirma o rechaza. | ✅ `juego.integration.mjs` › "inscripción online: solo con la inscripción abierta, queda pendiente…"; `juego.spec.js` › "un jugador se anota con su compañero…" |
| INS-02 | El que se anota es el jugador 1 (su nombre sale de su cuenta). Al compañero lo indica por nombre (sin cuenta) o por su código `MP-XXXXX` (escrito de cualquier forma; se normaliza). | ✅ `ux_rules.test.mjs` › "inscripción online: con nombre del compañero o con su código…" |
| INS-03 | Invitado por código: la inscripción queda **Esperando** hasta que el compañero acepta (pasa a Pendiente) o rechaza (se cancela). El organizador confirma recién después. | ✅ `jugadores.integration.mjs` › "invitar por código…"; `jugadores.spec.js` › "el compañero invitado acepta…" |
| INS-04 | Una sola inscripción viva por jugador y categoría, como titular o como invitado (también cruzado: titular en una e invitado en otra de la misma categoría). | ✅ `juego.integration.mjs` › "inscripción online… una por jugador y categoría" |
| INS-05 | Un visitante ve la ficha; al querer anotarse se le pide ingresar. | ✅ `juego.spec.js` › "un visitante ve los torneos y la ficha…" |

### Organizador

| Código | Regla | Estado |
| --- | --- | --- |
| INS-06 | El organizador carga parejas a mano con el torneo en Borrador o Inscripción; entran **Confirmadas**. Al editar una pareja no se cambia su categoría. | ✅ `juego.spec.js` › "organizador: confirma, rechaza con motivo y carga una pareja a mano" |
| INS-07 | Datos de la pareja: nombres completos, teléfono limpio, nota con tope y "cabeza de serie" solo si se marca. | ✅ `ux_rules.test.mjs` › "inscripciones: nombres completos, teléfono limpio…" |
| INS-08 | Rechazar pide motivo; la pareja lo ve. | ✅ `juego.spec.js` › "organizador: confirma, rechaza con motivo…" |
| INS-09 | El cupo cuenta solo las confirmadas y no se pasa, ni con dos confirmaciones al mismo tiempo. | ✅ `juego.integration.mjs` › "cupo: no se pasa ni con dos confirmaciones al mismo tiempo…" |
| INS-10 | En Zonas, el organizador ve cuántas parejas faltan para completar el cupo. | ✅ `juego.spec.js` › "organizador: en Zonas ve cuántas parejas faltan…" |

### Pago de la inscripción

Solo si la categoría tiene monto ([TOR-15](torneos.md)).

| Código | Regla | Estado |
| --- | --- | --- |
| INS-11 | La pareja paga mientras la inscripción del torneo está abierta: ve la cuenta, copia CBU y alias y manda el comprobante (imagen o PDF). | ✅ `juego.integration.mjs` › "pago de la inscripción…"; `juego.spec.js` › "jugador: ve la cuenta, manda el comprobante…" |
| INS-12 | Se puede reemplazar un comprobante rechazado; uno en revisión o aprobado, no. | ✅ `ux_rules.test.mjs` › "cobro de la inscripción… cuándo la pareja puede mandar el comprobante" |
| INS-13 | El organizador ve el comprobante con un enlace que vence a los 5 minutos y lo aprueba (la inscripción queda Confirmada, respetando el cupo) o lo rechaza con motivo. | ✅ `juego.spec.js` › "organizador: carga la cuenta en Datos, ve el comprobante y aprueba…" |
| INS-14 | Confirmar sin comprobante (pago en efectivo en el club) sigue permitido. | ⚠️ sin test propio |
| INS-15 | Al anotarse en una categoría que cobra, la ficha lleva directo a pagar ("Mis inscripciones", con el pago destacado); en una que no cobra, se queda en la ficha. | ✅ `juego.spec.js` › "jugador: al anotarse en una categoría que cobra…" y "jugador: en una categoría sin cobro…" |

### Mis inscripciones y baja

| Código | Regla | Estado |
| --- | --- | --- |
| INS-16 | "Mis inscripciones" tiene pestañas Activas, Jugadas y Bajas; lo que pide acción va primero y cada tarjeta dice el próximo paso. | ✅ `juego.spec.js` › "mis inscripciones: pestañas Activas, Jugadas y Bajas…" |
| INS-17 | Cualquiera de los dos jugadores con cuenta puede dar de baja la pareja mientras el torneo está en Inscripción y la pareja no está en una zona; pasa a "Bajas". Después, el sistema le dice que le escriba al organizador. | ✅ `juego.spec.js` › "mis inscripciones… bajarse la pasa a Bajas" (los límites: ⚠️ sin test) |
| INS-18 | El organizador da de baja una pareja mientras el torneo no esté cerrado; si ya está en una zona, primero hay que rearmar las zonas. | ⚠️ sin test |
| INS-19 | Si la pareja ya pagó y se baja, el sistema no registra ninguna devolución. | ❓ ver pregunta 1 |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Cuándo se anota, se cargan parejas y se paga | `torneo_config.js` › `PERMITIDO` | Online y pago: Inscripción · a mano: Borrador e Inscripción |
| Comprobante | `cobro_config.js` › `comprobante` | Hasta 5 MB · jpg, png, webp, pdf (se reconoce por el contenido) |

## Dónde está el código

- Servidor: `services/torneos/inscripcion_service.js`, reglas en `inscripcion_reglas.js`; rutas
  `/api/torneos/:id/inscripciones` (organizador) y `/api/inscripciones` (jugador).
- Frontend: pestaña Inscripciones del detalle, ficha pública `/torneos/:id`, `/mis-inscripciones`.

## Preguntas abiertas

1. **[INS-19] — Si una pareja que ya pagó se da de baja, ¿qué pasa con la plata?** Hoy el sistema no
   hace nada: la inscripción pasa a "Bajas" con su pago aprobado. Opciones: (a) así, la devolución se
   arregla por fuera; (b) avisarle al organizador ("se bajó una pareja que había pagado") para que
   decida; (c) no dejar que se baje sola si ya pagó: tiene que pedírselo al organizador.
   Recomendación: (b).
   **Respuesta:**
2. **[INS-11] — ¿La pareja puede mandar el comprobante con el torneo ya empezado?** Hoy solo se
   manda con la inscripción abierta. Opciones: (a) así; (b) también "En juego", para el que paga el día
   del torneo. Recomendación: (b), porque en los clubes es común pagar el mismo día.
   **Respuesta:**
