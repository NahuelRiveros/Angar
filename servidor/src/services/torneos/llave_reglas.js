// Llave eliminatoria sin base de datos (se prueba en ux_rules.test.mjs).
// Los slots son las posiciones de la primera ronda: el slot 2i juega contra el 2i+1.

/** Orden clásico de siembra: el 1 y el 2 en mitades opuestas, el 1 contra el último. */
export function ordenDeSiembra(tamanio) {
  let orden = [1, 2];
  while (orden.length < tamanio) {
    const siguiente = orden.length * 2;
    orden = orden.flatMap((s) => [s, siguiente + 1 - s]);
  }
  return orden.slice(0, tamanio);
}

export const potenciaDeDos = (n) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

/** "Final", "Semifinal", "Cuartos de final"… según cuántos partidos tiene la ronda. */
export function nombreRonda(partidosEnRonda) {
  return { 1: "Final", 2: "Semifinal", 4: "Cuartos de final", 8: "Octavos de final", 16: "16avos de final" }[partidosEnRonda] ?? `Ronda de ${partidosEnRonda * 2}`;
}

/**
 * Ubica a los clasificados en la llave.
 * zonas: [{ nombre, clasificados: [id del 1º, id del 2º?] }] en orden A, B, C…
 * - Los 1º son las cabezas de serie en orden de zona: si sobran lugares, el pase (bye) es para ellos.
 * - Un 2º nunca cruza en primera ronda al 1º de su zona, y si se puede queda en la otra mitad
 *   del cuadro (así recién se podrían volver a cruzar en la final).
 * Devuelve { tamanio, slots } con el id de cada posición o null si es un pase.
 */
export function armarLlave(zonas) {
  const primeros = zonas.map((z, i) => ({ id: z.clasificados[0], zona: i })).filter((p) => p.id);
  const segundos = zonas.map((z, i) => ({ id: z.clasificados[1], zona: i })).filter((p) => p.id);
  const cantidad = primeros.length + segundos.length;
  if (cantidad < 2) return { error: "Hacen falta al menos 2 parejas clasificadas para armar la llave." };

  const tamanio = potenciaDeDos(cantidad);
  const orden = ordenDeSiembra(tamanio);
  const slotDeSemilla = new Map(orden.map((semilla, slot) => [semilla, slot]));
  const slots = Array(tamanio).fill(null);
  const zonaDelSlot = Array(tamanio).fill(null);
  primeros.forEach((p, i) => { slots[slotDeSemilla.get(i + 1)] = p.id; zonaDelSlot[slotDeSemilla.get(i + 1)] = p.zona; });

  const mitad = (slot) => (slot < tamanio / 2 ? 0 : 1);
  const slotDelPrimero = new Map(primeros.map((p, i) => [p.zona, slotDeSemilla.get(i + 1)]));
  const lugares = Array.from({ length: segundos.length }, (_, i) => slotDeSemilla.get(primeros.length + i + 1));

  // Prueba con la condición preferida (otra mitad); si no hay forma, solo con la obligatoria.
  for (const exigirOtraMitad of [true, false]) {
    const usados = new Set();
    const asignado = [];
    const sirve = (segundo, slot) => {
      if (zonaDelSlot[slot ^ 1] === segundo.zona) return false; // su rival en primera ronda sería el 1º de su zona
      const delPrimero = slotDelPrimero.get(segundo.zona);
      return !exigirOtraMitad || delPrimero === undefined || mitad(delPrimero) !== mitad(slot);
    };
    const ubicar = (i) => {
      if (i === lugares.length) return true;
      // Preferencia: el 2º de la zona "siguiente" a la de su rival (1ºA contra 2ºB, 1ºB contra 2ºC…).
      const rival = zonaDelSlot[lugares[i] ^ 1];
      const candidatos = segundos.filter((s) => !usados.has(s.id))
        .sort((a, b) => (rival === null ? 0 : ((a.zona - rival + zonas.length) % zonas.length) - ((b.zona - rival + zonas.length) % zonas.length)) || a.zona - b.zona);
      for (const candidato of candidatos) {
        if (!sirve(candidato, lugares[i])) continue;
        usados.add(candidato.id);
        asignado[i] = candidato;
        if (ubicar(i + 1)) return true;
        usados.delete(candidato.id);
      }
      return false;
    };
    if (ubicar(0)) {
      asignado.forEach((s, i) => { slots[lugares[i]] = s.id; });
      return { tamanio, slots };
    }
  }
  // Solo pasa con una única zona de 2 clasificados: inevitable que se crucen.
  segundos.forEach((s, i) => { slots[lugares[i]] = s.id; });
  return { tamanio, slots };
}

/**
 * Partidos de toda la llave. Ronda 1 = la primera; los pases (bye) no generan partido:
 * la pareja ya aparece en su lugar de la ronda 2. Las rondas siguientes nacen sin parejas.
 * Cada partido: { ronda, orden, pareja1, pareja2 } (orden = posición dentro de la ronda).
 */
export function partidosDeLlave({ tamanio, slots }) {
  const rondas = Math.log2(tamanio);
  const partidos = [];
  for (let ronda = 1; ronda <= rondas; ronda += 1) {
    const enRonda = tamanio / 2 ** ronda;
    for (let orden = 0; orden < enRonda; orden += 1) partidos.push({ ronda, orden, pareja1: null, pareja2: null });
  }
  const buscar = (ronda, orden) => partidos.find((p) => p.ronda === ronda && p.orden === orden);
  for (let i = 0; i < tamanio / 2; i += 1) {
    const [a, b] = [slots[2 * i], slots[2 * i + 1]];
    if (a && b) Object.assign(buscar(1, i), { pareja1: a, pareja2: b });
    else if (rondas > 1) buscar(2, Math.floor(i / 2))[i % 2 === 0 ? "pareja1" : "pareja2"] = a ?? b;
  }
  // Una primera ronda que es toda de pases no se juega.
  return partidos.filter((p) => !(p.ronda === 1 && (!p.pareja1 || !p.pareja2)));
}

/** Adónde va el ganador de un partido de llave (null si era la final). */
export function destinoDelGanador({ ronda, orden }, rondas) {
  if (ronda >= rondas) return null;
  return { ronda: ronda + 1, orden: Math.floor(orden / 2), lado: orden % 2 === 0 ? "pareja1_id" : "pareja2_id" };
}

/** Campeón, subcampeón y semifinalistas a partir de los partidos jugados. */
export function podio(partidos, rondas) {
  const final = partidos.find((p) => p.ronda === rondas);
  const perdedor = (p) => (p.ganador_id === p.pareja1_id ? p.pareja2_id : p.pareja1_id);
  const semis = rondas > 1 ? partidos.filter((p) => p.ronda === rondas - 1 && p.ganador_id) : [];
  return {
    campeon: final?.ganador_id ?? null,
    subcampeon: final?.ganador_id ? perdedor(final) : null,
    semifinalistas: semis.map(perdedor),
  };
}
