// Zonas, fixture, resultados y posiciones sin base de datos (se prueban en ux_rules.test.mjs).
import { FORMATOS_PARTIDO } from "../../../../torneo_config.js";

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const nombreZona = (indice) => LETRAS[indice] ?? `Z${indice + 1}`;

// ── Marcadores ──────────────────────────────────────────────────────────────

/** Set normal: a 6 se gana 6-0..6-4, 7-5 o 7-6; el set largo a 9 se gana 9-0..9-8 (tie-break en 8-8). */
function setValido(a, b, games) {
  const [mayor, menor] = a > b ? [a, b] : [b, a];
  if (a === b) return false;
  if (games === 9) return mayor === 9 && menor <= 8;
  return (mayor === 6 && menor <= 4) || (mayor === 7 && (menor === 5 || menor === 6));
}

/** Super tie-break a 10, por dos de diferencia: 10-8, 11-9, 15-13… */
function superTieBreakValido(a, b) {
  const [mayor, menor] = a > b ? [a, b] : [b, a];
  return mayor >= 10 && mayor - menor >= 2 && (mayor === 10 || mayor - menor === 2);
}

/**
 * Valida el marcador según el formato y dice quién ganó (1 o 2).
 * sets: [[games pareja 1, games pareja 2], ...]. No se aceptan sets después de que alguien ganó.
 */
export function validarResultado(sets, codigoFormato) {
  const formato = FORMATOS_PARTIDO[codigoFormato];
  if (!formato) return { error: "Formato de partido desconocido." };
  if (!Array.isArray(sets) || !sets.length) return { error: "Cargá el resultado de al menos un set." };
  const necesarios = Math.ceil(formato.sets / 2);
  const ganados = [0, 0];
  const limpios = [];
  for (const [i, set] of sets.entries()) {
    if (ganados[0] === necesarios || ganados[1] === necesarios) return { error: "Sobra un set: el partido ya estaba definido." };
    if (!Array.isArray(set) || set.length !== 2 || !set.every((g) => Number.isInteger(g) && g >= 0 && g <= 99)) {
      return { error: `El set ${i + 1} tiene que tener dos números enteros.` };
    }
    const [a, b] = set;
    const esSuperTieBreak = formato.superTieBreak && i === formato.sets - 1;
    if (esSuperTieBreak ? !superTieBreakValido(a, b) : !setValido(a, b, formato.games)) {
      return { error: esSuperTieBreak
        ? `El super tie-break (set ${i + 1}) va a 10 puntos con 2 de diferencia: ${a}-${b} no es válido.`
        : `El set ${i + 1} (${a}-${b}) no es un resultado válido para sets a ${formato.games} games.` };
    }
    ganados[a > b ? 0 : 1] += 1;
    limpios.push([a, b]);
  }
  if (ganados[0] < necesarios && ganados[1] < necesarios) return { error: "Falta cargar sets: el partido no quedó definido." };
  return { datos: { sets: limpios, ganador: ganados[0] === necesarios ? 1 : 2 } };
}

// ── Armado de zonas ─────────────────────────────────────────────────────────

/**
 * Cuántas parejas va a tener cada zona. Busca zonas del tamaño pedido (o una más si sobran);
 * si para eso alguna tendría que quedar con 2, prefiere una zona más grande.
 */
export function tamaniosDeZonas(cantidad, parejasPorZona) {
  if (cantidad < 2) return [];
  const repartir = (zonas) => Array.from({ length: zonas }, (_, i) => Math.floor(cantidad / zonas) + (i < cantidad % zonas ? 1 : 0));
  const pocas = Math.max(1, Math.floor(cantidad / parejasPorZona));
  const tamanios = repartir(pocas);
  if (tamanios[0] <= parejasPorZona + 1) return tamanios;
  const masZonas = repartir(Math.ceil(cantidad / parejasPorZona));
  return Math.min(...masZonas) >= 3 ? masZonas : tamanios;
}

/** Fisher-Yates con el azar inyectable (los tests lo fijan). */
function mezclar(lista, azar) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Reparte las parejas confirmadas en zonas. Las cabezas de serie van primero, una por zona
 * (en su orden); el resto se sortea y completa cada zona hasta su tamaño.
 * Devuelve [{ nombre: "A", parejas: [ids] }, ...].
 */
