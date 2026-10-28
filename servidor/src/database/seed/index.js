import { seed_catalogos } from "./seed_catalogos.js";
import { seed_rbac } from "./seed_rbac.js";
import { sincronizarPermisos } from "../../services/usuarios/permisos_service.js";
import { seed_super_admin } from "./seed_super_admin.js";
import { asignarCodigosFaltantes } from "../../services/jugadores/jugador_service.js";

/**
 * Seed de catálogos + usuario super admin — idempotente, seguro de correr
 * en cada arranque del server. No pisa la contraseña de un usuario ya
 * creado (si necesitás resetearla, hacelo desde la app, no acá).
 *
 * El orden importa: seed_super_admin depende de que ya exista el rol
 * "admin"/"super_admin" (de seed_rbac). Cada seed_*.js de acá adentro es
 * autocontenido — no se importan entre sí, solo este orquestador los conecta.
 */
export async function seed_database() {
  console.log("🌱 Sembrando datos base...");
  await seed_catalogos();
  await seed_rbac();
  await sincronizarPermisos(); // después de seed_rbac: asigna los permisos nuevos a sus roles por defecto
  await seed_super_admin();
  await asignarCodigosFaltantes(); // cuentas creadas antes de existir el código de jugador
  console.log("✅ Seed finalizado");
}
