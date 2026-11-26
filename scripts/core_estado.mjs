// Muestra cómo está cada proyecto respecto del core, sin cambiar nada: si le faltan mejoras de
// CoreSistem, si tiene cambios del core sin subir o sin commitear.
//
// Uso (desde la raíz de cualquier proyecto o de CoreSistem):
//   node scripts/core_estado.mjs               → los proyectos de la carpeta de al lado (hermanos de este)
//   node scripts/core_estado.mjs ../A ../B     → solo esos

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RAIZ, REPO_CORE, archivosDelCore, fijarPropios, leerLista } from "./core_lista.mjs";

const sinGit = (url) => url.replace(/\.git$/, "");
const correr = (cwd, params, env = {}) => execFileSync("git", ["-c", "core.safecrlf=false", ...params], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, ...env } }).trim();

function estado(carpeta) {
  const nombre = path.basename(carpeta);
  if (!fs.existsSync(path.join(carpeta, "core_lista.txt"))) return null;
  const git = (params) => correr(carpeta, params);
  const origen = (() => { try { return git(["remote", "get-url", "origin"]); } catch { return ""; } })();
  if (!fs.existsSync(path.join(carpeta, ".git-core"))) {
    // CoreSistem mismo no es un proyecto: no se lista.
    return sinGit(origen) === sinGit(REPO_CORE) ? null : `${nombre}: sin conectar al core (le falta .git-core; ver README).`;
  }
  // Índice aparte: mirar no cambia el del repo del core.
  const indice = path.join(os.tmpdir(), `core-estado-${process.pid}-${nombre}`);
  const enCore = { GIT_DIR: path.join(carpeta, ".git-core"), GIT_WORK_TREE: carpeta, GIT_INDEX_FILE: indice };
  const gitCore = (params) => correr(carpeta, params, enCore);
  try {
    try { gitCore(["fetch", "-q", "origin"]); } catch { return `${nombre}: no se pudo consultar CoreSistem (¿sin internet?).`; }
    const faltan = Number(gitCore(["rev-list", "--count", "HEAD..origin/main"]));
    const archivos = archivosDelCore(git(["ls-files"]).split("\n").filter(Boolean), leerLista(fs.readFileSync(path.join(carpeta, "core_lista.txt"), "utf8")));
    const sinCommitear = git(["status", "--porcelain", "--", ...archivos]).split("\n").filter(Boolean).length;
    const lista = `${indice}.txt`;
    fs.writeFileSync(lista, archivos.join("\n"));
    gitCore(["read-tree", "--empty"]);
    gitCore(["add", "-f", `--pathspec-from-file=${lista}`]);
    fs.rmSync(lista);
    fijarPropios(gitCore, "HEAD");
    const sinSubir = gitCore(["diff", "--cached", "--name-only", "HEAD"]).split("\n").filter(Boolean).length;
    const avisos = [
      faltan && `le faltan ${faltan} cambio(s) de CoreSistem → node scripts/core_traer.mjs --traer`,
      sinSubir && `tiene ${sinSubir} archivo(s) del core cambiados acá sin subir → node scripts/core_subir.mjs`,
      sinCommitear && `${sinCommitear} archivo(s) del core sin commitear`,
    ].filter(Boolean);
    return `${nombre}: ${avisos.length ? avisos.join("; ") : "al día"}.`;
  } finally {
    fs.rmSync(indice, { force: true });
  }
}

const carpetas = process.argv.slice(2).length
  ? process.argv.slice(2).map((c) => path.resolve(c))
  : fs.readdirSync(path.dirname(RAIZ), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(path.dirname(RAIZ), e.name));
const lineas = carpetas.map(estado).filter(Boolean);
console.log(lineas.length ? lineas.join("\n") : "No encontré proyectos con core_lista.txt en esas carpetas.");
