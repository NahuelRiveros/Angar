// Torneos de DEMOSTRACIÓN con datos ficticios, para ver cómo se ve cada etapa (también en producción).
// Corre contra la base que indiquen las variables (.env en tu PC, Environment en Render). No crea ni
// altera tablas: usa los mismos servicios que la app, así que antes el servidor tiene que haber
// arrancado al menos una vez con esta versión.
//
// Uso, desde la carpeta servidor/ (en Render: pestaña Shell):
//   node scripts/demo_torneos.mjs --ver                 a qué base apunta y qué demos hay (no escribe)
//   node scripts/demo_torneos.mjs --crear --confirmo    crea los dos torneos demo (si ya están, no hace nada)
//   node scripts/demo_torneos.mjs --borrar --confirmo   borra SOLO los torneos demo (la cuenta demo queda)
//
// Automático: con DEMO_AL_INICIAR=si, el servidor los crea al arrancar (cada deploy) si no existen.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const { sequelize, DB_SCHEMA } = await import("../src/database/sequelize.js");
const demo = await import("../src/services/demo/demo_torneos_service.js");

async function main() {
  const [modo] = process.argv.slice(2);
  assert.ok(["--ver", "--crear", "--borrar"].includes(modo), "Usá --ver, --crear --confirmo o --borrar --confirmo.");
  assert.ok(!DB_SCHEMA.startsWith("gc_dist"), "Ese esquema es de DistribuCG: no se toca.");
  await sequelize.authenticate();
  const [[destino]] = await sequelize.query("SELECT current_database() AS base, current_schema() AS esquema");
  // Solo el servidor (sin usuario ni contraseña) para confirmar a dónde se escribe.
  console.log(`Base: ${destino.base} · esquema: ${destino.esquema} · servidor: ${sequelize.config.host}`);
  const existentes = await demo.torneosDemoExistentes();
  console.log(existentes.length ? `Torneos demo: ${existentes.map((t) => `#${t.id} ${t.nombre} (${t.estado})`).join(" · ")}` : "No hay torneos demo.");
  if (modo === "--ver") return;
  assert.ok(process.argv.includes("--confirmo"), "Para escribir en esta base agregá --confirmo (revisá antes la base de arriba).");

  if (modo === "--borrar") {
    console.log(`Borrados: ${await demo.borrarTorneosDemo()}. La cuenta "Organización Demo" queda (no tiene datos personales reales).`);
    return;
  }
  const r = await demo.crearTorneosDemo();
  if (!r.creados) { console.log("Ya existen: no se crea nada. Para rehacerlos, primero --borrar --confirmo."); return; }
  console.log(`\nListo. Páginas públicas: /torneos/${r.ids[0]} y /torneos/${r.ids[1]}`);
  console.log(`Gestión (entrando con el super admin): /mis-torneos/${r.ids[0]} y /mis-torneos/${r.ids[1]}`);
}

try { await main(); }
catch (e) {
  // No imprimir objetos de Sequelize, SQL ni configuración con credenciales.
  console.error("Demo detenida:", e.name, e.code || e.codigo || e.original?.code || "");
  if (e.name === "AssertionError" || (e.status && e.status < 500)) console.error(e.message);
  process.exitCode = 1;
} finally { await sequelize.close(); }
