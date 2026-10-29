import { createApp } from "./app.js";
import { sequelize } from "./database/sequelize.js";
import { bootstrap_database } from "./database/bootstrap.js";
import { seed_database } from "./database/seed/index.js";
import "./models/index.js";
import { env } from "./configuracion_servidor/env.js";
import { deploymentConfig } from "../../deployment_config.js";
import { crearTorneosDemo } from "./services/demo/demo_torneos_service.js";

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
    // Ya escuchando: la demo no demora el arranque ni el chequeo de salud de Render, y si falla
    // queda en el log sin tirar el servidor. Si los torneos demo ya existen, no hace nada.
    if (env.DEMO_AL_INICIAR) {
      crearTorneosDemo({ log: (linea) => console.log(`🎾 Demo:${linea}`) })
        .then((r) => console.log(r.creados ? `🎾 Demo: torneos creados (/torneos/${r.ids.join(" y /torneos/")})` : "🎾 Demo: ya existen, no se crea nada"))
        .catch((e) => console.error("🎾 Demo: no se pudo crear:", e.message));
    }
  });
}

main().catch((e) => {
  console.error("❌ Error al iniciar:", e);
  process.exit(1);
});
