# Módulo: zonas, llave y cronograma (`JUE`)

## Objetivo

Que cada categoría se juegue en zonas (todos contra todos) y después en una llave eliminatoria,
con sorteo justo, tabla de posiciones clara, resultados que hacen avanzar la llave solos y un
cronograma de días, horas y canchas.

## Alcance

- **Incluye:** formato de zona y de llave, sorteo, fixture, resultados, tabla y desempates, armar y
  deshacer la llave, podio, programación a mano y cronograma automático.
- **No incluye:** quién entra al torneo ([inscripciones.md](inscripciones.md)); lo que ve el público de
  zonas y llave ([publico.md](publico.md)).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Organizador (dueño, plan vigente) | Sortear y ajustar zonas, cargar resultados, armar o deshacer la llave, programar partidos y armar el cronograma. |
| Jugador | Recibe aviso de sus horarios ([JUG-08](jugadores.md)) y ve todo en la vista pública. |

## Reglas

### Formato

| Código | Regla | Estado |
| --- | --- | --- |
| JUE-01 | Cada categoría elige parejas por zona (3, 4 o 5), cuántas clasifican por zona (1 o 2), el formato de zona y el de llave. Por defecto: zonas de 3, clasifican 2, zona a un set de 6, llave al mejor de 3 con super tie-break. | ✅ `ux_rules.test.mjs` › "categorías…" (formato) |
| JUE-02 | Formatos de partido: un set a 6, un set largo a 9, mejor de 3, o mejor de 3 con el tercero en super tie-break a 10. El formato se copia al partido al crearlo (cambiarlo después no cambia lo ya creado). | ✅ `ux_rules.test.mjs` › "marcadores: sets a 6 y a 9…" |
| JUE-03 | El marcador se valida según el formato y se rechaza lo imposible (por ejemplo, 6-5 en un set a 6). | ✅ `ux_rules.test.mjs` › "marcadores…"; `juego.spec.js` › "…el servidor rechaza un marcador imposible" |

### Zonas

| Código | Regla | Estado |
| --- | --- | --- |
| JUE-04 | Se arman con el torneo en Inscripción o En juego, con las parejas confirmadas. Zonas parejas en tamaño; nunca una zona de 2 (salvo que haya solo 2 parejas). | ✅ `ux_rules.test.mjs` › "zonas: tamaños parejos, nunca una zona de 2…" |
| JUE-05 | Sorteo automático con azar criptográfico; las cabezas de serie quedan en zonas distintas. | ✅ `ux_rules.test.mjs` › "zonas… cabezas de serie separadas y sorteo reproducible"; `juego.integration.mjs` › "zonas: sorteo con cabezas separadas…" |
| JUE-06 | Antes de sortear se ve qué zonas y qué llave salen; si las confirmadas no dan zonas iguales, se avisa y se puede sortear igual. | ✅ `juego.spec.js` › "organizador: antes de sortear ve qué zonas y llave salen…" |
| JUE-07 | Las parejas se pueden mover de zona y las zonas rearmar, solo mientras no haya resultados. Rearmar borra los horarios cargados. | ✅ `juego.integration.mjs` › "zonas: …mover parejas…" |
| JUE-08 | Fixture todos contra todos, una vez, por fechas: nadie juega dos veces en la misma fecha. | ✅ `ux_rules.test.mjs` › "fixture: todos contra todos una vez…" |
| JUE-09 | Resultados de zona solo con el torneo En juego. | ✅ `juego.spec.js` › "organizador: con la inscripción abierta carga día, hora y cancha… (el resultado recién en juego)" |

### Tabla y desempate

| Código | Regla | Estado |
| --- | --- | --- |
| JUE-10 | Orden de la tabla: partidos ganados → diferencia de sets → diferencia de games → resultado entre ellas (si empatan dos) → games a favor → sorteo. El super tie-break cuenta como un set y un game. | ✅ `ux_rules.test.mjs` › "posiciones…" y "desempate: games a favor y después el sorteo guardado…" |
| JUE-11 | El sorteo de desempate es un número al azar que se guarda cuando la pareja entra en la zona (no cambia en cada consulta). La tabla marca qué desempate definió cada lugar. | ✅ `juego.spec.js` › "zonas terminadas: …qué desempate definió cada lugar" |
| JUE-12 | Los clasificados se conocen recién con la zona terminada. | ✅ `ux_rules.test.mjs` › "posiciones… clasificados al terminar la zona" |

### Llave

