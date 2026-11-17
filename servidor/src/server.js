import { createApp } from "./core/app.js";
import { sequelize } from "./core/database/sequelize.js";
import { bootstrap_database } from "./core/database/bootstrap.js";
import { seed_database } from "./core/database/seed/index.js";
import "./core/models/index.js";
import { env } from "./core/configuracion_servidor/env.js";
import { deploymentConfig } from "../../proyecto/deployment_config.js";

async function main() {
  console.log(`🚀 Iniciando ${deploymentConfig.nombre} [${env.NODE_ENV}]...`);

  await sequelize.authenticate();
  await sequelize.query(`SET TIME ZONE 'America/Argentina/Cordoba'`);
  console.log("✅ Base de datos conectada");

  await bootstrap_database();
  await seed_database();

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
