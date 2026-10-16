import { sequelize, DB_SCHEMA } from "../sequelize.js";
import { projectModules } from "../../configuracion_servidor/gate_config.js";
import { seed_familias_distribuidora } from "./seed_familias_distribuidora.js";
import { seed_marcas_distribuidora } from "./seed_marcas_distribuidora.js";

// Ejecutar desde servidor: npm run seed:distribuidora.
// Usa el .env habitual; no ejecuta bootstrap, sync ni los demás seeds.
try {
  if (!projectModules.eccomerce_distribuidora) throw new Error("El módulo distribuidora está desactivado.");
  await sequelize.authenticate();
  console.log(`Actualizando catálogo de distribuidora en el esquema ${DB_SCHEMA}...`);
  const resultado = await sequelize.transaction(async (transaction) => {
    // Serializa actualizaciones simultáneas sin crear tablas auxiliares.
    await sequelize.query("SELECT pg_advisory_xact_lock(741923, 1)", { transaction });
    const familias = await seed_familias_distribuidora({ completar: true, transaction });
    const marcas = await seed_marcas_distribuidora({ completar: true, transaction });
    return { familias, marcas };
  });
  console.log(`✅ Agregadas: ${resultado.familias.familias} familias, ${resultado.familias.categorias} categorías, ${resultado.marcas.marcas} marcas y ${resultado.marcas.asociaciones} asociaciones.`);
  if (resultado.familias.omitidas.length) console.warn(`Categorías dadas de baja respetadas: ${resultado.familias.omitidas.join(", ")}`);
  if (resultado.marcas.faltantes.length) console.warn(`Rutas no disponibles: ${resultado.marcas.faltantes.join(", ")}`);
} catch (error) {
  console.error(`❌ No se actualizó el catálogo: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
