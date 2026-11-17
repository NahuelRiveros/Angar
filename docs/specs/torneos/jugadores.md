# Módulo: jugadores y avisos (`JUG`)

## Objetivo

Que cada jugador tenga su identidad en MiPadel (código para que lo inviten, perfil e historial
deportivo) y se entere de lo que le pasa (invitaciones, confirmaciones, pagos y horarios) sin
tener que entrar a revisar.

## Alcance

- **Incluye:** código de jugador, Mi perfil, perfil público, historial, campanita y avisos por correo.
- **No incluye:** el registro y el ingreso (core); anotarse e invitar ([inscripciones.md](inscripciones.md)).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Visitante | Ver el perfil público de un jugador (solo lo deportivo). |
| Jugador | Ver Mi perfil, copiar su código, ver su historial, leer sus avisos y apagar los mails. |
| Organizador | Recibe por correo cada inscripción online nueva y cada comprobante de sus torneos. |
| Super admin | Recibe por correo cuando alguien empieza a organizar y cuando llega un comprobante del plan. |

## Reglas

### Código y perfil

| Código | Regla | Estado |
| --- | --- | --- |
| JUG-01 | Cada cuenta nace con un código público `MP-XXXXX`, sin letras que se confundan; las cuentas viejas sin código lo reciben al arrancar el servidor. | ✅ `jugadores.integration.mjs` › "cada cuenta nace con su código…"; `ux_rules.test.mjs` › "código de jugador…" |
| JUG-02 | Al registrarse todos son jugadores; terminar el registro lleva a Mi perfil con un saludo de bienvenida. | ✅ `ux_rules.test.mjs` › "roles: el registro crea jugadores…"; `acceso.spec.js` › "registro… termina en Mi perfil" |
| JUG-03 | Mi perfil muestra el código para copiar, números, copas, historial y el plan de organizador (invita a organizar o resume el plan). Si el plan no carga, se reintenta sin perder el resto. | ✅ `jugadores.spec.js` › "mi perfil: mi código para copiar…" y "mi perfil: si el plan no carga…" |
| JUG-04 | Historial público y solo deportivo: torneos jugados, títulos, finales y mejor puesto (por la ronda de llave alcanzada). Nunca teléfono, email ni datos de cuenta. | ✅ `jugadores.integration.mjs` › "historial…"; `ux_rules.test.mjs` › "historial: puesto alcanzado por ronda…" |
| JUG-05 | Estrellas, foto y ranking del jugador. | 🚧 parte pendiente de la etapa 7 — ver pregunta 1 |

### Campanita y correos

| Código | Regla | Estado |
| --- | --- | --- |
| JUG-06 | La campanita (solo con sesión) suma lo pendiente (invitaciones sin responder, comprobantes por mandar o rechazados) y las novedades sin leer; al abrirla se marcan leídas. Sin pendientes, lo dice. | ✅ `juego.spec.js` › "campanita…" (4 tests) |
| JUG-07 | Novedades que llegan: inscripción confirmada o rechazada, comprobante rechazado, invitación (también por mail) y horario cargado a mano (solo campanita). Las de más de 90 días se borran. | ✅ `jugadores.integration.mjs` › "avisos al jugador…"; `ux_rules.test.mjs` › "avisos al jugador…" |
| JUG-08 | Al aplicar el cronograma automático, cada jugador recibe un solo aviso con todos sus horarios. | ✅ `llave.integration.mjs` › "cronograma automático…" |
| JUG-09 | El jugador puede apagar los avisos por mail en Mi perfil (la campanita sigue). | ✅ `juego.spec.js` › "mi perfil: el jugador apaga los avisos por mail" |
| JUG-10 | Los correos se mandan después de guardar y en segundo plano: un error del correo nunca rompe la acción. Nunca se escribe a dominios de prueba y se apagan con `AVISOS_POR_CORREO=no`. | ✅ `ux_rules.test.mjs` › "avisos por correo: textos con enlace, datos escapados y sin escribir a dominios de prueba" |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Avisos por correo prendidos o apagados | `.env` del servidor › `AVISOS_POR_CORREO` | Prendidos salvo `no` |
| A quién avisar del lado de la plataforma | `.env` del servidor › `SUPERADMIN_EMAIL` | (en el `.env`) |
| Etiquetas de puesto alcanzado | `torneo_config.js` › `PUESTOS_ALCANZADOS` | Campeón, Finalista, Semifinal… |

## Dónde está el código

- Servidor: `services/jugadores/`, `services/avisos/avisos_jugador_service.js`,
  `services/common/avisos_service.js` y `avisos_reglas.js`; rutas `/api/jugadores`, `/api/avisos`.
- Frontend: `/mi-perfil`, `/jugadores/:codigo`, `modules/torneos/avisos/` (campanita).

## Preguntas abiertas

1. **[JUG-05] — ¿Qué son las estrellas y el ranking?** Están en el plan (etapa 7) pero sin definir.
   Para escribir la spec hace falta saber: (a) ¿el ranking es por puntos según el puesto en cada torneo
   (ej. campeón 100, finalista 60…)? ¿Por categoría o general? ¿Se reinicia cada año? (b) ¿las estrellas
   las pone quién y a quién: el organizador al jugador, o los jugadores entre sí? (c) ¿la foto es
   obligatoria o opcional? Recomendación: arrancar por la foto (opcional) y un ranking por puntos por
   categoría y año; las estrellas, después.
   **Respuesta:**
