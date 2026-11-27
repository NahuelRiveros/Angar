// Arranca un proyecto nuevo a partir del core: copia plantilla_proyecto/ a su lugar
// (proyecto/, frontend/src/proyecto/, servidor/src/proyecto/, index.html, favicon y
// .env de ejemplo) y prende los módulos del tipo elegido. Nunca pisa un archivo que ya exista.
//
// Uso (desde la raíz):
//   node scripts/nuevo_proyecto.mjs --tipos                         → muestra los tipos de proyecto
//   node scripts/nuevo_proyecto.mjs --tipo ecommerce                → crea el proyecto
//   node scripts/nuevo_proyecto.mjs --tipo ecommerce --con stock    → además prende stock
//   node scripts/nuevo_proyecto.mjs --tipo ecommerce --repo <url>   → además lo conecta a git (ver abajo)
//   node scripts/nuevo_proyecto.mjs --tipo ecommerce --estilo moderno → con ese estilo de diseño (--estilos los muestra)
// Sin --tipo, todos los módulos quedan apagados.
//
// --repo <url del repo del proyecto en GitHub>: para un clon de CoreSistem. Deja `origin` apuntando a ese
// repo (los push van ahí y no al core), arma .git-core para core_traer/core_subir desde la versión del
// core clonada y prende el control de .githooks. Sin --repo no toca git.
// Después: completar los [COMPLETAR] (buscarlos con el buscador del editor).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { REPO_CORE } from "./core_lista.mjs";
import { ESTILOS } from "../core/estilos.js";
import { MODULOS_OPCIONALES, TIPOS_PROYECTO, conLoQueNecesitan, resolverModulos, textoGateConfig } from "../core/modulos_opcionales.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plantilla = path.join(raiz, "plantilla_proyecto");
const GATE = path.join("proyecto", "gate_config.js");

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

function leerOpciones() {
  try {
    return parseArgs({ options: { tipo: { type: "string", default: "base" }, con: { type: "string", multiple: true, default: [] }, tipos: { type: "boolean" }, repo: { type: "string" }, estilo: { type: "string" }, estilos: { type: "boolean" } } }).values;
  } catch (error) {
    return salir(`${error.message}\nUsá --tipo <tipo>, --con <modulo> o --tipos.`);
  }
}

const listaDeTipos = () => Object.entries(TIPOS_PROYECTO)
  .map(([codigo, { nombre, modulos }]) => `  ${codigo.padEnd(18)} ${nombre} (${modulos.join(", ") || "sin módulos"})`).join("\n");

const opciones = leerOpciones();
if (opciones.estilos) {
  console.log(`Estilos de diseño:\n${Object.entries(ESTILOS).map(([codigo, e]) => `  ${codigo.padEnd(14)} ${e.descripcion}`).join("\n")}`);
  process.exit(0);
}
if (opciones.estilo && !Object.hasOwn(ESTILOS, opciones.estilo)) salir(`No existe el estilo "${opciones.estilo}". Los que hay: ${Object.keys(ESTILOS).join(", ")}.`);
const TEMA = path.join("frontend", "src", "proyecto", "config", "theme_config.js");
if (opciones.tipos) {
  console.log(`Tipos de proyecto:\n${listaDeTipos()}`);
  process.exit(0);
}
// Se revisa todo antes de copiar: un error de tipeo no deja un proyecto a medias.
if (!Object.hasOwn(TIPOS_PROYECTO, opciones.tipo)) salir(`No existe el tipo "${opciones.tipo}". Los que hay:\n${listaDeTipos()}`);
const extras = opciones.con.flatMap((valor) => valor.split(",")).map((valor) => valor.trim()).filter(Boolean);
const codigos = MODULOS_OPCIONALES.map((m) => m.codigo);
const desconocidos = extras.filter((codigo) => !codigos.includes(codigo));
if (desconocidos.length) salir(`No existe el módulo "${desconocidos.join('", "')}". Los que hay: ${codigos.join(", ")}.`);

