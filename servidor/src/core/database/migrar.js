// Migraciones de los módulos opcionales prendidos (MOD-08, MOD-09). Se aplican solas al arrancar; esto es
// para mirarlas o para volver atrás en tu PC:
//   npm --prefix servidor run migrar:estado
//   npm --prefix servidor run migrar:deshacer -- catalogo
import { sequelize, DB_SCHEMA } from "./sequelize.js";
import { deshacerMigracion, estadoMigraciones, problemaParaDeshacer } from "./migraciones.js";
import { env } from "../configuracion_servidor/env.js";
import { deploymentConfig } from "../../../../proyecto/deployment_config.js";
import { opcionalesActivos } from "../opcionales/registro.js";

const [accion, codigo] = process.argv.slice(2);
const base = { sequelize, schema: DB_SCHEMA };

async function estado() {
  const filas = await estadoMigraciones(opcionalesActivos, base);
  if (!filas.length) return console.log("Ningún módulo prendido tiene migraciones.");
  for (const f of filas) console.log(`${f.aplicada ? "✅" : "⏳"} ${f.modulo}/${f.nombre}`);
}

async function deshacer() {
  const problema = problemaParaDeshacer({
    entorno: env.NODE_ENV, urlRemota: env.BD_URL, host: env.DB_HOST, esquema: DB_SCHEMA, esquemaProduccion: deploymentConfig.esquemaProduccion,
  });
  if (problema) throw new Error(problema);
  const modulo = opcionalesActivos.find((m) => m.codigo === codigo);
  if (!modulo?.migraciones) throw new Error(`Indicá un módulo prendido: ${opcionalesActivos.map((m) => m.codigo).join(", ") || "no hay ninguno"}.`);
  const nombre = await deshacerMigracion(modulo, base);
  console.log(nombre ? `↩️  Deshecha: ${codigo}/${nombre}. Vuelve a aplicarse en el próximo arranque si el módulo sigue prendido.` : `${codigo} no tiene migraciones aplicadas.`);
}

try {
  if (accion === "estado") await estado();
  else if (accion === "deshacer") await deshacer();
  else throw new Error("Usá: migrar.js estado | migrar.js deshacer <modulo>");
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
