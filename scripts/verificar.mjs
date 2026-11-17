// Corre las verificaciones del proyecto y muestra SOLO un resumen: una línea por paso
// y, si alguno falla, las líneas que dicen qué falló. Pensado para que Claude (y vos)
// lean 10 líneas en vez de cientos.
//
// Uso (desde la raíz):
//   node scripts/verificar.mjs            → tests del servidor, lint y build del frontend
//   node scripts/verificar.mjs --rapido   → tests del servidor y lint (lo usa el hook de git)
//   node scripts/verificar.mjs --completo → además integración (PostgreSQL local) y Playwright
//   node scripts/verificar.mjs --detalle  → además muestra la salida completa de lo que falle

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));

const PASOS = [
  { nombre: "Tests del servidor", cmd: "npm --prefix servidor test", modos: ["rapido", "normal", "completo"] },
  { nombre: "Lint del frontend", cmd: "npm --prefix frontend run lint", modos: ["rapido", "normal", "completo"] },
  { nombre: "Build del frontend", cmd: "npm --prefix frontend run build", modos: ["normal", "completo"] },
  { nombre: "Integración (PostgreSQL local)", cmd: "npm --prefix servidor run test:integration", modos: ["completo"] },
  { nombre: "Navegador (Playwright)", cmd: "npm --prefix frontend run test:e2e -- --reporter=list", modos: ["completo"] },
];
const modo = args.has("--completo") ? "completo" : args.has("--rapido") ? "rapido" : "normal";

// Lo que vale la pena mostrar de cada herramienta: totales y nombres de lo que falló.
const RESUMEN = /^ℹ (tests|pass|fail) |^\s*\d+ (passed|failed|flaky|skipped)|✖ \d+ problems?|built in/;
const FALLO = /^✖ |^not ok|^\s+✘|^\s+\d+:\d+\s+error|Error:|error TS|ERR!|failed to/;

function correr(cmd) {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const hijo = spawn(cmd, { cwd: raiz, shell: true, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" } });
    let salida = "";
    hijo.stdout.on("data", (d) => { salida += d; });
    hijo.stderr.on("data", (d) => { salida += d; });
    hijo.on("close", (codigo) => resolve({ ok: codigo === 0, salida, segundos: ((Date.now() - inicio) / 1000).toFixed(1) }));
  });
}

const limpiar = (texto) => texto.replace(/\x1b\[[0-9;]*m/g, "").split(/\r?\n/);

let fallas = 0;
for (const paso of PASOS.filter((p) => p.modos.includes(modo))) {
  const { ok, salida, segundos } = await correr(paso.cmd);
  const lineas = limpiar(salida);
  const resumen = [...new Set(lineas.filter((l) => RESUMEN.test(l)).map((l) => l.trim()))].join(" · ");
  console.log(`${ok ? "✅" : "❌"} ${paso.nombre} (${segundos}s)${resumen ? " — " + resumen : ""}`);
  if (!ok) {
    fallas++;
    const motivo = lineas.filter((l) => FALLO.test(l)).slice(0, 25);
    console.log((args.has("--detalle") ? lineas : motivo.length ? motivo : lineas.slice(-15)).map((l) => "   " + l).join("\n"));
  }
}

console.log(fallas ? `\n${fallas} paso(s) con problemas.` : "\nTodo en orden.");
process.exit(fallas ? 1 : 0);
