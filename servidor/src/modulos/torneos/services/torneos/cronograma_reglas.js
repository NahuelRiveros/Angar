// Cronograma automático sin base de datos (se prueba en ux_rules.test.mjs).
// Reparte los partidos sin horario en turnos (día + hora) y canchas: una pareja nunca juega dos a
// la vez, descansa los turnos pedidos entre partido y partido, y la llave va después de las zonas,
// ronda por ronda. Siempre da lo mismo con los mismos datos (sin azar): la vista previa y lo que
// se guarda coinciden.
import { esFechaValida } from "../suscripciones/suscripcion_reglas.js";

export const CRONOGRAMA = { maxDias: 7, maxCanchas: 20, minutos: [30, 45, 60, 75, 90, 120], descansos: [0, 1, 2, 3] };
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const aMinutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
const aHora = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

/** Días, franja, canchas, duración del turno y descanso. Devuelve { datos } o { error }. */
export function validarConfigCronograma(body) {
  const b = body ?? {};
  const dias = [...new Set(Array.isArray(b.dias) ? b.dias : [])].sort();
  if (!dias.length || dias.length > CRONOGRAMA.maxDias || !dias.every(esFechaValida)) return { error: `Elegí entre 1 y ${CRONOGRAMA.maxDias} días válidos.` };
  if (!HORA.test(b.desde ?? "") || !HORA.test(b.hasta ?? "")) return { error: "La franja horaria va en formato HH:MM (por ejemplo, 18:00 a 23:00)." };
  const minutos = Number(b.minutos);
  if (!CRONOGRAMA.minutos.includes(minutos)) return { error: "Elegí la duración del turno." };
  if (aMinutos(b.hasta) - aMinutos(b.desde) < minutos) return { error: "En esa franja no entra ni un turno: revisá desde y hasta." };
  const canchas = Number(b.canchas);
  if (!Number.isInteger(canchas) || canchas < 1 || canchas > CRONOGRAMA.maxCanchas) return { error: `Las canchas van de 1 a ${CRONOGRAMA.maxCanchas}.` };
  const descanso = Number(b.descanso ?? 1);
  if (!CRONOGRAMA.descansos.includes(descanso)) return { error: "El descanso va de 0 a 3 turnos." };
  return { datos: { dias, desde: b.desde, hasta: b.hasta, minutos, canchas, descanso, incluir_llave: b.incluir_llave !== false } };
}

/** Turnos de la grilla, en orden: [{ fecha, hora }]. El último turno tiene que terminar antes de "hasta". */
export function turnosDe({ dias, desde, hasta, minutos }) {
  const turnos = [];
  for (const fecha of dias) {
    for (let m = aMinutos(desde); m + minutos <= aMinutos(hasta); m += minutos) turnos.push({ fecha, hora: aHora(m) });
  }
  return turnos;
}

export const nombreCancha = (n) => `Cancha ${n}`;

/**
 * partidos: [{ id, categoria_id, fase: "zona"|"llave", ronda, orden, zona_id, parejas: [ids o null] }]
 *   — los que ya tienen día u hora no entran acá: el servicio los pasa en `ocupados`.
 * ocupados: [{ fecha, hora, cancha, parejas, categoria_id, fase, ronda }] horarios cargados a mano, que se respetan.
 * Devuelve { asignados: [{ id, fecha, hora, cancha }], sinLugar: [ids] }.
 */
