import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
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

test("SIS-53: el home es de cada proyecto: el core lo toma de proyecto/inicio.jsx y no trae uno propio", () => {
  const rutas = readFileSync(path.join(raiz, "frontend/src/core/app/routes/general.routes.jsx"), "utf8");
  assert.match(rutas, /import\("\.\.\/\.\.\/\.\.\/proyecto\/inicio\.jsx"\)/);
  assert.equal(existsSync(path.join(raiz, "frontend/src/core/modules/home/home_page.jsx")), false, "el core no tiene home");
  assert.ok(existsSync(path.join(raiz, "plantilla_proyecto/frontend/src/proyecto/inicio.jsx")), "un proyecto nuevo arranca con uno para modificar");
});

test("COR-22: los package.json son de cada proyecto: no viajan con el core en ninguna dirección", async () => {
  const { PROPIOS_DEL_PROYECTO, archivosDelCore } = await import("../../scripts/core_lista.mjs");
  assert.deepEqual(archivosDelCore(PROPIOS_DEL_PROYECTO), []);
  assert.deepEqual(archivosDelCore(["servidor/src/core/app.js"]), ["servidor/src/core/app.js"]);
});

test("COR-22: cada librería que usa el core está en el package.json de este proyecto", () => {
  const IMPORTA = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"'\n]+)["']/g;
  const deNode = new Set(builtinModules);
  // Solo librerías: "@tanstack/react-query/x" → "@tanstack/react-query". Rutas y "node:" no cuentan.
  const libreria = (spec) => (/^[./]/.test(spec) || spec.includes(":") ? null : spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/"));
  const faltan = [];
  for (const [lado, carpetas] of [["servidor", ["servidor/src/core", "core"]], ["frontend", ["frontend/src/core", "core"]]]) {
    const paquete = JSON.parse(readFileSync(path.join(raiz, lado, "package.json"), "utf8"));
    const tiene = new Set([...Object.keys(paquete.dependencies ?? {}), ...Object.keys(paquete.devDependencies ?? {})]);
    for (const carpeta of carpetas) {
      for (const e of readdirSync(path.join(raiz, carpeta), { recursive: true, withFileTypes: true })) {
        if (!e.isFile() || !/\.(m?js|jsx)$/.test(e.name)) continue;
        const archivo = path.join(e.parentPath, e.name);
        for (const [, spec] of readFileSync(archivo, "utf8").matchAll(IMPORTA)) {
          const nombre = libreria(spec);
          if (nombre && !deNode.has(nombre) && !tiene.has(nombre)) faltan.push(`${lado}/package.json no tiene "${nombre}" (lo usa ${path.relative(raiz, archivo).split(path.sep).join("/")})`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(faltan)], []);
});
