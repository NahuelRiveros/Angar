# Módulo: vista pública (`PUB`)

## Objetivo

Que cualquiera, sin cuenta, encuentre torneos y siga en vivo zonas, resultados y llave, sin ver
nunca datos privados de los jugadores.

## Alcance

- **Incluye:** la lista `/torneos` con búsqueda y filtros, la ficha `/torneos/:id`, los resultados por
  categoría, los participantes y "Compartir".
- **No incluye:** anotarse ([inscripciones.md](inscripciones.md)); el perfil público del jugador
  ([jugadores.md](jugadores.md)).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Visitante (sin cuenta) | Todo lo de este módulo. |
| Jugador / organizador | Lo mismo; además, anotarse desde la ficha. |

## Reglas

### Qué se publica

| Código | Regla | Estado |
| --- | --- | --- |
| PUB-01 | Se ven solo los torneos en Inscripción, En juego o Finalizado; nunca un Borrador (tampoco por su dirección). | ✅ `llave.integration.mjs` › "vista pública: …nada de borradores ni teléfonos" |
| PUB-02 | La vista pública muestra solo nombres de parejas: nunca teléfonos, notas ni datos de contacto. | ✅ `juego.integration.mjs` › "cupo: …la vista pública no muestra teléfonos"; `llave.integration.mjs` › "vista pública…" |
| PUB-03 | Un torneo Cancelado no aparece en la lista. | ❓ ver pregunta 1 |

### Lista de torneos

| Código | Regla | Estado |
| --- | --- | --- |
| PUB-04 | Búsqueda por texto y filtros por estado, rama y nivel (un torneo entra si alguna categoría lo juega). Los filtros viven en la dirección; lo que no se reconoce se ignora sin error. | ✅ `ux_rules.test.mjs` › "lista pública: filtros con allowlist…"; `juego.spec.js` › "lista de torneos…" |
| PUB-05 | Cada tarjeta resume: categorías y ramas, el formato (si todas juegan igual), parejas confirmadas, lugares libres (solo si todas las categorías tienen cupo) y el premio del campeón. | ✅ `ux_rules.test.mjs` › "lista pública: …resumen de la tarjeta" |

### Ficha y resultados

| Código | Regla | Estado |
| --- | --- | --- |
| PUB-06 | La ficha muestra datos, categorías, premios, reglamento, monto por pareja y la cuenta para transferir (CBU y alias para copiar). | ✅ `juego.spec.js` › "visitante: la ficha muestra el monto por pareja y la cuenta…" |
| PUB-07 | Por categoría: zonas con tabla, fixture y resultados, y la llave con el podio. | ✅ `publico.spec.js` › "sin cuenta se siguen la llave, las zonas y los resultados…" |
| PUB-08 | Sin actualización automática: los datos se guardan 30 segundos y hay un botón "Actualizar" (la base cobra mientras está despierta). | ⚠️ sin test |
| PUB-09 | Participantes: las parejas de cada categoría; los jugadores con cuenta muestran su historial y llevan a su perfil público. | ✅ `jugadores.spec.js` › "los participantes muestran el historial…" |
| PUB-10 | "Compartir": en el celular abre el menú del teléfono; en la compu copia el link. | ✅ `publico.spec.js` › "compartir copia el link del torneo" |

## Dónde está el código

- Servidor: `services/torneos/publico_service.js`, `publico_reglas.js`; rutas `/api/publico/torneos`.
- Frontend: `publico/` (`/torneos`, `/torneos/:id`).

## Preguntas abiertas

1. **[PUB-03] — ¿Los torneos cancelados se muestran?** Hoy no aparecen en la lista pública. Opciones:
   (a) no, como hoy; (b) sí, marcados "Cancelado", para que el que tenía el link entienda qué pasó.
   Recomendación: (b) solo por su link directo, no en la lista.
   **Respuesta:**