export function armarZonas(parejas, parejasPorZona, azar = Math.random) {
  const tamanios = tamaniosDeZonas(parejas.length, parejasPorZona);
  const zonas = tamanios.map((tamanio, i) => ({ nombre: nombreZona(i), tamanio, parejas: [] }));
  const cabezas = parejas.filter((p) => p.cabeza_de_serie);
  const resto = mezclar(parejas.filter((p) => !p.cabeza_de_serie), azar);
  let turno = 0;
  const conLugar = () => zonas.filter((z) => z.parejas.length < z.tamanio);
  for (const pareja of [...cabezas, ...resto]) {
    const libres = conLugar();
    // Recorre las zonas en ronda: así las cabezas quedan separadas y el resto se reparte parejo.
    const zona = libres[turno % libres.length];
    zona.parejas.push(pareja.id);
    turno += 1;
  }
  return zonas.map(({ nombre, parejas: ids }) => ({ nombre, parejas: ids }));
}

/** Todos contra todos por fechas (método del círculo): nadie juega dos partidos en la misma fecha. */
export function fixtureTodosContraTodos(ids) {
  const lista = ids.length % 2 ? [...ids, null] : [...ids];
  const partidos = [];
  for (let fecha = 0; fecha < lista.length - 1; fecha += 1) {
    for (let i = 0; i < lista.length / 2; i += 1) {
      const [a, b] = [lista[i], lista[lista.length - 1 - i]];
      if (a !== null && b !== null) partidos.push([a, b]);
    }
    lista.splice(1, 0, lista.pop()); // rota todos menos el primero
  }
  return partidos;
}

// ── Tabla de posiciones ─────────────────────────────────────────────────────

/**
 * Posiciones de una zona: partidos ganados → diferencia de sets → diferencia de games →
 * resultado entre ellas (si empatan exactamente dos). El super tie-break cuenta como un set
 * y como un game para quien lo gana. Los clasificados se marcan cuando la zona terminó.
 * partidos: [{ pareja1_id, pareja2_id, ganador_id, sets, formato }].
 */
export function tablaDeZona(parejas, partidos, clasifican) {
  const fila = new Map(parejas.map((id) => [id, { inscripcion_id: id, pj: 0, pg: 0, pp: 0, sets_favor: 0, sets_contra: 0, games_favor: 0, games_contra: 0 }]));
  const jugados = partidos.filter((p) => p.ganador_id && p.sets?.length);
  for (const p of jugados) {
    const uno = fila.get(p.pareja1_id);
    const dos = fila.get(p.pareja2_id);
    if (!uno || !dos) continue;
    const formato = FORMATOS_PARTIDO[p.formato];
    for (const [i, [a, b]] of p.sets.entries()) {
      const esSuperTieBreak = Boolean(formato?.superTieBreak) && i === formato.sets - 1;
      const [ga, gb] = esSuperTieBreak ? (a > b ? [1, 0] : [0, 1]) : [a, b];
      uno.games_favor += ga; uno.games_contra += gb;
      dos.games_favor += gb; dos.games_contra += ga;
      if (a > b) { uno.sets_favor += 1; dos.sets_contra += 1; } else { dos.sets_favor += 1; uno.sets_contra += 1; }
    }
    uno.pj += 1; dos.pj += 1;
    const [ganador, perdedor] = p.ganador_id === p.pareja1_id ? [uno, dos] : [dos, uno];
    ganador.pg += 1; perdedor.pp += 1;
  }

  const clave = (f) => [f.pg, f.sets_favor - f.sets_contra, f.games_favor - f.games_contra];
  const comparar = (x, y) => {
    const [a, b] = [clave(x), clave(y)];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i];
    return 0;
  };
  const filas = [...fila.values()].sort((x, y) => comparar(x, y) || x.inscripcion_id - y.inscripcion_id);

  // Entre ellas: solo cuando el empate es de exactamente dos parejas.
  for (let i = 0; i < filas.length - 1; i += 1) {
    const grupo = filas.filter((f) => comparar(f, filas[i]) === 0);
    if (grupo.length !== 2 || grupo[0] !== filas[i]) continue;
    const [x, y] = grupo;
    const directo = jugados.find((p) => [p.pareja1_id, p.pareja2_id].includes(x.inscripcion_id) && [p.pareja1_id, p.pareja2_id].includes(y.inscripcion_id));
    if (directo?.ganador_id === y.inscripcion_id) [filas[i], filas[i + 1]] = [y, x];
  }

  const completa = parejas.length > 1 && jugados.length === (parejas.length * (parejas.length - 1)) / 2;
  return {
    completa,
    filas: filas.map((f, i) => ({ ...f, posicion: i + 1, clasificado: completa && i < clasifican })),
  };
}
