// Lee core_lista.txt y decide qué archivos van al repo del core (lo usa core_subir.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Aunque la lista los habilite por error, esto nunca viaja al core (COR-04).
const PROHIBIDOS = [
  /^proyecto\//, /^rubros\//, /^frontend\/src\/proyecto\//, /^servidor\/src\/proyecto\//,
  /^frontend\/src\/modules\//, /^servidor\/src\/modulos\//,
  /(^|\/)\.env(\.(?!.*\.example$)[^/]*)?$/, /\.(pem|key|pdf)$/i,
];

/**
 * Del proyecto aunque el core tenga una copia como punto de partida (scripts y dependencias propias):
 * ni se suben ni se traen. Las dependencias que el core necesita las controla core_estructura.test.mjs.
 */
export const PROPIOS_DEL_PROYECTO = ["servidor/package.json", "servidor/package-lock.json", "frontend/package.json", "frontend/package-lock.json"];

/**
 * En el índice del repo del core, deja esos archivos como están en `ref` (el core): así subir no manda
 * los del proyecto y traer no ve nada que cambiar en ellos (no los toca).
 */
export function fijarPropios(gitCore, ref) {
  for (const archivo of PROPIOS_DEL_PROYECTO) {
    let blob;
    try { blob = gitCore(["rev-parse", "-q", "--verify", `${ref}:${archivo}`]); } catch { continue; }
    gitCore(["update-index", "--add", "--cacheinfo", `100644,${blob},${archivo}`]);
  }
}

export function leerLista(texto = fs.readFileSync(path.join(RAIZ, "core_lista.txt"), "utf8")) {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => ({ incluir: l.startsWith("!"), patron: l.replace(/^!/, "").replace(/^\//, "") }));
}

const coincide = (archivo, patron) => (patron.endsWith("/") ? archivo.startsWith(patron) : archivo === patron);

/** Archivos que van al core: los que la lista habilita (gana la última línea) y no están prohibidos. */
export function archivosDelCore(archivos, reglas = leerLista()) {
  return archivos.filter((archivo) => {
    let incluir = false;
    for (const regla of reglas) if (coincide(archivo, regla.patron)) incluir = regla.incluir;
    return incluir && !PROHIBIDOS.some((re) => re.test(archivo)) && !PROPIOS_DEL_PROYECTO.includes(archivo);
  });
}
