// Llave eliminatoria sin base de datos (se prueba en ux_rules.test.mjs).
// Los slots son las posiciones de la primera ronda: el slot 2i juega contra el 2i+1.
import { potenciaDeDos, nombreRonda } from "../../../../torneo_config.js";

// Viven en torneo_config.js porque también los usa el cálculo que ve el organizador.
export { potenciaDeDos, nombreRonda };

/** Orden clásico de siembra: el 1 y el 2 en mitades opuestas, el 1 contra el último. */
export function ordenDeSiembra(tamanio) {
  let orden = [1, 2];
  while (orden.length < tamanio) {
    const siguiente = orden.length * 2;
    orden = orden.flatMap((s) => [s, siguiente + 1 - s]);
  }
  return orden.slice(0, tamanio);
}

/**
 * Ubica a los clasificados en la llave.
 * zonas: [{ nombre, clasificados: [id del 1º, id del 2º?] }] en orden A, B, C…
 * mejores: [{ id, zona }] los mejores del puesto siguiente que completan la llave, del mejor al peor.
 * - Los 1º son las cabezas de serie en orden de zona; después los 2º y al final los mejores
 *   (en su orden). Si todavía sobran lugares, el pase (bye) es para los 1º.
 * - Nadie cruza en primera ronda a alguien de su misma zona, y si se puede el 2º (o el mejor
 *   tercero) queda en la otra mitad del cuadro que el 1º de su zona.
 * Devuelve { tamanio, slots } con el id de cada posición o null si es un pase.
 */
const LIMITE_DE_PASOS = 20000;

/**
 * Último arreglo: si dos de la misma zona quedaron cruzados en primera ronda (pasa cuando las
 * semillas fijas de los 1º no dejan otra), intercambia al de peor semilla con otro, empezando por
 * las semillas más bajas, siempre que el cambio no arme un cruce nuevo.
 */
function separarCruces(slots, zonaDelSlot, orden) {
  const cruzado = (slot) => slots[slot] !== null && slots[slot ^ 1] !== null && zonaDelSlot[slot] === zonaDelSlot[slot ^ 1];
  const porSemillaBaja = slots.map((_, slot) => slot).sort((a, b) => orden[b] - orden[a]);
  for (const slot of porSemillaBaja) {
    if (!cruzado(slot)) continue;
    const peor = orden[slot] > orden[slot ^ 1] ? slot : slot ^ 1;
    for (const otro of porSemillaBaja) {
      if (otro === peor || otro === (peor ^ 1) || slots[otro] === null) continue;
      const [zonaA, zonaB] = [zonaDelSlot[peor], zonaDelSlot[otro]];
      if (zonaA === zonaDelSlot[otro ^ 1] || zonaB === zonaDelSlot[peor ^ 1]) continue;
      [slots[peor], slots[otro]] = [slots[otro], slots[peor]];
      [zonaDelSlot[peor], zonaDelSlot[otro]] = [zonaB, zonaA];
      break;
    }
  }
}

export function armarLlave(zonas, mejores = []) {
  const primeros = zonas.map((z, i) => ({ id: z.clasificados[0], zona: i })).filter((p) => p.id);
  const segundos = zonas.map((z, i) => ({ id: z.clasificados[1], zona: i })).filter((p) => p.id);
  const terceros = mejores.map((m) => ({ id: m.id, zona: m.zona }));
  const cantidad = primeros.length + segundos.length + terceros.length;
  if (cantidad < 2) return { error: "Hacen falta al menos 2 parejas clasificadas para armar la llave." };

  const tamanio = potenciaDeDos(cantidad);
  const orden = ordenDeSiembra(tamanio);
  const slotDeSemilla = new Map(orden.map((semilla, slot) => [semilla, slot]));
  const slots = Array(tamanio).fill(null);
  const zonaDelSlot = Array(tamanio).fill(null);
  primeros.forEach((p, i) => { slots[slotDeSemilla.get(i + 1)] = p.id; zonaDelSlot[slotDeSemilla.get(i + 1)] = p.zona; });

  const mitad = (slot) => (slot < tamanio / 2 ? 0 : 1);
  const slotDelPrimero = new Map(primeros.map((p, i) => [p.zona, slotDeSemilla.get(i + 1)]));
  const resto = [...segundos, ...terceros];
  const lugares = Array.from({ length: resto.length }, (_, i) => slotDeSemilla.get(primeros.length + i + 1));

  // Prueba con la condición preferida (otra mitad); si no hay forma, solo con la obligatoria.
  // Cada intento tiene un tope de pasos: con muchas zonas la búsqueda completa sería eterna.
  for (const exigirOtraMitad of [true, false]) {
    const usados = new Set();
    const asignado = [];
    let pasos = 0;
    const sirve = (pareja, slot) => {
      if (zonaDelSlot[slot ^ 1] === pareja.zona) return false; // su rival en primera ronda sería de su zona
      const delPrimero = slotDelPrimero.get(pareja.zona);
      return !exigirOtraMitad || delPrimero === undefined || mitad(delPrimero) !== mitad(slot);
    };
    const ubicar = (i) => {
      if (i === lugares.length) return true;
      if ((pasos += 1) > LIMITE_DE_PASOS) return false;
      const rival = zonaDelSlot[lugares[i] ^ 1];
      // Los 2º van primero: preferencia por la zona "siguiente" a la de su rival (1ºA contra 2ºB…).
      // Los mejores terceros mantienen su orden: el mejor toma la mejor semilla que pueda.
      const candidatos = i < segundos.length
        ? segundos.filter((s) => !usados.has(s.id))
          .sort((a, b) => (rival === null ? 0 : ((a.zona - rival + zonas.length) % zonas.length) - ((b.zona - rival + zonas.length) % zonas.length)) || a.zona - b.zona)
        : terceros.filter((s) => !usados.has(s.id));
      for (const candidato of candidatos) {
        if (!sirve(candidato, lugares[i])) continue;
        usados.add(candidato.id);
        asignado[i] = candidato;
        zonaDelSlot[lugares[i]] = candidato.zona;
        if (ubicar(i + 1)) return true;
        usados.delete(candidato.id);
        zonaDelSlot[lugares[i]] = null;
      }
      return false;
    };
    if (ubicar(0)) {
      asignado.forEach((s, i) => { slots[lugares[i]] = s.id; });
      separarCruces(slots, zonaDelSlot, orden);
      return { tamanio, slots };
    }
  }
  // Sin solución (por ejemplo, una única zona) o búsqueda agotada: de a uno, evitando su zona si se puede.
  const libres = [...resto];
  lugares.forEach((lugar) => {
    const pool = libres.filter((s) => segundos.includes(s)).length ? libres.filter((s) => segundos.includes(s)) : libres;
    const elegido = pool.find((s) => zonaDelSlot[lugar ^ 1] !== s.zona) ?? pool[0];
    libres.splice(libres.indexOf(elegido), 1);
    slots[lugar] = elegido.id;
    zonaDelSlot[lugar] = elegido.zona;
  });
  separarCruces(slots, zonaDelSlot, orden);
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
