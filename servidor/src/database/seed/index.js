import { seed_catalogos } from "./seed_catalogos.js";
import { seed_rbac } from "./seed_rbac.js";
import { sincronizarPermisos } from "../../services/usuarios/permisos_service.js";
import { seed_super_admin } from "./seed_super_admin.js";
import { seed_suscripcion } from "./seed_suscripcion.js";
import { seed_familias_distribuidora } from "./seed_familias_distribuidora.js";
import { seed_marcas_distribuidora } from "./seed_marcas_distribuidora.js";
import { seed_productos_distribuidora } from "./seed_productos_distribuidora.js";
import { seed_catalogo_demo } from "./catalogo_demo.js";
import { env } from "../../configuracion_servidor/env.js";

/**
 * Seed de catálogos + usuario super admin — idempotente, seguro de correr
 * en cada arranque del server. No pisa la contraseña de un usuario ya
 * creado (si necesitás resetearla, hacelo desde la app, no acá).
 *
 * El orden importa: seed_super_admin depende de que ya exista el rol
 * "admin"/"super_admin" (de seed_rbac). Cada seed_*.js de acá adentro es
 * autocontenido — no se importan entre sí, solo este orquestador los conecta.
 *
 * seed_home() se eliminó: sembraba home_texto/home_pilar/home_contacto con
 * copy hardcodeado del template original de gimnasio, sin gate de
 * projectModules — cada reinicio del server los recreaba (findOrCreate) aun
 * después de vaciar la tabla a mano, pisando silenciosamente el contenido
 * real de frontend/src/config/home_config.js (que es la fuente de verdad
 * desde que se sacó la edición de textos/pilares/contacto del panel admin,
 * ver home_config_page.jsx). Esas tres tablas ya no las siembra nadie.
 */
export async function seed_database() {
  console.log("🌱 Sembrando datos base...");
  await seed_catalogos();
  await seed_rbac();
  await sincronizarPermisos(); // después de seed_rbac: asigna los permisos nuevos a supervisor y vendedor
  await seed_super_admin();
  await seed_suscripcion();
  await seed_familias_distribuidora(); // solo con el catálogo vacío
  await seed_marcas_distribuidora();   // solo sin marcas; usa las familias de arriba
  await seed_productos_distribuidora(); // solo sin artículos; usa familias y marcas existentes
  // Solo en ambientes de demostración (nunca en gc_dist): completa el catálogo y pone precios de prueba.
  if (env.CATALOGO_DEMO_AL_INICIAR) await seed_catalogo_demo();
  console.log("✅ Seed finalizado");
}
