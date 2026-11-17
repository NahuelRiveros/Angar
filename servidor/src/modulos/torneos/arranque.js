import { QueryTypes } from "sequelize";
import { sequelize, DB_SCHEMA } from "../../core/database/sequelize.js";
import { configTorneos } from "./configuracion.js";
import { Rol } from "./models/index.js";
import { asignarCodigosFaltantes } from "./services/jugadores/jugador_service.js";
import { crearTorneosDemo } from "./services/demo/demo_torneos_service.js";

// Ajustes que corren en cada arranque DESPUÉS de sincronizar los modelos (necesitan las tablas
// ya creadas). Todos idempotentes.
export async function arranque_torneos() {
  await crear_rol_soporte();
  await migrar_cinta_de_anuncios();
}

/**
 * Rol del equipo de la plataforma que atiende a los organizadores. Se crea antes de los datos base del
 * core para que, al aparecer "Ver planes de organizadores", lo reciba por defecto (porDefecto).
 */
export async function crear_rol_soporte() {
  await Rol.findOrCreate({ where: { codigo: "soporte" }, defaults: { codigo: "soporte", descripcion: "Soporte" } });
}

// Después de los datos base del core (roles y super admin), en cada arranque.
export async function seed_torneos() {
  const completados = await asignarCodigosFaltantes(); // cuentas sin jugador (MIG-04)
  if (completados) console.log(`🎾 Jugadores: ${completados} cuenta/s recibieron su código`);
  // En segundo plano: la demo no demora el arranque ni el chequeo de salud de Render, y si falla queda
  // en el log sin tirar el servidor. Si los torneos demo ya existen, no hace nada.
  if (configTorneos.DEMO_AL_INICIAR) {
    crearTorneosDemo({ log: (linea) => console.log(`🎾 Demo:${linea}`) })
      .then((r) => console.log(r.creados ? `🎾 Demo: torneos creados (/torneos/${r.ids.join(" y /torneos/")})` : "🎾 Demo: ya existen, no se crea nada"))
      .catch((e) => console.error("🎾 Demo: no se pudo crear:", e.message));
  }
}

/**
 * Migración única (D4): la cinta de anuncios de MiPadel pasa a los banners del core (tipo "cinta").
 * Copia lo que había, con su orden y estado, y borra la tabla vieja en la misma transacción: si algo
 * falla no se pierde nada y se reintenta en el próximo arranque. Sin banner_anuncio no hace nada.
 */
export async function migrar_cinta_de_anuncios() {
  const [{ existe }] = await sequelize.query(
    "SELECT to_regclass(:tabla) IS NOT NULL AS existe",
    { replacements: { tabla: `"${DB_SCHEMA}".banner_anuncio` }, type: QueryTypes.SELECT },
  );
  if (!existe) return;
  await sequelize.transaction(async (transaction) => {
    const [, copiadas] = await sequelize.query(`
      INSERT INTO "${DB_SCHEMA}".banner_promocion (tipo, titulo, orden, activo, creado_en, actualizado_en)
      SELECT 'cinta', texto, orden, activo, creado_en, now() FROM "${DB_SCHEMA}".banner_anuncio
    `, { transaction });
    await sequelize.query(`DROP TABLE "${DB_SCHEMA}".banner_anuncio`, { transaction });
    console.log(`✅ Cinta de anuncios migrada a banner_promocion (${copiadas ?? 0} anuncio/s)`);
  });
}
