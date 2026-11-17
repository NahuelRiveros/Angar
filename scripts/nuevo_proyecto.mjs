// Arranca un proyecto nuevo a partir del core: copia plantilla_proyecto/ a su lugar
// (proyecto/, frontend/src/proyecto/, servidor/src/proyecto/, index.html, favicon y
// .env de ejemplo). Nunca pisa un archivo que ya exista.
//
// Uso (desde la raíz): node scripts/nuevo_proyecto.mjs
// Después: completar los [COMPLETAR] (buscarlos con el buscador del editor).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plantilla = path.join(raiz, "plantilla_proyecto");

const copiados = [];
const existentes = [];
for (const entrada of fs.readdirSync(plantilla, { recursive: true, withFileTypes: true })) {
  if (!entrada.isFile()) continue;
  const origen = path.join(entrada.parentPath, entrada.name);
  const relativo = path.relative(plantilla, origen);
  const destino = path.join(raiz, relativo);
  if (fs.existsSync(destino)) { existentes.push(relativo); continue; }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origen, destino);
  copiados.push(relativo);
}

console.log(`Copiados ${copiados.length} archivos de la plantilla.`);
if (existentes.length) console.log(`Ya existían y no se tocaron: ${existentes.length}.`);
console.log("Siguiente paso: buscar [COMPLETAR] y llenar los datos del cliente.");