export function armarCronograma({ partidos, config, ocupados = [] }) {
  const turnos = turnosDe(config);
  const canchas = Array.from({ length: config.canchas }, (_, i) => nombreCancha(i + 1));
  const indice = new Map(turnos.map((t, i) => [`${t.fecha} ${t.hora}`, i]));
  const ocupada = new Set();
  const ultimoTurno = new Map(); // pareja → último turno en que juega
  const jugar = (parejas, t) => parejas.filter(Boolean).forEach((p) => ultimoTurno.set(p, Math.max(ultimoTurno.get(p) ?? -Infinity, t)));
  const finZonas = new Map(); // categoría → último turno de sus zonas
  const finRonda = new Map(); // "categoría|ronda" → último turno
  const hasta = (mapa, clave, t) => mapa.set(clave, Math.max(mapa.get(clave) ?? -Infinity, t));
  for (const o of ocupados) {
    const t = indice.get(`${o.fecha} ${o.hora}`);
    if (t === undefined) continue;
    if (o.cancha) ocupada.add(`${t}|${o.cancha}`);
    jugar(o.parejas ?? [], t);
    // Lo ya programado a mano también cuenta para que la llave espere a las zonas y a su ronda anterior.
    if (o.fase === "zona") hasta(finZonas, o.categoria_id, t);
    if (o.fase === "llave") hasta(finRonda, `${o.categoria_id}|${o.ronda}`, t);
  }

  // Zonas: primero la primera "fecha" del fixture de todas las zonas, después la segunda…, así
  // todas las categorías avanzan parejo. La llave, ronda por ronda.
  const zona = partidos.filter((p) => p.fase === "zona").sort((a, b) => a.orden - b.orden || a.categoria_id - b.categoria_id || (a.zona_id ?? 0) - (b.zona_id ?? 0) || a.id - b.id);
  const llave = config.incluir_llave ? partidos.filter((p) => p.fase === "llave").sort((a, b) => a.ronda - b.ronda || a.categoria_id - b.categoria_id || a.orden - b.orden) : [];
  const pendientes = [...zona, ...llave];
  const asignados = [];
  const turnoDe = new Map(); // partido → turno
  const zonasDe = new Map(); // categoría → partidos de zona pendientes
  for (const p of zona) zonasDe.set(p.categoria_id, (zonasDe.get(p.categoria_id) ?? 0) + 1);
  const faltanRonda = new Map(); // "categoría|ronda" → partidos sin turno
  for (const p of llave) faltanRonda.set(`${p.categoria_id}|${p.ronda}`, (faltanRonda.get(`${p.categoria_id}|${p.ronda}`) ?? 0) + 1);

  const descansa = (parejas, t) => parejas.filter(Boolean).every((p) => (ultimoTurno.get(p) ?? -Infinity) < t - config.descanso);
  const puede = (p, t) => {
    if (!descansa(p.parejas, t)) return false;
    if (p.fase === "zona") return true;
    // La llave de una categoría espera a que terminen sus zonas y a la ronda anterior (con descanso).
    if ((zonasDe.get(p.categoria_id) ?? 0) > 0) return false;
    const despuesDe = Math.max(finZonas.get(p.categoria_id) ?? -Infinity, p.ronda > 1 ? finRonda.get(`${p.categoria_id}|${p.ronda - 1}`) ?? -Infinity : -Infinity);
    if (p.ronda > 1 && (faltanRonda.get(`${p.categoria_id}|${p.ronda - 1}`) ?? 0) > 0) return false;
    return despuesDe < t - config.descanso;
  };

  for (let t = 0; t < turnos.length && pendientes.length; t += 1) {
    const enEsteTurno = new Set();
    for (const cancha of canchas) {
      if (ocupada.has(`${t}|${cancha}`)) continue;
      // Una pareja no puede estar en dos canchas en el mismo turno.
      const i = pendientes.findIndex((p) => p.parejas.filter(Boolean).every((x) => !enEsteTurno.has(x)) && puede(p, t));
      if (i === -1) break;
      const [p] = pendientes.splice(i, 1);
      p.parejas.filter(Boolean).forEach((x) => enEsteTurno.add(x));
      asignados.push({ id: p.id, ...turnos[t], cancha });
      turnoDe.set(p.id, t);
    }
    // Lo jugado en este turno cuenta recién al terminar el turno (para el descanso y las rondas).
    for (const a of asignados.filter((x) => turnoDe.get(x.id) === t)) {
      const p = partidos.find((x) => x.id === a.id);
      jugar(p.parejas, t);
      if (p.fase === "zona") {
        zonasDe.set(p.categoria_id, zonasDe.get(p.categoria_id) - 1);
        hasta(finZonas, p.categoria_id, t);
      } else {
        const clave = `${p.categoria_id}|${p.ronda}`;
        faltanRonda.set(clave, faltanRonda.get(clave) - 1);
        hasta(finRonda, clave, t);
      }
    }
  }
  return { asignados, sinLugar: pendientes.map((p) => p.id) };
}
