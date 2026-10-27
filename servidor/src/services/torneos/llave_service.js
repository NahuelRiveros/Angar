import { Op } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { TorneoCategoria, Inscripcion, Zona, Partido } from "../../models/index.js";
import { PERMITIDO, ESTADOS_TORNEO } from "../../../../torneo_config.js";
import { torneoPropio, error } from "./torneo_service.js";
import { tablaDeZona, validarResultado } from "./zona_reglas.js";
import { armarLlave, partidosDeLlave, destinoDelGanador, nombreRonda, podio } from "./llave_reglas.js";

export const tieneLlave = (categoriaId, t) => Partido.count({ where: { categoria_id: categoriaId, fase: "llave" }, transaction: t });
const llaveConResultados = (categoriaId, t) => Partido.count({ where: { categoria_id: categoriaId, fase: "llave", sets: { [Op.ne]: null } }, transaction: t });

function exigirEnJuego(torneo) {
  if (!PERMITIDO.armarLlave.includes(torneo.estado)) {
    throw error(`La llave se arma con el torneo en juego (está en "${ESTADOS_TORNEO[torneo.estado]?.etiqueta ?? torneo.estado}").`, 409, "ESTADO_NO_PERMITE");
  }
}

async function categoriaDelTorneo(torneo, categoriaId, t) {
  const categoria = await TorneoCategoria.findOne({ where: { id: categoriaId, torneo_id: torneo.id }, ...(t ? { transaction: t, lock: t.LOCK.UPDATE } : {}) });
  if (!categoria) throw error("No encontramos esa categoría en el torneo.", 404, "CATEGORIA_INEXISTENTE");
  return categoria;
}

/** Zonas con sus clasificados (en orden) y si terminaron. */
async function clasificados(categoria, t) {
  const [zonas, parejas, partidos] = await Promise.all([
    Zona.findAll({ where: { categoria_id: categoria.id }, order: [["orden", "ASC"]], transaction: t }),
    Inscripcion.findAll({ where: { categoria_id: categoria.id, estado: "confirmada" }, attributes: ["id", "zona_id"], order: [["id", "ASC"]], transaction: t }),
    Partido.findAll({ where: { categoria_id: categoria.id, fase: "zona" }, transaction: t }),
  ]);
  return zonas.map((z) => {
    const ids = parejas.filter((p) => p.zona_id === z.id).map((p) => p.id);
    const tabla = tablaDeZona(ids, partidos.filter((p) => p.zona_id === z.id).map((p) => p.get({ plain: true })), categoria.clasifican_por_zona);
    return { nombre: z.nombre, completa: tabla.completa, clasificados: tabla.filas.filter((f) => f.clasificado).map((f) => f.inscripcion_id) };
  });
}

/** La llave por rondas, con nombres de parejas, el podio y si se puede armar. */
export async function detalleLlave(categoria, t) {
  const [partidos, parejas, zonas] = await Promise.all([
    Partido.findAll({ where: { categoria_id: categoria.id, fase: "llave" }, order: [["ronda", "ASC"], ["orden", "ASC"]], transaction: t }),
    Inscripcion.findAll({ where: { categoria_id: categoria.id }, attributes: ["id", "jugador1_nombre", "jugador2_nombre"], transaction: t }),
    clasificados(categoria, t),
  ]);
  const nombre = new Map(parejas.map((p) => [p.id, `${p.jugador1_nombre} / ${p.jugador2_nombre}`]));
  const pareja = (id) => (id ? { id, nombre: nombre.get(id) } : null);
  const rondas = partidos.reduce((max, p) => Math.max(max, p.ronda), 0);
  const plano = partidos.map((p) => p.get({ plain: true }));
  const resultado = podio(plano, rondas);
  return {
    categoria_id: categoria.id,
    formato_llave: categoria.formato_llave,
    armada: partidos.length > 0,
    con_resultados: plano.some((p) => p.sets),
    zonas_completas: zonas.length > 0 && zonas.every((z) => z.completa),
    zonas_pendientes: zonas.filter((z) => !z.completa).map((z) => z.nombre),
    rondas: Array.from({ length: rondas }, (_, i) => {
      const deRonda = plano.filter((p) => p.ronda === i + 1);
      // El nombre sale del tamaño teórico de la ronda: una primera ronda con pases sigue siendo "Cuartos".
      return {
        ronda: i + 1,
        nombre: nombreRonda(2 ** (rondas - i - 1)),
        partidos: deRonda.map((p) => ({ id: p.id, orden: p.orden, formato: p.formato, pareja1: pareja(p.pareja1_id), pareja2: pareja(p.pareja2_id), sets: p.sets, ganador_id: p.ganador_id })),
      };
    }),
    podio: { campeon: pareja(resultado.campeon), subcampeon: pareja(resultado.subcampeon), semifinalistas: resultado.semifinalistas.map(pareja) },
  };
}

