import { QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";

// Cuentas reales: sin las dadas de baja ni las de dominios de prueba (la cuenta demo, tests).
const REALES = `u.eliminado_en IS NULL AND p.email NOT ILIKE '%@example.test'`;

/**
 * Cuántos usuarios se registraron (total, últimos 7 y 30 días) y los últimos, solo con nombre y
 * fecha de alta: es para el super admin y no hace falta nada más (ni email ni teléfono).
 */
export async function resumenRegistrados({ page, limit } = {}) {
  const pag = normalizarPaginacion({ page, limit, maxLimit: 50, defaultLimit: 10 });
  const [[conteo], filas] = await Promise.all([
    sequelize.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE u.creado_en >= now() - interval '7 days')::int AS ultimos_7,
             COUNT(*) FILTER (WHERE u.creado_en >= now() - interval '30 days')::int AS ultimos_30
      FROM usuario u JOIN persona p ON p.id = u.persona_id
      WHERE ${REALES}`, { type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT u.id, p.nombre, p.apellido, u.creado_en
      FROM usuario u JOIN persona p ON p.id = u.persona_id
      WHERE ${REALES}
      ORDER BY u.creado_en DESC, u.id DESC
      LIMIT :limite OFFSET :offset`, { replacements: { limite: pag.limit, offset: pag.offset }, type: QueryTypes.SELECT }),
  ]);
  return {
    resumen: { total: conteo.total, ultimos_7: conteo.ultimos_7, ultimos_30: conteo.ultimos_30 },
    data: filas,
    ...armarPaginacion({ page: pag.page, limit: pag.limit, total: conteo.total }),
  };
}
