import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARPETAS_CORE = ["core", "frontend/src/core", "servidor/src/core"];
// Donde viven los rubros: el core los recibe por los registros de proyecto/, nunca los importa.
const RUBROS = ["rubros/", "frontend/src/modules/", "servidor/src/modulos/"];
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"'\n]+)["']/g;

function archivosDe(carpeta) {
  return readdirSync(path.join(raiz, carpeta), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(m?js|jsx)$/.test(e.name))
    .map((e) => path.join(e.parentPath, e.name));
}

test("COR-01: ningún archivo del core importa un rubro", () => {
  const problemas = [];
  let revisados = 0;
  for (const carpeta of CARPETAS_CORE) {
    for (const archivo of archivosDe(carpeta)) {
      revisados++;
      for (const [, spec] of readFileSync(archivo, "utf8").matchAll(IMPORT)) {
        const destino = path.relative(raiz, path.resolve(path.dirname(archivo), spec)).split(path.sep).join("/");
        if (RUBROS.some((r) => destino.startsWith(r))) problemas.push(`${path.relative(raiz, archivo)} → ${destino}`);
      }
    }
  }
  assert.ok(revisados > 100, "encontró los archivos del core");
  assert.deepEqual(problemas, []);
});

test("COR-05: todo lo que el core lee de proyecto/ existe en la plantilla, así un proyecto nuevo arranca", () => {
  const faltan = new Set();
  for (const carpeta of CARPETAS_CORE) {
    for (const archivo of archivosDe(carpeta)) {
      for (const [, spec] of readFileSync(archivo, "utf8").matchAll(IMPORT)) {
        const destino = path.relative(raiz, path.resolve(path.dirname(archivo), spec)).split(path.sep).join("/");
        if (!/^(proyecto|frontend\/src\/proyecto|servidor\/src\/proyecto)\//.test(destino)) continue;
        if (!existsSync(path.join(raiz, "plantilla_proyecto", destino))) faltan.add(destino);
      }
    }
  }
  assert.deepEqual([...faltan], []);
});

test("COR-04: al repo del core va el core y la plantilla, nunca el proyecto, el rubro ni secretos", async () => {
  const { execFileSync } = await import("node:child_process");
  const { archivosDelCore } = await import("../../scripts/core_lista.mjs");
  const archivos = execFileSync("git", ["ls-files"], { cwd: raiz, encoding: "utf8" }).split("\n").filter(Boolean);
  const core = archivosDelCore(archivos);
  for (const esperado of ["core/permisos_config.js", "frontend/src/core/api/http.js", "servidor/src/core/app.js", "plantilla_proyecto/proyecto/client_config.js", "scripts/core_subir.mjs"]) {
    assert.ok(core.includes(esperado), esperado);
  }
  const fuera = /^(proyecto|rubros)\/|^frontend\/src\/(proyecto|modules)\/|^servidor\/src\/(proyecto|modulos)\/|\.env\.produccion\.example$|dominio-distribuidora|^CLAUDE\.md$|\.pdf$/;
  assert.deepEqual(core.filter((a) => fuera.test(a) && !a.startsWith("plantilla_proyecto/")), []);
});

test("COR-04: aunque la lista los habilite por error, el proyecto y los .env reales no viajan", async () => {
  const { archivosDelCore, leerLista } = await import("../../scripts/core_lista.mjs");
  const reglas = leerLista("!proyecto/\n!servidor/\nservidor/tests/\n!servidor/tests/a.test.mjs");
  assert.deepEqual(
    archivosDelCore(["proyecto/client_config.js", "servidor/.env.local", "servidor/.env.local.example", "servidor/tests/a.test.mjs", "servidor/tests/b.test.mjs"], reglas),
    ["servidor/.env.local.example", "servidor/tests/a.test.mjs"],
  );
});

test("COR-01: el chequeo detecta un import a un rubro", () => {
  const archivo = path.join(raiz, "frontend/src/core/controls/x.jsx");
  const [, spec] = [...'import { a } from "../../modules/eccomerce_distribuidora/menu.js";'.matchAll(IMPORT)][0];
  const destino = path.relative(raiz, path.resolve(path.dirname(archivo), spec)).split(path.sep).join("/");
  assert.ok(RUBROS.some((r) => destino.startsWith(r)));
});

test("SIS-53: la portada la elige el proyecto; sin rubro que la traiga queda la del core", async () => {
  const { inicioDelProyecto } = await import("../../frontend/src/core/app/inicio.js");
  const delCore = () => "home del core";
  const propia = () => "home del proyecto";
  assert.equal(inicioDelProyecto([{ codigo: "tienda" }, { codigo: "torneos", inicio: propia }], delCore), propia);
  assert.equal(inicioDelProyecto([{ codigo: "tienda", rutasTienda: [] }], delCore), delCore, "un rubro sin inicio no la reemplaza");
  assert.equal(inicioDelProyecto([], delCore), delCore, "sin rubros, la del core");
});
