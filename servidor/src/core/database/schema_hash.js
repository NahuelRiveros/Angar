import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Huella de todo lo que decide qué sincroniza sincronizar_modelos(): las
 * columnas de cada modelo, qué módulos de negocio están prendidos
 * (gate_config decide el subconjunto real a sincronizar) y el propio
 * bootstrap (agrupa los modelos en listas y decide el orden). Si ninguno de
 * estos archivos cambió desde el último boot exitoso, sync({alter:true}) no
 * tiene nada nuevo que encontrar — bootstrap_database() usa este hash para
 * saltarse esa vuelta completa (~2s locales, bastante más contra Supabase remoto).
 *
 * Se hashea el CONTENIDO de los archivos, no la estructura de los modelos en
 * memoria — más simple y confiable que reconstruir a mano qué compara
 * Sequelize internamente. El costo: un cambio cosmético (un comentario) en
 * un modelo también invalida el cache y fuerza un resync de más, pero es
 * inofensivo — solo paga otra vez el costo que hoy se paga SIEMPRE.
 */
const dirModulos = path.resolve(__dirname, "../../modulos");
const RUTAS_A_HASHEAR = [
  path.resolve(__dirname, "../models"),
  // De cada módulo de rubro: sus modelos y su modulo.js (decide el orden de sync).
  // Un proyecto recién creado puede no tener ningún rubro todavía.
  ...(fs.existsSync(dirModulos) ? fs.readdirSync(dirModulos, { withFileTypes: true }) : []).filter((e) => e.isDirectory())
    .flatMap((e) => [path.join(dirModulos, e.name, "models"), path.join(dirModulos, e.name, "modulo.js")]),
  path.resolve(__dirname, "../configuracion_servidor/gate_config.js"),
  path.resolve(__dirname, "./bootstrap.js"),
];

// _scaffold/ no se sincroniza nunca (ver sincronizar_modelos) — cambios ahí
// no deben invalidar el cache.
const IGNORAR = new Set(["_scaffold"]);

function archivosJs(dir) {
  const resultado = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
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
