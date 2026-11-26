// Arranca un proyecto nuevo a partir del core: copia plantilla_proyecto/ a su lugar
// (proyecto/, frontend/src/proyecto/, servidor/src/proyecto/, index.html, favicon y
// .env de ejemplo) y prende los módulos del tipo elegido. Nunca pisa un archivo que ya exista.
//
// Uso (desde la raíz):
//   node scripts/nuevo_proyecto.mjs --tipos                         → muestra los tipos de proyecto
//   node scripts/nuevo_proyecto.mjs --tipo ecommerce                → crea el proyecto
//   node scripts/nuevo_proyecto.mjs --tipo ecommerce --con stock    → además prende stock
// Sin --tipo, todos los módulos quedan apagados.
// Después: completar los [COMPLETAR] (buscarlos con el buscador del editor).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
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
    return parseArgs({ options: { tipo: { type: "string", default: "base" }, con: { type: "string", multiple: true, default: [] }, tipos: { type: "boolean" } } }).values;
  } catch (error) {
    return salir(`${error.message}\nUsá --tipo <tipo>, --con <modulo> o --tipos.`);
  }
}

const listaDeTipos = () => Object.entries(TIPOS_PROYECTO)
  .map(([codigo, { nombre, modulos }]) => `  ${codigo.padEnd(18)} ${nombre} (${modulos.join(", ") || "sin módulos"})`).join("\n");

const opciones = leerOpciones();
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
console.log("Siguiente paso: buscar [COMPLETAR] y llenar los datos del cliente.");
