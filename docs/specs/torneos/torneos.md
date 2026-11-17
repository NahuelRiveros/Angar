# Módulo: torneos (`TOR`)

## Objetivo

Que un organizador arme y publique un torneo de pádel (datos, categorías, premios, reglamento y
cobro de la inscripción) y lo lleve por sus estados hasta terminarlo, sin que nadie más pueda tocarlo.

## Alcance

- **Incluye:** el torneo, sus estados, categorías, premios, reglamento, datos para cobrar la inscripción,
  duplicar, exportar inscriptos e imprimir.
- **No incluye:** inscripción de parejas ([inscripciones.md](inscripciones.md)), zonas, llave y cronograma
  ([zonas_y_llave.md](zonas_y_llave.md)), lo que ve el público ([publico.md](publico.md)) y el plan del
  organizador ([suscripcion.md](suscripcion.md)).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Organizador (con plan vigente) | Crear, editar, cambiar de estado, duplicar, exportar e imprimir **sus** torneos. |
| Organizador (plan vencido) | Ver sus torneos, sin crear ni editar nada (solo lectura). |
| Jugador / visitante | Nada acá: ve lo publicado en [publico.md](publico.md). |
| Equipo de la plataforma | No edita torneos de otros. |

## Reglas

### Dueño y acceso

| Código | Regla | Estado |
| --- | --- | --- |
| TOR-01 | Un torneo se crea en **Borrador** y solo lo ve y edita su dueño; un torneo ajeno o inexistente responde "no encontrado" (404), sin decir que existe. | ✅ `torneo.integration.mjs` › "torneo: se crea en borrador, solo lo ve y edita su dueño"; `torneos.spec.js` › "un torneo ajeno o inexistente…" |
| TOR-02 | Crear o editar exige plan vigente ([SUS-05](suscripcion.md)); sin plan vigente se ve todo en solo lectura. | ✅ `torneos.spec.js` › "con el plan vencido se ve todo pero en solo lectura" |
| TOR-03 | Un jugador que no organiza no ve "Mis torneos"; si entra por la dirección, vuelve al inicio. | ✅ `torneos.spec.js` › "un jugador no ve 'Mis torneos'…" |

### Datos del torneo

| Código | Regla | Estado |
| --- | --- | --- |
| TOR-04 | Los datos se validan con lista blanca (lo desconocido se ignora), textos recortados con tope de largo y fechas válidas con la de fin no antes que la de inicio. | ✅ `ux_rules.test.mjs` › "torneo: datos con lista blanca…" |
| TOR-05 | El monto de inscripción es por pareja, en pesos, mayor a 0 y hasta $10.000.000 con dos decimales como máximo; vacío = no se cobra por MiPadel. | ✅ `ux_rules.test.mjs` › "cobro de la inscripción…" |
| TOR-06 | Datos para cobrar: titular, banco, CBU/CVU (22 números; se aceptan espacios o guiones al escribirlo) y alias (6 a 20 letras, números, punto o guion). Son públicos en la ficha. | ✅ `ux_rules.test.mjs` › "cobro de la inscripción…"; `juego.spec.js` › "visitante: la ficha muestra el monto…" |

### Estados

`Borrador → Inscripción → En juego → Finalizado`, y `Cancelado` desde cualquiera de los tres primeros.

| Código | Regla | Estado |
| --- | --- | --- |
| TOR-07 | Pasos permitidos: Borrador → Inscripción o Cancelado; Inscripción → En juego, Borrador o Cancelado; En juego → Finalizado o Cancelado. Finalizado y Cancelado no cambian más. | ✅ `ux_rules.test.mjs` › "torneo: estados en orden…" |
| TOR-08 | Abrir la inscripción pide sede, fecha y al menos una categoría. | ✅ `torneo.integration.mjs` › "estados: abrir inscripción pide sede, fecha y categorías…" |
| TOR-09 | Qué se edita en cada estado: en Borrador e Inscripción, todo; En juego, datos y premios pero no categorías; Finalizado y Cancelado, nada. | ✅ `torneo.integration.mjs` › "estados…"; `torneos.spec.js` › "en juego no se agregan categorías pero sí premios…" |
| TOR-10 | Solo se borra un torneo en Borrador, y se lleva sus parejas, zonas y partidos. | ✅ `juego.integration.mjs` › "borrar un torneo en borrador…" |
| TOR-11 | Cancelar un torneo con inscripciones pagas no devuelve nada desde el sistema. | ❓ ver pregunta 1 |

### Categorías

