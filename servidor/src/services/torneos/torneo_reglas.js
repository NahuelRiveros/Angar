// Validaciones del torneo sin base de datos (se prueban en ux_rules.test.mjs).
// Cada validador devuelve { datos } solo con los campos conocidos, o { error } en español.
import { TRANSICIONES, NIVELES, RAMAS, PUESTOS, LIMITES, ZONAS, FORMATOS_PARTIDO, nombreCategoria } from "../../../../torneo_config.js";
import { esFechaValida } from "../suscripciones/suscripcion_reglas.js";

// Campo: [máximo de caracteres, nombre para el mensaje]. El nombre del torneo va aparte (es obligatorio).
const TEXTOS = {
  descripcion: [2000, "La descripción"],
  sede: [120, "La sede"],
  direccion: [200, "La dirección"],
  localidad: [120, "La localidad"],
  contacto: [120, "El contacto"],
  reglamento: [10000, "El reglamento"],
};

const texto = (valor) => (typeof valor === "string" ? valor.trim() : valor);

/**
 * Datos del torneo. Parcial: valida y devuelve solo los campos que vinieron
 * (sirve para crear con lo mínimo y para editar de a una sección).
 */
export function validarDatosTorneo(body, { crear = false } = {}) {
  const b = body ?? {};
  const datos = {};
  if (crear || "nombre" in b) {
    const nombre = texto(b.nombre);
    if (typeof nombre !== "string" || nombre.length < 3 || nombre.length > 120) return { error: "El nombre tiene que tener entre 3 y 120 caracteres." };
    datos.nombre = nombre;
  }
  for (const [campo, [maximo, etiqueta]] of Object.entries(TEXTOS)) {
    if (!(campo in b)) continue;
    const valor = texto(b[campo]);
    if (valor != null && typeof valor !== "string") return { error: `${etiqueta} tiene que ser texto.` };
    if (valor && valor.length > maximo) return { error: `${etiqueta} puede tener hasta ${maximo} caracteres.` };
    datos[campo] = valor || null;
  }
  for (const campo of ["fecha_inicio", "fecha_fin"]) {
    if (!(campo in b)) continue;
    if (b[campo] == null || b[campo] === "") { datos[campo] = null; continue; }
    if (!esFechaValida(b[campo])) return { error: "Las fechas tienen que ser válidas (AAAA-MM-DD)." };
    datos[campo] = b[campo];
  }
  return { datos };
}

/** Las fechas finales (lo guardado + lo nuevo) no pueden quedar al revés. */
export function fechasCoherentes({ fecha_inicio, fecha_fin }) {
  return !fecha_inicio || !fecha_fin || fecha_fin >= fecha_inicio;
}

export const puedePasar = (de, a) => (TRANSICIONES[de] ?? []).some((t) => t.a === a);

/** Qué le falta a un torneo para pasar a `destino` (lista vacía = puede). */
export function faltantesPara(destino, torneo, cantidadCategorias) {
  if (destino !== "inscripcion" && destino !== "en_juego") return [];
  const faltan = [];
  if (!torneo.sede) faltan.push("la sede");
  if (!torneo.fecha_inicio) faltan.push("la fecha de inicio");
  if (!cantidadCategorias) faltan.push("al menos una categoría");
  return faltan;
}

/** Categoría de la lista (nivel + rama) o con nombre propio. */
export function validarCategoria(body) {
  const b = body ?? {};
  const propio = texto(b.nombre_personalizado);
  let datos;
  if (propio) {
    if (typeof propio !== "string" || propio.length < 2 || propio.length > 60) return { error: "El nombre de la categoría tiene que tener entre 2 y 60 caracteres." };
    datos = { nivel: null, rama: null, nombre_personalizado: propio };
  } else {
    const nivel = Number(b.nivel);
    if (!NIVELES.includes(nivel)) return { error: "Elegí el nivel (de 1ra a 8va) o escribí un nombre propio." };
    if (!RAMAS[b.rama]) return { error: "Elegí la rama: Caballeros, Damas o Mixto." };
    datos = { nivel, rama: b.rama, nombre_personalizado: null };
  }
  if (b.cupo_parejas == null || b.cupo_parejas === "") datos.cupo_parejas = null;
  else {
    const cupo = Number(b.cupo_parejas);
    if (!Number.isInteger(cupo) || cupo < LIMITES.cupoMinimo || cupo > LIMITES.cupoMaximo) {
      return { error: `El cupo tiene que ser un número de parejas entre ${LIMITES.cupoMinimo} y ${LIMITES.cupoMaximo}, o quedar vacío.` };
    }
    datos.cupo_parejas = cupo;
  }
  const formato = validarFormatoZona(b);
  if (formato.error) return formato;
  return { datos: { ...datos, ...formato.datos } };
}

/** Formato de la fase de zonas; lo que no viene toma el valor por defecto. */
export function validarFormatoZona(b) {
  const parejas = Number(b.parejas_por_zona ?? ZONAS.predeterminado.parejas_por_zona);
  const clasifican = Number(b.clasifican_por_zona ?? ZONAS.predeterminado.clasifican_por_zona);
  const formato = b.formato_zona ?? ZONAS.predeterminado.formato_zona;
  const formatoLlave = b.formato_llave ?? ZONAS.predeterminado.formato_llave;
  if (!ZONAS.parejasPorZona.includes(parejas)) return { error: `Las zonas pueden ser de ${ZONAS.parejasPorZona.join(", ")} parejas.` };
  if (!ZONAS.clasificanPorZona.includes(clasifican) || clasifican >= parejas) return { error: "Por zona clasifican 1 o 2 parejas (menos que las que juegan)." };
  if (!FORMATOS_PARTIDO[formato]) return { error: "Elegí el formato de los partidos de zona." };
  if (!FORMATOS_PARTIDO[formatoLlave]) return { error: "Elegí el formato de los partidos de la llave." };
  return { datos: { parejas_por_zona: parejas, clasifican_por_zona: clasifican, formato_zona: formato, formato_llave: formatoLlave } };
}

/** Clave para no repetir categorías dentro del torneo: "4ta Caballeros" y "4TA  caballeros" son la misma. */
export const claveCategoria = (categoria) => nombreCategoria(categoria).toLowerCase().replace(/\s+/g, " ").trim();

/** Lista completa de premios de una categoría (reemplaza la anterior). */
export function validarPremios(lista) {
  if (!Array.isArray(lista)) return { error: "Mandá la lista de premios." };
  if (lista.length > LIMITES.premiosPorCategoria) return { error: `Hasta ${LIMITES.premiosPorCategoria} premios por categoría.` };
  const datos = [];
  for (const [orden, premio] of lista.entries()) {
    const puesto = premio?.puesto;
    if (!PUESTOS[puesto]) return { error: "Elegí el puesto de cada premio." };
    const descripcion = texto(premio.descripcion);
    if (typeof descripcion !== "string" || !descripcion || descripcion.length > 200) return { error: `Describí el premio de ${PUESTOS[puesto]} (hasta 200 caracteres).` };
    const etiqueta = puesto === "otro" ? texto(premio.etiqueta) : null;
    if (puesto === "otro" && (typeof etiqueta !== "string" || etiqueta.length < 2 || etiqueta.length > 40)) {
      return { error: "Poné el nombre del puesto en los premios de tipo \"Otro\" (entre 2 y 40 caracteres)." };
    }
    datos.push({ puesto, etiqueta, descripcion, orden });
  }
  return { datos };
}
