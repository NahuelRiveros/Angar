// Zonas, fixture, resultados y posiciones sin base de datos (se prueban en ux_rules.test.mjs).
import { FORMATOS_PARTIDO, tamaniosDeZonas, completarLlave } from "../../../../torneo_config.js";
import { esFechaValida } from "../suscripciones/suscripcion_reglas.js";

// El cálculo de tamaños vive en torneo_config.js porque también lo muestra la interfaz.
export { tamaniosDeZonas };

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
 * Día, hora y cancha de un partido. Todo opcional: vacío borra el dato.
 * Devuelve { datos: { fecha, hora, cancha } } o { error }.
 */
export function validarProgramacion(body) {
  const b = body ?? {};
  const limpio = (v) => (typeof v === "string" ? v.trim() : v ?? "");
  const [fecha, hora, cancha] = [limpio(b.fecha), limpio(b.hora), limpio(b.cancha)];
  if ([fecha, hora, cancha].some((v) => typeof v !== "string")) return { error: "Día, hora y cancha van como texto." };
  if (fecha && !esFechaValida(fecha)) return { error: "El día tiene que ser una fecha válida (AAAA-MM-DD)." };
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { error: "La hora tiene que ser HH:MM (por ejemplo, 18:30)." };
  if (cancha.length > 40) return { error: "La cancha puede tener hasta 40 caracteres." };
  return { datos: { fecha: fecha || null, hora: hora || null, cancha: cancha || null } };
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

// Desempate final: el número que recibe cada pareja al sortear las zonas (azar guardado de antemano,
// así la tabla da siempre lo mismo). Sin número, el id: estable aunque no sea azar.
const numeroDeSorteo = (sorteo, id) => sorteo.get(id) ?? id;

/**
 * Posiciones de una zona: ganados → diferencia de sets → diferencia de games → entre ellas (si empatan
 * dos) → games a favor → sorteo. `desempate` dice qué definió el lugar de una fila frente a la de al lado
 * cuando venían iguales ("entre_ellas", "games_favor" o "sorteo"); null si alcanzó con lo anterior.
 * Clasifican las primeras `clasifican` recién con la zona terminada.
 */
export function tablaDeZona(parejas, partidos, clasifican, sorteo = new Map()) {
  const fila = new Map(parejas.map((id) => [id, { inscripcion_id: id, pj: 0, pg: 0, pp: 0, sets_favor: 0, sets_contra: 0, games_favor: 0, games_contra: 0, desempate: null }]));
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

  const principal = (f) => [f.pg, f.sets_favor - f.sets_contra, f.games_favor - f.games_contra];
  const filas = ordenarConDesempate([...fila.values()], principal, (x, y) => {
    const directo = jugados.find((p) => [p.pareja1_id, p.pareja2_id].includes(x.inscripcion_id) && [p.pareja1_id, p.pareja2_id].includes(y.inscripcion_id));
    return directo ? (directo.ganador_id === x.inscripcion_id ? -1 : 1) : 0;
  }, (f) => f.games_favor, (f) => numeroDeSorteo(sorteo, f.inscripcion_id));

  const completa = parejas.length > 1 && jugados.length === (parejas.length * (parejas.length - 1)) / 2;
  return {
    completa,
    filas: filas.map((f, i) => ({ ...f, posicion: i + 1, clasificado: completa && i < clasifican })),
  };
}

/**
 * Ordena por `principal` (mayor primero). Cada grupo empatado se define: si son dos, `entreEllas`
 * (−1 si va primero x); después `gamesFavor` (mayor primero) y por último el número de `sorteo`.
 * Marca en `desempate` el criterio que separó a cada fila de su vecina empatada.
 */
function ordenarConDesempate(lista, principal, entreEllas, gamesFavor, numero) {
  const comparar = (x, y) => {
    const [a, b] = [principal(x), principal(y)];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i];
    return 0;
  };
  const ordenadas = [...lista].sort(comparar);
  const resultado = [];
  for (let i = 0; i < ordenadas.length;) {
    let fin = i + 1;
    while (fin < ordenadas.length && comparar(ordenadas[i], ordenadas[fin]) === 0) fin += 1;
    const grupo = ordenadas.slice(i, fin);
    if (grupo.length === 1) {
      // Sin empate en este orden: no arrastra el desempate de otro (el de su zona, por ejemplo).
      resultado.push({ ...grupo[0], desempate: null });
    } else {
      const directo = grupo.length === 2 && entreEllas ? entreEllas(grupo[0], grupo[1]) : 0;
      if (directo) {
        const par = directo < 0 ? grupo : [grupo[1], grupo[0]];
        resultado.push(...par.map((f) => ({ ...f, desempate: "entre_ellas" })));
      } else {
        const definidas = grupo.sort((x, y) => gamesFavor(y) - gamesFavor(x) || numero(x) - numero(y));
        definidas.forEach((f, k) => {
          const igualA = (otra) => otra && gamesFavor(otra) === gamesFavor(f);
          resultado.push({ ...f, desempate: igualA(definidas[k - 1]) || igualA(definidas[k + 1]) ? "sorteo" : "games_favor" });
        });
      }
    }
    i = fin;
  }
  return resultado;
}

