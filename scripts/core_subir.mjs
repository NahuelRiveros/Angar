// Sube el core a su propio repo (CoreSistem) desde esta misma carpeta.
//
// Usa un segundo repositorio git guardado en .git-core/ (ignorado por este repo) que
// comparte la carpeta de trabajo, y le carga SOLO los archivos de core_lista.txt.
//
// Uso (desde la raíz):
//   node scripts/core_subir.mjs                 → muestra qué cambió en el core, sin subir nada
//   node scripts/core_subir.mjs --ver           → además lista cada archivo
//   node scripts/core_subir.mjs --subir         → hace el commit en el core y lo sube a GitHub
//   node scripts/core_subir.mjs --subir -m "…"  → con un mensaje propio
//
// Solo se suben archivos ya commiteados acá: lo que está a medio hacer no viaja.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RAIZ, archivosDelCore } from "./core_lista.mjs";

const REPO_CORE = "https://github.com/NahuelRiveros/CoreSistem.git";
const GIT_CORE = path.join(RAIZ, ".git-core");
const args = process.argv.slice(2);
const subir = args.includes("--subir");
const mensajeIdx = args.indexOf("-m");

const git = (params, opciones = {}) => execFileSync("git", params, { cwd: RAIZ, encoding: "utf8", ...opciones }).trim();
// safecrlf apagado: sin el aviso "LF will be replaced by CRLF" por cada archivo (el contenido no cambia).
const gitCore = (params) => git(["-c", "core.safecrlf=false", ...params], { env: { ...process.env, GIT_DIR: GIT_CORE, GIT_WORK_TREE: RAIZ } });

if (!fs.existsSync(GIT_CORE)) {
  gitCore(["init", "-q", "-b", "main"]);
  gitCore(["remote", "add", "origin", REPO_CORE]);
  console.log(`Creado el repo del core en .git-core (remoto: ${REPO_CORE}).`);
}

const archivos = archivosDelCore(git(["ls-files"]).split("\n").filter(Boolean));
const pendientes = git(["status", "--porcelain", "--", ...archivos]);
if (pendientes) {
  console.log("Hay cambios sin commitear en archivos del core. Commitealos en este repo primero:\n" + pendientes);
  process.exit(1);
}

if (fs.existsSync(path.join(GIT_CORE, "MERGE_HEAD"))) {
  console.log("Hay una mezcla de core_traer sin terminar: resolvela y corré node scripts/core_traer.mjs --terminar.");
  process.exit(1);
}

// El índice del core se arma de cero con la lista: así también viajan los archivos borrados.
const lista = path.join(os.tmpdir(), `core-lista-${process.pid}.txt`);
fs.writeFileSync(lista, archivos.join("\n"));
gitCore(["read-tree", "--empty"]);
gitCore(["add", "-f", `--pathspec-from-file=${lista}`]);
fs.rmSync(lista);

const hayHistoria = (() => { try { gitCore(["rev-parse", "--verify", "-q", "HEAD"]); return true; } catch { return false; } })();
const cambios = (hayHistoria ? gitCore(["diff", "--cached", "--name-status", "HEAD"]) : archivos.map((a) => `A\t${a}`).join("\n"))
  .split("\n").filter(Boolean);

// Comparar con CoreSistem: si tiene mejoras que acá faltan, hay que traerlas antes de subir.
gitCore(["fetch", "-q", "origin"]);
const hayRemoto = (() => { try { gitCore(["rev-parse", "--verify", "-q", "origin/main"]); return true; } catch { return false; } })();
const contar = (rango) => (hayRemoto && hayHistoria ? Number(gitCore(["rev-list", "--count", rango])) : 0);
if (contar("HEAD..origin/main")) {
  console.log("CoreSistem tiene mejoras que este proyecto todavía no trajo. Primero: node scripts/core_traer.mjs --traer");
  process.exit(1);
}
// Commits del core hechos por core_traer (mezclas) que todavía no se subieron.
const sinSubir = hayRemoto ? contar("origin/main..HEAD") : Number(hayHistoria);

if (!cambios.length && !sinSubir) {
  console.log(`El core ya está al día (${archivos.length} archivos).`);
  process.exit(0);
}
if (!cambios.length) console.log(`Sin archivos nuevos para subir, pero hay ${sinSubir} commit(s) del core pendientes (de core_traer).`);

const porCarpeta = {};
for (const linea of cambios) {
  const [estado, archivo] = linea.split("\t");
  const carpeta = archivo.split("/").slice(0, archivo.startsWith("frontend/src/") || archivo.startsWith("servidor/src/") ? 3 : 1).join("/");
  porCarpeta[carpeta] ??= { A: 0, M: 0, D: 0 };
  porCarpeta[carpeta][estado[0]] = (porCarpeta[carpeta][estado[0]] ?? 0) + 1;
}
if (cambios.length) console.log(`Core: ${archivos.length} archivos en total; ${cambios.length} cambian (A nuevos, M modificados, D borrados):`);
for (const [carpeta, n] of Object.entries(porCarpeta).sort()) console.log(`  ${carpeta.padEnd(32)} A ${n.A}  M ${n.M}  D ${n.D}`);
if (args.includes("--ver")) console.log(cambios.map((c) => "  " + c).join("\n"));

if (!subir) {
  console.log("\nNo se subió nada. Para subirlo: node scripts/core_subir.mjs --subir");
  process.exit(0);
}

const origen = git(["rev-parse", "--short", "HEAD"]);
const mensaje = mensajeIdx >= 0 ? args[mensajeIdx + 1] : `Core actualizado desde DistribuCG (${origen})`;
if (cambios.length) gitCore(["commit", "-q", "-m", mensaje]);
console.log(gitCore(["push", "-u", "origin", "main"]) || "Subido a CoreSistem.");
console.log(gitCore(["log", "--oneline", "-1"]));
