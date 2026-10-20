import { seed_familias_distribuidora } from "./seed_familias_distribuidora.js";
import { seed_marcas_distribuidora } from "./seed_marcas_distribuidora.js";
import { seed_productos_distribuidora } from "./seed_productos_distribuidora.js";
import { aplicarPreciosDemo, esquemaPermiteDemo } from "./precios_demo_distribuidora.js";

/**
 * Catálogo de DEMOSTRACIÓN en cada arranque (variable CATALOGO_DEMO_AL_INICIAR=true):
 * completa familias, marcas y productos del seed y les pone precios de demostración.
 * Todo es repetible, así que arranques sin novedades no cambian nada.
 * En el esquema de producción (gc_dist) se saltea con un aviso, sin frenar el arranque.
 */
export async function seed_catalogo_demo({ esquema } = {}) {
  const { sequelize, DB_SCHEMA } = await import("../sequelize.js");
  const modelos = await import("../../models/index.js");
  const destino = esquema ?? DB_SCHEMA;
  if (!esquemaPermiteDemo(destino)) {
    console.warn(`⚠️ CATALOGO_DEMO_AL_INICIAR está activo pero el esquema "${destino}" es de producción: no se cargan precios de demostración.`);
    return null;
  }
  const resultado = await sequelize.transaction(async (transaction) => {
    // Mismo bloqueo que seed:distribuidora y seed:precios-demo.
    await sequelize.query("SELECT pg_advisory_xact_lock(741923, 1)", { transaction });
    await seed_familias_distribuidora({ completar: true, transaction });
    await seed_marcas_distribuidora({ completar: true, transaction });
    await seed_productos_distribuidora({ completar: true, transaction });
    return aplicarPreciosDemo({ modelos, transaction, esquema: destino });
  });
  console.log(`✅ Catálogo de demostración: ${resultado.productos} con precio nuevo (${resultado.ofertas} en oferta), ${resultado.activados} activados, ${resultado.con_stock} con stock repuesto.`);
  return resultado;
}