/**
 * Los mejores del puesto `puesto` (1 = primero) entre zonas terminadas, para completar la llave.
 * Se comparan promedios por partido (las zonas pueden tener distinto tamaño): ganados → dif. de
 * sets → dif. de games → games a favor → sorteo. tablas: [{ filas }] en orden de zona.
 * Devuelve todos los candidatos ordenados: [{ id, zona, desempate }].
 */
export function mejoresDelPuesto(tablas, puesto, sorteo = new Map()) {
  const candidatos = tablas.flatMap(({ filas }, zona) => (filas[puesto - 1] ? [{ ...filas[puesto - 1], zona }] : []));
  const promedio = (valor, f) => (f.pj ? valor / f.pj : 0);
  const ordenados = ordenarConDesempate(candidatos,
    (f) => [promedio(f.pg, f), promedio(f.sets_favor - f.sets_contra, f), promedio(f.games_favor - f.games_contra, f)],
    null, (f) => promedio(f.games_favor, f), (f) => numeroDeSorteo(sorteo, f.inscripcion_id));
  return ordenados.map((f) => ({ id: f.inscripcion_id, zona: f.zona, desempate: f.desempate }));
}

/**
 * Clasificación de toda la categoría: la tabla de cada zona y, cuando terminaron todas, quiénes
 * completan la llave como mejores del puesto siguiente (marcados con `mejor` y `clasificado`).
 * zonas: [{ parejas: [ids], partidos }] en orden. Devuelve { tablas, completas, mejores, puestoMejores, cupoMejores }.
 */
export function clasificacionDeCategoria(zonas, clasifican, sorteo = new Map()) {
  const tablas = zonas.map((z) => tablaDeZona(z.parejas, z.partidos, clasifican, sorteo));
  const completas = tablas.length > 0 && tablas.every((t) => t.completa);
  const directos = zonas.reduce((suma, z) => suma + Math.min(clasifican, z.parejas.length), 0);
  const plan = completarLlave(directos, zonas.filter((z) => z.parejas.length > clasifican).length);
  const cupoMejores = plan?.mejores ?? 0;
  const puestoMejores = clasifican + 1;
  let mejores = [];
  if (completas && cupoMejores) {
    mejores = mejoresDelPuesto(tablas, puestoMejores, sorteo).slice(0, cupoMejores);
    const elegidos = new Map(mejores.map((m) => [m.id, m]));
    for (const tabla of tablas) {
      tabla.filas = tabla.filas.map((f) => (elegidos.has(f.inscripcion_id)
        ? { ...f, clasificado: true, mejor: true, desempate_mejor: elegidos.get(f.inscripcion_id).desempate }
        : f));
    }
  }
  return { tablas, completas, mejores, puestoMejores, cupoMejores };
}
