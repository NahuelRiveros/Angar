import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { Torneo, TorneoCategoria, TorneoPremio } from "../../models/index.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";
import { PERMITIDO, nombreCategoria } from "../../../../torneo_config.js";
import { error } from "./torneo_service.js";
import { detalleZonas } from "./zona_service.js";
import { detalleLlave } from "./llave_service.js";
import { ESTADOS_PUBLICOS, normalizarFiltros, resumirTorneo } from "./publico_reglas.js";

// Lo que se ve sin cuenta. Nunca borradores, ni datos de contacto de las parejas.
const VISIBLES = ESTADOS_PUBLICOS;
// La cuenta para transferir la inscripción es pública (decisión del negocio: se ve sin anotarse).
const CAMPOS = ["id", "nombre", "descripcion", "sede", "direccion", "localidad", "fecha_inicio", "fecha_fin", "contacto", "reglamento", "estado", "cobro_titular", "cobro_banco", "cobro_cbu", "cobro_alias"];

/**
 * Torneos visibles con lo que cuenta la tarjeta (categorías, formato, cupos, premio).
 * Filtros: q (nombre, sede o localidad), estado, rama y nivel (alguna categoría que lo juegue).
 * Dos consultas por página, no una por torneo.
 */
export async function listarTorneosPublicos({ page, limit, ...query } = {}) {
  const pag = normalizarPaginacion({ page, limit, maxLimit: 30, defaultLimit: 12 });
  const filtros = normalizarFiltros(query);
  const where = { estado: filtros.estado ?? VISIBLES };
  if (filtros.busqueda) {
    where[Op.or] = ["nombre", "sede", "localidad"].map((campo) => ({ [campo]: { [Op.iLike]: `%${filtros.busqueda}%` } }));
  }
  const replacements = {};
  if (filtros.rama || filtros.nivel) {
    const condiciones = [];
    if (filtros.rama) { condiciones.push("rama = :rama"); replacements.rama = filtros.rama; }
    if (filtros.nivel) { condiciones.push("nivel = :nivel"); replacements.nivel = filtros.nivel; }
    where.id = { [Op.in]: sequelize.literal(`(SELECT torneo_id FROM torneo_categoria WHERE ${condiciones.join(" AND ")})`) };
  }
  const { rows, count } = await Torneo.findAndCountAll({
    where, replacements,
    attributes: ["id", "nombre", "descripcion", "sede", "localidad", "fecha_inicio", "fecha_fin", "estado"],
    // Primero los que se pueden anotar, después en juego y al final los terminados.
    order: [[sequelize.literal(`CASE "Torneo"."estado" WHEN 'inscripcion' THEN 0 WHEN 'en_juego' THEN 1 ELSE 2 END`), "ASC"], ["fecha_inicio", "ASC NULLS LAST"], ["id", "DESC"]],
    limit: pag.limit, offset: pag.offset,
  });
  const torneos = rows.map((r) => r.get({ plain: true }));
  const resumenes = torneos.length ? await resumenesDeTorneos(torneos) : [];
  return { data: resumenes, ...armarPaginacion({ page: pag.page, limit: pag.limit, total: count }) };
}

/** Categorías, confirmadas y premio del campeón de varios torneos de una vez. */
async function resumenesDeTorneos(torneos) {
  const ids = torneos.map((t) => t.id);
  const [categorias, conteos, premios] = await Promise.all([
    TorneoCategoria.findAll({
      where: { torneo_id: ids },
      attributes: ["id", "torneo_id", "nivel", "rama", "nombre_personalizado", "cupo_parejas", "parejas_por_zona", "clasifican_por_zona", "formato_zona"],
      order: [["orden", "ASC"], ["id", "ASC"]],
    }),
    sequelize.query(
      `SELECT categoria_id, COUNT(*)::int AS confirmadas FROM inscripcion WHERE torneo_id IN (:ids) AND estado = 'confirmada' GROUP BY categoria_id`,
      { replacements: { ids }, type: QueryTypes.SELECT },
    ),
    sequelize.query(
      `SELECT DISTINCT ON (c.torneo_id) c.torneo_id, p.descripcion FROM torneo_premio p JOIN torneo_categoria c ON c.id = p.categoria_id
       WHERE c.torneo_id IN (:ids) AND p.puesto = 'campeon' ORDER BY c.torneo_id, c.orden, c.id, p.orden`,
      { replacements: { ids }, type: QueryTypes.SELECT },
    ),
  ]);
  const confirmadas = new Map(conteos.map((c) => [c.categoria_id, c.confirmadas]));
  const premioDe = new Map(premios.map((p) => [p.torneo_id, p.descripcion]));
  return torneos.map((t) => resumirTorneo(t, categorias.filter((c) => c.torneo_id === t.id), confirmadas, premioDe.get(t.id)));
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
        monto_inscripcion: c.monto_inscripcion === null ? null : Number(c.monto_inscripcion),
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
    mejores: zonas.mejores,
    zonas: zonas.zonas,
    llave: { armada: llave.armada, formato_llave: llave.formato_llave, rondas: llave.rondas, podio: llave.podio },
  };
}