const repo = opciones.repo?.trim();
const git = (params, env) => execFileSync("git", params, { cwd: raiz, encoding: "utf8", env: { ...process.env, ...env } }).trim();
if (repo !== undefined) {
  if (!repo) salir("Falta la dirección: --repo https://github.com/<usuario>/<proyecto>.git");
  if (repo.replace(/\.git$/, "") === REPO_CORE.replace(/\.git$/, "")) salir("--repo es el repo del proyecto, no el del core.");
  if (!fs.existsSync(path.join(raiz, ".git"))) salir("--repo es para un clon de CoreSistem: esta carpeta no tiene .git.");
  if (fs.existsSync(path.join(raiz, ".git-core"))) salir("Este proyecto ya tiene .git-core: ya está conectado al core.");
  // CoreSistem mismo también tiene su origin en el core: --repo solo en un clon recién bajado.
  if (fs.existsSync(path.join(raiz, GATE))) salir(`Ya existe ${GATE}: --repo es solo para un clon recién bajado de CoreSistem.`);
  const origen = (() => { try { return git(["remote", "get-url", "origin"]); } catch { return ""; } })();
  if (origen.replace(/\.git$/, "") !== REPO_CORE.replace(/\.git$/, "")) salir(`--repo es para un clon de CoreSistem, y el origin de esta carpeta es "${origen || "ninguno"}".`);
}

const elegidos = conLoQueNecesitan([...TIPOS_PROYECTO[opciones.tipo].modulos, ...extras]);
// Los que todavía no existen (y los que dependen de ellos) quedan en false: prendidos, el servidor no arrancaría.
const { activos } = resolverModulos(Object.fromEntries(elegidos.map((codigo) => [codigo, true])));
const pendientes = elegidos.filter((codigo) => !activos.includes(codigo));

const copiados = [];
const existentes = [];
for (const entrada of fs.readdirSync(plantilla, { recursive: true, withFileTypes: true })) {
  if (!entrada.isFile()) continue;
  const origen = path.join(entrada.parentPath, entrada.name);
  const relativo = path.relative(plantilla, origen);
  const destino = path.join(raiz, relativo);
  if (fs.existsSync(destino)) { existentes.push(relativo); continue; }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  if (relativo === GATE) fs.writeFileSync(destino, textoGateConfig(activos));
  else if (relativo === TEMA && opciones.estilo) fs.writeFileSync(destino, fs.readFileSync(origen, "utf8").replace("export const estilo = null;", `export const estilo = "${opciones.estilo}";`));
  else fs.copyFileSync(origen, destino);
  copiados.push(relativo);
}

console.log(`Copiados ${copiados.length} archivos de la plantilla.`);
if (existentes.length) console.log(`Ya existían y no se tocaron: ${existentes.length}.`);
if (copiados.includes(GATE)) {
  console.log(`Tipo: ${opciones.tipo}. Módulos prendidos: ${activos.join(", ") || "ninguno"}.`);
  if (pendientes.length) console.log(`⚠️  Todavía no están en el core y quedaron apagados: ${pendientes.join(", ")}.`);
} else if (elegidos.length) {
  console.log(`⚠️  ${GATE} ya existía y no se cambió. Para este tipo corresponde prender: ${elegidos.join(", ")}.`);
}
if (repo) {
  // El repo del core empieza en la versión clonada: core_traer trae solo lo que salga después.
  const version = git(["rev-parse", "HEAD"]);
  const enCore = { GIT_DIR: path.join(raiz, ".git-core"), GIT_WORK_TREE: raiz };
  git(["init", "-q", "-b", "main"], enCore);
  git(["remote", "add", "origin", REPO_CORE], enCore);
  git(["fetch", "-q", "origin"], enCore);
  git(["reset", "-q", version], enCore);
  git(["remote", "set-url", "origin", repo]);
  git(["config", "core.hooksPath", ".githooks"]);
  console.log(`Git: los push van a ${repo}; el core se trae de CoreSistem desde ${version.slice(0, 7)}.`);
} else {
  console.log("Git: sin --repo no se tocó. Si es un clon de CoreSistem, conectalo con --repo <url del proyecto>.");
}
if (opciones.estilo) console.log(copiados.includes(TEMA) ? `Estilo: ${ESTILOS[opciones.estilo].nombre}.` : `⚠️  ${TEMA} ya existía: poné estilo = "${opciones.estilo}" a mano.`);
console.log("Siguiente paso: buscar [COMPLETAR] y llenar los datos del cliente.");