export async function verLlave(torneoId, categoriaId, usuario) {
  const torneo = await torneoPropio(torneoId, usuario);
  return detalleLlave(await categoriaDelTorneo(torneo, categoriaId));
}

/** Arma (o rearma, si todavía no tiene resultados) la llave con los clasificados de las zonas. */
export async function armarLlaveCategoria(torneoId, categoriaId, usuario) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigirEnJuego(torneo);
    const categoria = await categoriaDelTorneo(torneo, categoriaId, t);
    if (await llaveConResultados(categoria.id, t)) throw error("La llave ya tiene resultados: no se puede volver a armar.", 409, "CON_RESULTADOS");
    const zonas = await clasificados(categoria, t);
    if (!zonas.length) throw error("Primero armá las zonas.", 409, "SIN_ZONAS");
    const pendientes = zonas.filter((z) => !z.completa).map((z) => z.nombre);
    if (pendientes.length) throw error(`Faltan resultados en la zona ${pendientes.join(", ")}.`, 409, "ZONAS_INCOMPLETAS");

    const llave = armarLlave(zonas);
    if (llave.error) throw error(llave.error, 409, "POCOS_CLASIFICADOS");
    await Partido.destroy({ where: { categoria_id: categoria.id, fase: "llave" }, transaction: t });
    await Partido.bulkCreate(partidosDeLlave(llave).map((p) => ({
      categoria_id: categoria.id, fase: "llave", ronda: p.ronda, orden: p.orden, pareja1_id: p.pareja1, pareja2_id: p.pareja2, formato: categoria.formato_llave,
    })), { transaction: t });
    return detalleLlave(categoria, t);
  });
}

/** Vuelve atrás la llave (sin resultados) para poder corregir las zonas. */
export async function deshacerLlave(torneoId, categoriaId, usuario) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigirEnJuego(torneo);
    const categoria = await categoriaDelTorneo(torneo, categoriaId, t);
    if (await llaveConResultados(categoria.id, t)) throw error("La llave ya tiene resultados: no se puede deshacer.", 409, "CON_RESULTADOS");
    await Partido.destroy({ where: { categoria_id: categoria.id, fase: "llave" }, transaction: t });
    return detalleLlave(categoria, t);
  });
}

async function siguientePartido(partido, t) {
  const rondas = await Partido.max("ronda", { where: { categoria_id: partido.categoria_id, fase: "llave" }, transaction: t });
  const destino = destinoDelGanador(partido, rondas);
  if (!destino) return {};
  const siguiente = await Partido.findOne({ where: { categoria_id: partido.categoria_id, fase: "llave", ronda: destino.ronda, orden: destino.orden }, transaction: t, lock: t.LOCK.UPDATE });
  return { siguiente, lado: destino.lado };
}

/**
 * Resultado de un partido de llave (dentro de la transacción del llamador). El ganador ocupa su
 * lugar en el partido siguiente; si ese ya se jugó y el ganador cambia, hay que borrarlo primero.
 */
export async function cargarResultadoDeLlave(partido, sets, t) {
  if (!partido.pareja1_id || !partido.pareja2_id) throw error("Todavía no están definidas las dos parejas de este partido.", 409, "PAREJAS_SIN_DEFINIR");
  const { datos, error: invalido } = validarResultado(sets, partido.formato);
  if (invalido) throw error(invalido, 400, "RESULTADO_INVALIDO");
  const ganador = datos.ganador === 1 ? partido.pareja1_id : partido.pareja2_id;
  const { siguiente, lado } = await siguientePartido(partido, t);
  if (siguiente) {
    if (siguiente.sets && siguiente[lado] !== ganador) throw error("El partido siguiente ya tiene resultado: borralo antes de cambiar quién ganó este.", 409, "SIGUIENTE_JUGADO");
    await siguiente.update({ [lado]: ganador, actualizado_en: new Date() }, { transaction: t });
  }
  await partido.update({ sets: datos.sets, ganador_id: ganador, actualizado_en: new Date() }, { transaction: t });
}

export async function borrarResultadoDeLlave(partido, t) {
  const { siguiente, lado } = await siguientePartido(partido, t);
  if (siguiente?.sets) throw error("El partido siguiente ya tiene resultado: borralo primero.", 409, "SIGUIENTE_JUGADO");
  if (siguiente) await siguiente.update({ [lado]: null, actualizado_en: new Date() }, { transaction: t });
  await partido.update({ sets: null, ganador_id: null, actualizado_en: new Date() }, { transaction: t });
}
