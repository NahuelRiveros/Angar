import { sequelize, DB_SCHEMA } from "../sequelize.js";
import { env } from "../../configuracion_servidor/env.js";
import { Persona, Usuario } from "../../models/index.js";
import { diagnosticarSuperAdmin } from "../../services/common/diagnostico_super_admin.js";

// Ejecutar en el servicio de Render: npm run admin:verificar.
// No ejecuta bootstrap, seeds, cambios de contraseña ni intentos de login.
try {
  await sequelize.authenticate();
  console.log(`Diagnóstico de super admin. Esquema: ${DB_SCHEMA}`);
  const resultado = await diagnosticarSuperAdmin({ config: env, Persona, Usuario });
  console.log(`${resultado.codigo}: ${resultado.mensaje}`);
  if (resultado.emailGuardado) console.log(`Email guardado de la cuenta: ${resultado.emailGuardado}`);
  if (!resultado.ok) process.exitCode = 1;
} catch (error) {
  console.error(`No se pudo verificar la cuenta (${error.name}). Revisá la conexión y el esquema del servicio.`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
