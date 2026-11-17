// Trae a este proyecto las mejoras que se hicieron directamente en el repo del core (CoreSistem).
// Es el camino inverso de core_subir.mjs y usa el mismo repositorio .git-core/.
//
// Uso (desde la raíz):
//   node scripts/core_traer.mjs          → muestra qué cambió en CoreSistem, sin tocar nada
//   node scripts/core_traer.mjs --traer  → aplica esos cambios a los archivos de este proyecto
//   node scripts/core_traer.mjs --terminar → cierra la mezcla después de resolver un choque a mano
//
// Después de traer: correr node scripts/verificar.mjs y commitear acá los archivos que cambiaron.
// Si este proyecto también cambió el mismo archivo del core, git mezcla los dos cambios; si chocan,
// deja las marcas <<<<<<< en el archivo para resolverlas a mano.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RAIZ, archivosDelCore } from "./core_lista.mjs";

const GIT_CORE = path.join(RAIZ, ".git-core");
const traer = process.argv.includes("--traer");

const git = (params) => execFileSync("git", params, { cwd: RAIZ, encoding: "utf8" }).trim();
const gitCore = (params) => execFileSync("git", ["-c", "core.safecrlf=false", ...params], {
  cwd: RAIZ, encoding: "utf8", env: { ...process.env, GIT_DIR: GIT_CORE, GIT_WORK_TREE: RAIZ },
}).trim();

if (!fs.existsSync(GIT_CORE)) {
  console.log("Todavía no hay .git-core en este proyecto: corré primero node scripts/core_subir.mjs.");
  process.exit(1);
}

if (process.argv.includes("--terminar")) {
  const conflictos = gitCore(["diff", "--name-only", "--diff-filter=U"]).split("\n").filter(Boolean);
  if (!conflictos.length) {
    console.log("No hay ninguna mezcla a medio terminar.");
    process.exit(0);
  }
  const conMarcas = conflictos.filter((f) => /^(<{7}|>{7})/m.test(fs.readFileSync(path.join(RAIZ, f), "utf8")));
  if (conMarcas.length) {
    console.log("Todavía quedan marcas <<<<<<< o >>>>>>> en:\n" + conMarcas.join("\n"));
    process.exit(1);
  }
  gitCore(["add", "--", ...conflictos]);
  gitCore(["commit", "-q", "--no-edit"]);
  console.log("Mezcla terminada. Ahora: node scripts/verificar.mjs y commitear en este repo los archivos que cambiaron.");
  process.exit(0);
}

const archivos = archivosDelCore(git(["ls-files"]).split("\n").filter(Boolean));
const pendientes = git(["status", "--porcelain", "--", ...archivos]);
if (pendientes) {
  console.log("Hay cambios sin commitear en archivos del core. Commitealos primero, así se pueden mezclar:\n" + pendientes);
  process.exit(1);
}

gitCore(["fetch", "-q", "origin"]);
// Solo lo que CoreSistem tiene y este proyecto no (tres puntos: cambios desde el último punto en común).
const llegan = gitCore(["diff", "--name-status", "HEAD...origin/main"]).split("\n").filter(Boolean);
if (!Number(gitCore(["rev-list", "--count", "HEAD..origin/main"]))) {
  console.log("Este proyecto ya tiene la última versión del core.");
  process.exit(0);
}
console.log(`Cambios en CoreSistem que este proyecto no tiene (${llegan.length}):`);
console.log(llegan.map((l) => "  " + l.replace("\t", "  ")).join("\n"));
console.log(gitCore(["log", "--oneline", "HEAD..origin/main"]).split("\n").map((l) => "  · " + l).join("\n"));

if (!traer) {
  console.log("\nNo se cambió nada. Para traerlos: node scripts/core_traer.mjs --traer");
  process.exit(0);
}

// Lo que este proyecto cambió en el core y todavía no subió se guarda primero como commit local
// del core: así git mezcla los dos lados en vez de negarse por "cambios sin commitear".
const lista = path.join(os.tmpdir(), `core-lista-${process.pid}.txt`);
fs.writeFileSync(lista, archivos.join("\n"));
gitCore(["read-tree", "--empty"]);
gitCore(["add", "-f", `--pathspec-from-file=${lista}`]);
fs.rmSync(lista);
if (gitCore(["diff", "--cached", "--name-only", "HEAD"])) {
  gitCore(["commit", "-q", "-m", `Cambios de este proyecto sin subir (${git(["rev-parse", "--short", "HEAD"])})`]);
  console.log("Este proyecto tenía cambios del core sin subir: se mezclan con los de CoreSistem.");
}
try {
  gitCore(["merge", "--no-edit", "-m", "Traer mejoras de CoreSistem", "origin/main"]);
} catch (error) {
  const conflictos = gitCore(["diff", "--name-only", "--diff-filter=U"]);
  console.log(conflictos
    ? `Los dos lados cambiaron lo mismo en estos archivos. Elegí qué queda entre las marcas <<<<<<< y >>>>>>>:\n${conflictos}\nDespués: node scripts/core_traer.mjs --terminar`
    : `git no pudo mezclar:\n${error.stderr || error.message}`);
  process.exit(1);
}

const cambiados = git(["status", "--porcelain"]).split("\n").filter(Boolean);
console.log(`\nListo: ${cambiados.length} archivos de este proyecto cambiaron.`);
console.log("Ahora: node scripts/verificar.mjs y, si todo pasa, commitear esos archivos en este repo.");
