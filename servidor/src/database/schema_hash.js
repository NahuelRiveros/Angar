import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Huella de todo lo que decide qué sincroniza sincronizar_modelos(): las
 * columnas de cada modelo y el propio bootstrap (decide el orden). Si ninguno de
 * estos archivos cambió desde el último boot exitoso, sync({alter:true}) no
 * tiene nada nuevo que encontrar — bootstrap_database() usa este hash para
 * saltarse esa vuelta completa (~2s locales, bastante más contra Neon).
 *
 * Se hashea el CONTENIDO de los archivos, no la estructura de los modelos en
 * memoria — más simple y confiable que reconstruir a mano qué compara
 * Sequelize internamente. El costo: un cambio cosmético (un comentario) en
 * un modelo también invalida el cache y fuerza un resync de más, pero es
 * inofensivo — solo paga otra vez el costo que hoy se paga SIEMPRE.
 */
const RUTAS_A_HASHEAR = [
  path.resolve(__dirname, "../models"),
  path.resolve(__dirname, "./bootstrap.js"),
];

function archivosJs(dir) {
  const resultado = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) resultado.push(...archivosJs(ruta));
    else if (entrada.name.endsWith(".js")) resultado.push(ruta);
  }
  return resultado;
}

export function calcularHashEsquema() {
  const archivos = RUTAS_A_HASHEAR
    .flatMap((ruta) => (fs.statSync(ruta).isDirectory() ? archivosJs(ruta) : [ruta]))
    .sort();

  const hash = crypto.createHash("sha256");
  for (const archivo of archivos) {
    hash.update(archivo); // el path entra en el hash: agregar/borrar un archivo también invalida
    hash.update(fs.readFileSync(archivo));
  }
  return hash.digest("hex");
}
