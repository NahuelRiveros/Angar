import { projectModules } from "../../configuracion_servidor/gate_config.js";
import { completarProductos } from "./completar_productos_distribuidora.js";
import { PRODUCTOS_INICIALES } from "./productos_distribuidora/index.js";

// Mantiene la exportación anterior; los datos se editan en un archivo por familia.
export { PRODUCTOS_INICIALES };

/** Arranque con cero artículos (incluidas bajas), o completado explícito. */
export async function seed_productos_distribuidora({ completar = false, transaction } = {}) {
  if (!projectModules.eccomerce_distribuidora) return;
  // Importar la lista para validarla no carga el .env ni abre una conexión.
  const { sequelize } = await import("../sequelize.js");
  const modelos = await import("../../models/index.js");
  const { resolverMarcaDeArticulo } = await import("../../services/distribuidora/marcas_distribuidora_service.js");
  const ejecutar = async (tx) => {
    // Mismo bloqueo que el comando manual, también durante el primer arranque.
    await sequelize.query("SELECT pg_advisory_xact_lock(741923, 1)", { transaction: tx });
    if (!completar && await modelos.ProductoDistribuidora.count({ transaction: tx })) return;
    return completarProductos(modelos, PRODUCTOS_INICIALES, tx, resolverMarcaDeArticulo);
  };
  const resultado = transaction ? await ejecutar(transaction) : await sequelize.transaction(ejecutar);
  if (!resultado) return;
  for (const omitido of resultado.omitidos) {
    console.warn(`⚠️ Producto omitido: ${omitido.ruta} / ${omitido.nombre}: ${omitido.motivo}`);
  }
  console.log(`✅ Productos: ${resultado.productos} agregados como inactivos; ${resultado.existentes} existentes conservados`);
  return resultado;
}
