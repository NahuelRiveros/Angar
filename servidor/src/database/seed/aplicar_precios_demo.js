import { sequelize, DB_SCHEMA } from "../sequelize.js";
import * as modelos from "../../models/index.js";
import { aplicarPreciosDemo } from "./precios_demo_distribuidora.js";

// Ejecutar desde servidor: npm run seed:precios-demo
// Escribe en la base del .env (nunca en el esquema de producción gc_dist).
try {
  await sequelize.authenticate();
  console.log(`Cargando precios de demostración en el esquema ${DB_SCHEMA}...`);
  const resultado = await sequelize.transaction(async (transaction) => {
    // Mismo bloqueo que la carga del catálogo: no se pisan si corren a la vez.
    await sequelize.query("SELECT pg_advisory_xact_lock(741923, 1)", { transaction });
    return aplicarPreciosDemo({ modelos, transaction, esquema: DB_SCHEMA });
  });
  console.log(`✅ ${resultado.productos} artículos con precio de demostración (${resultado.ofertas} en oferta).`);
  console.log(`✅ ${resultado.activados} artículos que ya tenían precio pasaron a disponibles.`);
  console.log(`✅ ${resultado.con_stock} presentaciones sin stock recibieron stock de demostración.`);
} catch (error) {
  console.error(`❌ No se cargaron los precios: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
