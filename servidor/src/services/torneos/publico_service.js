import { QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { Torneo, TorneoCategoria, TorneoPremio } from "../../models/index.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";
import { PERMITIDO, nombreCategoria } from "../../../../torneo_config.js";
import { error } from "./torneo_service.js";
import { detalleZonas } from "./zona_service.js";
import { detalleLlave } from "./llave_service.js";

// Lo que se ve sin cuenta. Nunca borradores, ni datos de contacto de las parejas.
const VISIBLES = ["inscripcion", "en_juego", "finalizado"];
const CAMPOS = ["id", "nombre", "descripcion", "sede", "direccion", "localidad", "fecha_inicio", "fecha_fin", "contacto", "reglamento", "estado"];

export async function listarTorneosPublicos({ page, limit } = {}) {
  const pag = normalizarPaginacion({ page, limit, maxLimit: 30, defaultLimit: 12 });
  const { rows, count } = await Torneo.findAndCountAll({
    where: { estado: VISIBLES },
    attributes: ["id", "nombre", "sede", "localidad", "fecha_inicio", "fecha_fin", "estado"],
    // Primero los que se pueden anotar, después en juego y al final los terminados.
    order: [[sequelize.literal(`CASE "Torneo"."estado" WHEN 'inscripcion' THEN 0 WHEN 'en_juego' THEN 1 ELSE 2 END`), "ASC"], ["fecha_inicio", "ASC NULLS LAST"], ["id", "DESC"]],
    limit: pag.limit, offset: pag.offset,
  });
  return { data: rows.map((r) => r.get({ plain: true })), ...armarPaginacion({ page: pag.page, limit: pag.limit, total: count }) };
}

export async function verTorneoPublico(torneoId) {
  const torneo = await Torneo.findOne({ where: { id: torneoId, estado: VISIBLES }, attributes: CAMPOS });
  if (!torneo) throw error("No encontramos ese torneo.", 404, "TORNEO_INEXISTENTE");
  const categorias = await TorneoCategoria.findAll({
    where: { torneo_id: torneo.id },
    include: [{ model: TorneoPremio, as: "premios", attributes: ["puesto", "etiqueta", "descripcion", "orden"] }],
    order: [["orden", "ASC"], ["id", "ASC"], [{ model: TorneoPremio, as: "premios" }, "orden", "ASC"]],
  });
  // Confirmadas por categoría en una sola consulta.
  const conteos = await sequelize.query(
    `SELECT categoria_id, COUNT(*)::int AS confirmadas FROM inscripcion WHERE torneo_id = :torneo AND estado = 'confirmada' GROUP BY categoria_id`,
    { replacements: { torneo: torneo.id }, type: QueryTypes.SELECT },
  );
  const confirmadas = new Map(conteos.map((c) => [c.categoria_id, c.confirmadas]));
  const abierta = PERMITIDO.anotarseOnline.includes(torneo.estado);
  return {
    ...torneo.get({ plain: true }),
    inscripcion_abierta: abierta,
    categorias: categorias.map((c) => {
      const anotadas = confirmadas.get(c.id) ?? 0;
      return {
        id: c.id, nombre: nombreCategoria(c), cupo_parejas: c.cupo_parejas, confirmadas: anotadas,
        lugares_libres: c.cupo_parejas ? Math.max(0, c.cupo_parejas - anotadas) : null,
        premios: c.premios.map(({ puesto, etiqueta, descripcion }) => ({ puesto, etiqueta, descripcion })),
      };
    }),
  };
}

/**
 * Zonas (tabla, fixture y resultados) y llave de una categoría, para seguir el torneo sin cuenta.
 * Solo nombres de las parejas: nada de teléfonos ni datos de la inscripción.
 */
export async function verCategoriaPublica(torneoId, categoriaId) {
  const torneo = await Torneo.findOne({ where: { id: torneoId, estado: VISIBLES }, attributes: ["id"] });
  const categoria = torneo && await TorneoCategoria.findOne({ where: { id: categoriaId, torneo_id: torneo.id } });
  if (!categoria) throw error("No encontramos esa categoría.", 404, "CATEGORIA_INEXISTENTE");
  const [zonas, llave] = await Promise.all([detalleZonas(categoria), detalleLlave(categoria)]);
  return {
    categoria_id: categoria.id,
    nombre: nombreCategoria(categoria),
    formato: zonas.formato,
    zonas: zonas.zonas,
    llave: { armada: llave.armada, formato_llave: llave.formato_llave, rondas: llave.rondas, podio: llave.podio },
  };
}
