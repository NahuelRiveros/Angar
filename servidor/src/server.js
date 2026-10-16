import { createApp } from "./app.js";
import { sequelize } from "./database/sequelize.js";
import { bootstrap_database } from "./database/bootstrap.js";
import { seed_database } from "./database/seed/index.js";
import { iniciarCronEstadoAlumnos } from "./cron/estado_alumno_cron.js";
// import { iniciarSyncQueueCron } from "./cron/sync_queue_cron.js";
import "./models/index.js";
import { env } from "./configuracion_servidor/env.js";
import { projectModules } from "./configuracion_servidor/gate_config.js";
import { deploymentConfig } from "../../deployment_config.js";

async function main() {
  console.log(`🚀 Iniciando ${deploymentConfig.nombre} [${env.NODE_ENV}]...`);

  await sequelize.authenticate();
  await sequelize.query(`SET TIME ZONE 'America/Argentina/Cordoba'`);
  console.log("✅ Base de datos conectada");

  await bootstrap_database();
  await seed_database();

  // alumno/membresia son tablas del módulo gym — bootstrap.js no las crea
  // si el módulo está apagado (ver gate_config.js), así que este cron no
  // puede correr en ese caso: fallaría cada 10 minutos con "no existe la
  // relación «alumno»" contra una base que nunca tuvo esas tablas.
  if (projectModules.gym) {
    iniciarCronEstadoAlumnos();
    console.log("✅ Cron de estados iniciado");
  }

  const app = createApp();

  app.listen(env.PORT, "0.0.0.0", () => {
    if (env.NODE_ENV === "production") {
      console.log(`✅ Servidor corriendo en producción — puerto ${env.PORT}`);
    } else {
      console.log(`✅ API local: http://localhost:${env.PORT}`);
      console.log(`✅ API red:   http://TU-IP-LOCAL:${env.PORT}`);
    }
  });
}

main().catch((e) => {
  console.error("❌ Error al iniciar:", e);
  process.exit(1);
});