| Código | Regla | Estado |
| --- | --- | --- |
| TOR-12 | Una categoría es de la lista (nivel 1ra a 8va + rama Caballeros, Damas o Mixto: "4ta Caballeros") o tiene nombre propio ("Suma 13"). No se repite en el torneo, sin importar mayúsculas ni espacios. | ✅ `ux_rules.test.mjs` › "categorías: nivel y rama de la lista o nombre propio…"; `torneo.integration.mjs` › "categorías y premios…" |
| TOR-13 | Hasta 30 categorías por torneo. Cupo opcional, de 2 a 256 parejas. | ✅ `ux_rules.test.mjs` › "categorías…" |
| TOR-14 | El cupo se elige de una lista de cantidades que dan zonas iguales; "Otro número" se permite con aviso de zonas desparejas. La lista marca con ★ los cupos de llave justa (sin pases ni mejores terceros). | ✅ `torneos.spec.js` › "el cupo se elige entre cantidades con zonas iguales…" |
| TOR-15 | Cada categoría puede tener su propio monto de inscripción (por pareja); vacío = no cobra por MiPadel. | ✅ `ux_rules.test.mjs` › "cobro de la inscripción…" |
| TOR-16 | Borrar una categoría borra en cascada sus premios. | ✅ `torneo.integration.mjs` › "categorías y premios…" |

### Premios y reglamento

| Código | Regla | Estado |
| --- | --- | --- |
| TOR-17 | Premios por categoría: puesto conocido (Campeón, Subcampeón, Semifinalista, Cuartos de final u Otro con nombre), descripción obligatoria, hasta 10. Se guardan juntos: la lista nueva reemplaza a la anterior. | ✅ `ux_rules.test.mjs` › "premios…"; `torneo.integration.mjs` › "categorías y premios…" |
| TOR-18 | El reglamento se empieza desde un modelo (el de zonas y llave se arma con la configuración de las categorías), se edita y se guarda. | ✅ `torneos.spec.js` › "reglamento: se empieza desde un modelo…" |

### Herramientas del organizador

| Código | Regla | Estado |
| --- | --- | --- |
| TOR-19 | Duplicar copia datos, cobro, categorías y premios (lista explícita de campos); la copia se llama "Copia de …", queda en Borrador, sin fechas, sin parejas ni juego. | ✅ `torneo.integration.mjs` › "duplicar un torneo…"; `ux_rules.test.mjs` › "duplicar…"; `torneos.spec.js` › "duplicar un torneo jugado…" |
| TOR-20 | Exportar inscriptos a Excel desde el navegador: separador `;`, acentos bien, teléfono, estado de pago y celdas a prueba de fórmulas. | ✅ `juego.spec.js` › "organizador: descarga la lista de inscriptos para Excel…" |
| TOR-21 | Versión para imprimir (o guardar en PDF) con zonas, fixture, horarios y llave, sin los menús del sitio. | ✅ `juego.spec.js` › "organizador: versión para imprimir…" |
| TOR-22 | Cada pestaña del detalle abre con una guía de qué se hace ahí según el estado; se puede ocultar y se recuerda. | ✅ `torneos.spec.js` › "cada pestaña tiene su guía…" |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Estados, pasos permitidos, qué se edita en cada estado | `torneo_config.js` (`ESTADOS_TORNEO`, `TRANSICIONES`, `EDICION_POR_ESTADO`) | Ver TOR-07 a TOR-09 |
| Niveles, ramas y puestos | `torneo_config.js` | 1ra a 8va; Caballeros, Damas, Mixto |
| Límites | `torneo_config.js` › `LIMITES` | 30 categorías · 10 premios · cupo 2 a 256 · monto hasta $10.000.000 |

## Dónde está el código

- Servidor: `routes/torneos/`, `services/torneos/torneo_service.js`, reglas en `torneo_reglas.js`.
- Frontend: `modules/torneos/organizador/` (Mis torneos), `detalle/` (pestañas), `/mis-torneos/:id/imprimir`.

## Decisiones

| Fecha | Regla | Decisión | Quién |
| --- | --- | --- | --- |
| (antes de 2026-11) | TOR-07 a TOR-09 | Estados y edición por estado como están arriba; sin partido por el 3er puesto. | Dueño del proyecto |

## Preguntas abiertas

1. **[TOR-11] — Si se cancela un torneo con inscripciones pagas, ¿qué pasa?** Hoy el sistema no hace nada
   con esos pagos (la devolución, si la hay, se arregla por fuera). Opciones: (a) dejarlo así y avisarle a
   las parejas que pagaron que el torneo se canceló; (b) además, marcar esas inscripciones "a devolver"
   para que el organizador lleve la cuenta; (c) dejarlo como está, sin aviso. Recomendación: (a).
   **Respuesta:**
2. **[TOR-07] — ¿Se puede volver de "En juego" a "Inscripción"?** Hoy no (solo a Finalizado o Cancelado).
   Sirve si se empezó por error. Opciones: (a) no, como hoy; (b) sí, mientras no haya ningún resultado
   cargado. Recomendación: (b).
   **Respuesta:**
