# Cambio: decisiones de torneos (devoluciones, volver a inscripción, 3er puesto, foto y ranking)

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| Borrador | Dueño | 2026-11-18 | [torneos](../torneos/torneos.md), [inscripciones](../torneos/inscripciones.md), [zonas y llave](../torneos/zonas_y_llave.md), [jugadores](../torneos/jugadores.md), [público](../torneos/publico.md) |

## Por qué

El dueño respondió las preguntas abiertas de las specs de torneos. Algunas confirman cómo funciona hoy y otras piden
cambios: avisar al organizador cuando hay plata para devolver, poder volver atrás un torneo empezado por error, el
partido por el 3er puesto como opción y la primera parte del perfil de jugador que faltaba (foto y ranking).

## Requisitos

| Código | Requisito | Estado |
| --- | --- | --- |
| INS-20 | Si una pareja con el pago **aprobado** se da de baja, el organizador recibe un aviso (campanita y mail) con la pareja, la categoría y el monto, y que tiene que devolverle la plata. La devolución se hace por fuera del sistema. | 🚧 |
| TOR-23 | Al cancelar un torneo con inscripciones pagas (pago aprobado), el organizador recibe un aviso con la lista de parejas y montos a devolver. Antes de confirmar la cancelación, la pantalla le dice cuántas parejas pagaron. | 🚧 |
| TOR-24 | Un torneo "En juego" puede volver a "Inscripción" mientras no tenga ningún resultado cargado (ni de zona ni de llave). Las zonas y el fixture se conservan. | 🚧 |
| JUE-25 | Cada categoría puede tener **partido por el 3er puesto** (opción del organizador, apagada por defecto). Si está prendida, al armar la llave se crea ese partido con los perdedores de las semifinales, y el podio muestra 3º y 4º en vez del 3º compartido. | 🚧 |
| JUE-26 | Con las zonas sorteadas no se suman parejas: el cupo se define de antemano y, al completarse, la categoría deja de aceptar inscripciones. (Confirma JUE-07 e INS-09; se agrega el test que falta.) | 🚧 |
| JUG-11 | El jugador puede subir una **foto** (opcional) a su perfil; se ve en su perfil público y en los participantes. Se guarda en Cloudinary y se pide al tamaño en que se muestra. | 🚧 |
| JUG-12 | **Ranking por puntos**, por categoría (nivel y rama) y por año: cada torneo finalizado suma puntos según el puesto alcanzado. Página pública `/ranking` con filtros de categoría y año. | ❓ falta la tabla de puntos (ver pregunta 1) |
| PUB-11 | Un torneo cancelado no aparece en la lista; si alguien entra por su link, ve la ficha con el cartel "Torneo cancelado". | ❓ ver pregunta 2 |

**Fuera de alcance:** devolver la plata desde el sistema, las estrellas del jugador y el ranking general (sin categoría).

## Diseño

- **API:**
  - `PUT /api/torneos/:id/estado` acepta `en_juego → inscripcion` (TOR-24) si no hay resultados.
  - Al cancelar y al dar de baja una pareja paga, se dispara el aviso al organizador en segundo plano (como los avisos de hoy).
  - `PUT /api/jugadores/yo/foto` (subir o quitar la foto).
  - `GET /api/publico/ranking?nivel&rama&anio` (público, con caché; una consulta por pedido).
- **Base de datos:**
  - `torneo_categoria.tercer_puesto` (booleano, falso por defecto);
  - `jugador.foto_url`;
  - el ranking se calcula de los torneos finalizados, con las mismas consultas que ya arman el historial del jugador (`participacionesDe`); no hace falta una tabla nueva.
- **Pantallas:**
  - casilla "Partido por el 3er puesto" en la categoría;
  - podio con 3º y 4º;
  - botón "Volver a inscripción" en el torneo;
  - aviso con la cantidad de parejas que pagaron al cancelar;
  - foto en Mi perfil;
  - página Ranking.
  - Cada una con cargando, error con reintentar, vacío y celular.
- **Configuración:** la tabla de puntos del ranking en `rubros/torneos/torneo_config.js` (`PUNTOS_RANKING`).

## Preguntas abiertas

1. **[JUG-12] — ¿Cuántos puntos da cada puesto?** Propuesta: campeón 100, finalista 70, semifinal 50, cuartos 30,
   octavos 15, solo zona 5. ¿Suma solo el mejor resultado de cada torneo (sí, uno por torneo) y cuentan todos los torneos
   del año? Recomendación: la propuesta, todos los torneos del año.
   **Respuesta:**
2. **[PUB-11] — Torneo cancelado por su link:** (a) como hoy, "No encontramos ese torneo"; (b) la ficha con el cartel
   "Torneo cancelado". Recomendación: (b).
   **Respuesta:**

## Tareas

1. [ ] Aprobar esta spec (preguntas 1 y 2 respondidas).
2. [ ] Tests de cada requisito (fallan al principio).
3. [ ] TOR-24 y JUE-26 (cambios chicos de reglas).
4. [ ] INS-20 y TOR-23 (avisos al organizador).
5. [ ] JUE-25 (3er puesto: modelo, llave, podio y pantalla).
6. [ ] JUG-11 (foto) y JUG-12 (ranking).
7. [ ] Unitarios, integración, navegador y capturas en verde; pasar las reglas a las specs del módulo.

## Riesgos

- **3er puesto:** cambia cómo se arma y se avanza la llave; hay que cuidar el avance, el podio, el cronograma y la
  vista pública.
- **Ranking:** si hay muchos torneos, calcularlo en cada visita sale caro (la base cobra mientras está despierta).
  Por eso va con caché.
- **Volver a inscripción:** los horarios del cronograma se conservan; los avisos ya mandados a los jugadores no se deshacen.
