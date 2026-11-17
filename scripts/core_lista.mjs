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
    return incluir && !PROHIBIDOS.some((re) => re.test(archivo));
  });
}
