import { FORMATOS_PARTIDO } from "../../../../../torneo_config.js";

// Modelos de reglamento para empezar: redactados con las reglas habituales del pádel (no son textos
// oficiales de ninguna federación). El organizador los edita; lo propio de cada torneo va como [COMPLETAR].

const ENCABEZADO = "(Modelo base: revisalo y ajustalo a tu torneo antes de publicarlo.)";

const GENERAL = `REGLAMENTO GENERAL DEL TORNEO
${ENCABEZADO}

1. Puntualidad
- Las parejas tienen que estar en el club 15 minutos antes de su partido.
- Tolerancia: 15 minutos desde la hora programada. Pasado ese tiempo, la pareja ausente pierde por W.O. (6-0 en cada set).
- Si ninguna de las dos parejas se presenta, el partido cuenta como perdido para ambas.

2. Pelotas y canchas
- La organización entrega las pelotas de cada partido: [COMPLETAR marca y cantidad].
- La cancha y el horario los define la organización; se publican en la página del torneo.
- Peloteo previo: hasta 5 minutos.

3. Reglas de juego
- Se aplican las reglas oficiales del pádel (saque, puntuación, uso de paredes y red).
- Cada pareja canta sus propias pelotas dudosas; ante la duda, el punto se juega de nuevo.
- Los cambios de lado se hacen en los games impares.

4. Vestimenta y conducta
- Calzado de pádel o de suela lisa obligatorio.
- Se espera respeto hacia rivales, compañeros, organización y público. Las faltas graves de conducta pueden terminar en descalificación.

5. Resultados y reclamos
- Al terminar el partido, las dos parejas informan el resultado a la organización.
- Los reclamos se hacen en el momento, ante la organización, que decide en forma definitiva.

6. Contacto de la organización: [COMPLETAR WhatsApp o teléfono].`;

const SUMA = `REGLAMENTO DE CATEGORÍAS SUMA
${ENCABEZADO}

1. Cómo se arma la pareja
- En una categoría "Suma", la suma de las categorías de los dos jugadores no puede ser menor al número de la categoría. Ejemplo: en Suma 13 pueden jugar un 6ta con un 7ma (6 + 7 = 13) o un 5ta con un 8va.
- Se toma la categoría en la que cada jugador compite actualmente según [COMPLETAR ranking o asociación de referencia].
- Las damas suman [COMPLETAR: por ejemplo, una categoría más que su categoría de damas] (ajustá o borrá esta regla).

2. Control
- La organización puede pedir que se acredite la categoría de cada jugador antes del primer partido.
- Si se comprueba que un jugador juega en una categoría más baja que la real, la pareja queda descalificada y pierde los partidos jugados.

3. Todo lo demás se rige por el reglamento general del torneo.`;

const UN_DIA = `REGLAMENTO DE TORNEO DE UN DÍA
${ENCABEZADO}

1. Horarios
- El torneo se juega en el día: [COMPLETAR fecha y hora de inicio].
- Los partidos son corridos: al terminar uno, la cancha libre se asigna al siguiente partido programado.
- Tolerancia: 10 minutos. Pasado ese tiempo, la pareja ausente pierde por W.O.

2. Formato de los partidos
- Zonas: un set a 6 games, con tie-break en 6-6 (o un set a 9, según la categoría).
- Llave: un set a 6 games hasta la final; la final, al mejor de 3 sets con super tie-break (ajustá si lo jugás más corto).
- Peloteo previo: 3 minutos.

3. Resultados
- Cada pareja informa el resultado apenas termina para que se pueda programar el siguiente partido.

4. Todo lo demás se rige por el reglamento general del torneo.`;

const MIXTO = `REGLAMENTO DE CATEGORÍAS MIXTAS
${ENCABEZADO}

1. Parejas
- Cada pareja está formada por un jugador y una jugadora.

2. Saque y juego
- Se aplican las reglas oficiales del pádel, sin cambios en el saque ni en la puntuación.

3. Regla local (opcional: borrala si en tu torneo no se usa)
- No se permite el remate (smash) con potencia dirigido a la jugadora cuando está en la red. Si ocurre, el punto es para la pareja que lo recibe.
- Se permiten las bandejas y los remates hacia el fondo de la cancha o hacia las paredes.
- Ante la duda, decide la organización.

4. Conducta
- Se espera juego limpio y respeto entre todos los jugadores.

5. Todo lo demás se rige por el reglamento general del torneo.`;

function zonasYLlave(torneo) {
  const categorias = torneo.categorias ?? [];
  const porCategoria = categorias.length
    ? categorias.map((c) => `- ${c.nombre}: zonas de ${c.parejas_por_zona} parejas, todos contra todos, clasifican ${c.clasifican_por_zona === 1 ? "el primero" : `los ${c.clasifican_por_zona} primeros`}. `
      + `Partidos de zona: ${FORMATOS_PARTIDO[c.formato_zona]?.etiqueta.toLowerCase()}. Partidos de llave: ${FORMATOS_PARTIDO[c.formato_llave]?.etiqueta.toLowerCase()}.`)
      .join("\n")
    : "- [COMPLETAR: cargá las categorías y volvé a usar este modelo para que se complete solo].";
  return `ZONAS Y LLAVE
${ENCABEZADO}

1. Formato por categoría
${porCategoria}

2. Armado de las zonas
- Las zonas se sortean entre las parejas confirmadas. Las cabezas de serie quedan en zonas distintas.
- Si las parejas no alcanzan para zonas iguales, algunas zonas pueden tener una pareja más.

3. Posiciones en la zona (en este orden)
1) Partidos ganados.
2) Diferencia de sets.
3) Diferencia de games.
4) Si empatan dos parejas: el partido entre ellas.
5) Games a favor.
6) Sorteo: lo hace el sistema al armar las zonas y queda indicado en la tabla.
- El super tie-break cuenta como un set y como un game.

4. Llave
- Clasificados los primeros de zona como cabezas de serie, en orden (A, B, C…), y después los segundos.
- Si sobran lugares en la llave, los completan los mejores terceros (o los mejores segundos si clasifica uno por zona) de todas las zonas. Se comparan, en promedio por partido: ganados, diferencia de sets, diferencia de games y games a favor; si sigue el empate, sorteo.
- Nadie cruza en la primera ronda a una pareja de su misma zona.
- No se juega partido por el tercer puesto: los semifinalistas lo comparten.

5. Resultados
- Los resultados se cargan en el sistema y se pueden seguir en la página pública del torneo.`;
}

export const MODELOS_REGLAMENTO = [
  { codigo: "general", etiqueta: "General de torneo" },
  { codigo: "zonas_llave", etiqueta: "Zonas y llave (con lo configurado en las categorías)" },
  { codigo: "suma", etiqueta: "Categorías suma" },
  { codigo: "un_dia", etiqueta: "Torneo de un día" },
  { codigo: "mixto", etiqueta: "Categorías mixtas" },
];

/** Texto del modelo elegido; el de zonas y llave se arma con las categorías del torneo. */
export function textoDeModelo(codigo, torneo) {
  return { general: GENERAL, suma: SUMA, un_dia: UN_DIA, mixto: MIXTO, zonas_llave: zonasYLlave(torneo) }[codigo] ?? "";
}