| Código | Regla | Estado |
| --- | --- | --- |
| JUE-13 | La llave se arma con el torneo En juego y todas las zonas de la categoría terminadas; si falta algo, dice qué. | ✅ `llave.integration.mjs` › "armar requiere zonas terminadas…"; `llave.spec.js` › "con zonas sin terminar…" |
| JUE-14 | Tamaño: la potencia de 2 que alcanza a los clasificados. Los lugares que sobran los ocupan los mejores del puesto siguiente (terceros, o segundos si clasifica 1) por promedio por partido (ganados, sets, games, games a favor, sorteo); si no alcanzan, quedan pases. | ✅ `llave.integration.mjs` › "3 zonas de 3: 6 clasificados + los 2 mejores terceros…"; `ux_rules.test.mjs` › "desempate… los mejores terceros por promedio" |
| JUE-15 | Siembra: los 1º de zona son cabezas en orden (A, B…), después los 2º y los mejores terceros; si quedan pases, son para los 1º. 1ºA juega contra 2ºB. | ✅ `ux_rules.test.mjs` › "llave: siembra clásica, 1ºA contra 2ºB…" |
| JUE-16 | Nadie cruza en primera ronda a alguien de su zona y, si se puede, el 2º queda en la otra mitad de la llave que su 1º. | ✅ `ux_rules.test.mjs` › "llave: de 1 a 8 zonas…" y "llave con mejores terceros…" |
| JUE-17 | El ganador de cada partido avanza solo a su lugar en la ronda siguiente. Sin partido por el 3er puesto: los semifinalistas lo comparten. El podio sale de la final y las semis. | ✅ `llave.integration.mjs` › "llave de 4…"; `ux_rules.test.mjs` › "llave: el ganador avanza…" |
| JUE-18 | Con la llave armada, las zonas quedan cerradas. Para corregirlas se deshace la llave, solo si no tiene resultados. | ✅ `llave.integration.mjs` › "…deshacer la llave reabre las zonas…"; `llave.spec.js` › "deshacer la llave sin resultados…" |
| JUE-19 | Corregir un resultado cuyo partido siguiente ya se jugó y que cambia al ganador: se frena (hay que corregir primero el siguiente). | ⚠️ sin test propio |
| JUE-20 | El cálculo que ve el organizador (zonas, clasificados, llave) es el mismo que usan el sorteo y la llave reales. | ✅ `ux_rules.test.mjs` › "cálculo de la llave: lo que ve el organizador coincide…" |

### Programación y cronograma

| Código | Regla | Estado |
| --- | --- | --- |
| JUE-21 | Día, hora y cancha de un partido son opcionales y se cargan a mano con el torneo en Inscripción o En juego. | ✅ `ux_rules.test.mjs` › "programación del partido…"; `juego.spec.js` › "…carga día, hora y cancha…" |
| JUE-22 | Cronograma automático: de 1 a 7 días, una franja horaria, de 1 a 20 canchas, turnos de 30 a 120 minutos y de 0 a 3 turnos de descanso entre partidos de una pareja. | ✅ `ux_rules.test.mjs` › "cronograma automático…" |
| JUE-23 | El cronograma nunca pone a una pareja en dos canchas a la vez, respeta el descanso, avanza todas las zonas parejo (primero la fecha 1 de todas) y pone la llave después de las zonas, ronda por ronda. Lo cargado a mano se respeta. Sin azar: la vista previa y lo guardado coinciden. | ✅ `ux_rules.test.mjs` › "cronograma automático…"; `llave.integration.mjs` › "cronograma automático…" |
| JUE-24 | Primero se ve una vista previa (no guarda); al aplicarlo, cada jugador recibe un solo aviso con todos sus horarios. Los partidos que no entran en la grilla quedan sin horario. | ✅ `llave.integration.mjs` › "cronograma automático: vista previa sin guardar…"; `juego.spec.js` › "organizador: arma el cronograma…" |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Formatos de partido, tamaños de zona y valores por defecto | `torneo_config.js` › `FORMATOS_PARTIDO`, `ZONAS` | Ver JUE-01 y JUE-02 |
| Cuándo se arma, se carga y se programa | `torneo_config.js` › `PERMITIDO` | Zonas: Inscripción y En juego · resultados y llave: En juego |
| Límites del cronograma | `services/torneos/cronograma_reglas.js` › `CRONOGRAMA` | 7 días · 20 canchas · turnos de 30 a 120 min · descanso 0 a 3 |

## Dónde está el código

- Servidor: `zona_reglas.js`, `llave_reglas.js`, `cronograma_reglas.js` (reglas puras) y
  `zona_service.js`, `llave_service.js`, `cronograma_service.js`. Resultado de cualquier partido:
  `PUT /api/torneos/:id/partidos/:id/resultado`.
- Frontend: pestañas Zonas y Llave del detalle, `detalle/calculo_llave.jsx`, `detalle/cronograma_modal.jsx`.

## Preguntas abiertas

1. **[JUE-17] — ¿Partido por el 3er puesto?** Hoy no se juega: los dos semifinalistas comparten el
   tercer lugar. Opciones: (a) así; (b) opcional por categoría. Recomendación: (a) hasta que un
   organizador lo pida.
   **Respuesta:**
2. **[JUE-07] — ¿Se puede agregar una pareja con las zonas ya sorteadas?** Hoy hay que rearmar (y se
   pierden los horarios). Opciones: (a) así; (b) sumarla a la zona más chica sin rearmar, mientras esa
   zona no tenga resultados. Recomendación: (b).
   **Respuesta:**
