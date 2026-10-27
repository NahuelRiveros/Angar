import { randomInt } from "node:crypto";
import { Op } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { TorneoCategoria, Inscripcion, Zona, Partido } from "../../models/index.js";
import { PERMITIDO, ESTADOS_TORNEO } from "../../../../torneo_config.js";
import { torneoPropio, error } from "./torneo_service.js";
import { armarZonas, fixtureTodosContraTodos, tablaDeZona, validarResultado } from "./zona_reglas.js";
import { tieneLlave, detalleLlave, cargarResultadoDeLlave, borrarResultadoDeLlave } from "./llave_service.js";

// Azar del sorteo: criptográfico (nadie puede anticiparlo). Los tests pasan uno fijo.
const azarSeguro = () => randomInt(0, 2 ** 32) / 2 ** 32;

function exigir(torneo, accion, mensaje) {
  if (!PERMITIDO[accion].includes(torneo.estado)) {
    throw error(`${mensaje} (el torneo está en "${ESTADOS_TORNEO[torneo.estado]?.etiqueta ?? torneo.estado}").`, 409, "ESTADO_NO_PERMITE");
  }
}

async function categoriaDelTorneo(torneo, categoriaId, t) {
  const categoria = await TorneoCategoria.findOne({ where: { id: categoriaId, torneo_id: torneo.id }, ...(t ? { transaction: t, lock: t.LOCK.UPDATE } : {}) });
  if (!categoria) throw error("No encontramos esa categoría en el torneo.", 404, "CATEGORIA_INEXISTENTE");
  return categoria;
}

const conResultados = (where, t) => Partido.count({ where: { ...where, sets: { [Op.ne]: null } }, transaction: t });

/** Partidos todos contra todos de una zona, con el formato vigente de la categoría. */
async function crearPartidosDeZona(categoria, zonaId, parejas, t) {
  const partidos = fixtureTodosContraTodos(parejas).map(([uno, dos], orden) => ({
    categoria_id: categoria.id, zona_id: zonaId, fase: "zona", orden, pareja1_id: uno, pareja2_id: dos, formato: categoria.formato_zona,
  }));
  await Partido.bulkCreate(partidos, { transaction: t });
}

/** Zonas con sus parejas, partidos y tabla, más las confirmadas que todavía no tienen zona. */
export async function detalleZonas(categoria, t) {
  const [zonas, inscripciones, partidos] = await Promise.all([
    Zona.findAll({ where: { categoria_id: categoria.id }, order: [["orden", "ASC"]], transaction: t }),
    Inscripcion.findAll({ where: { categoria_id: categoria.id, estado: "confirmada" }, attributes: ["id", "jugador1_nombre", "jugador2_nombre", "cabeza_de_serie", "zona_id"], order: [["id", "ASC"]], transaction: t }),
    Partido.findAll({ where: { categoria_id: categoria.id, fase: "zona" }, order: [["zona_id", "ASC"], ["orden", "ASC"]], transaction: t }),
  ]);
  const pareja = (i) => ({ id: i.id, nombre: `${i.jugador1_nombre} / ${i.jugador2_nombre}`, cabeza_de_serie: i.cabeza_de_serie });
  const porId = new Map(inscripciones.map((i) => [i.id, pareja(i)]));
  return {
    categoria_id: categoria.id,
    formato: { parejas_por_zona: categoria.parejas_por_zona, clasifican_por_zona: categoria.clasifican_por_zona, formato_zona: categoria.formato_zona },
    sin_zona: inscripciones.filter((i) => !i.zona_id).map(pareja),
    zonas: zonas.map((z) => {
      const ids = inscripciones.filter((i) => i.zona_id === z.id).map((i) => i.id);
      const deZona = partidos.filter((p) => p.zona_id === z.id).map((p) => p.get({ plain: true }));
      const tabla = tablaDeZona(ids, deZona, categoria.clasifican_por_zona);
      return {
        id: z.id, nombre: z.nombre,
        parejas: ids.map((id) => porId.get(id)),
        partidos: deZona.map((p) => ({ id: p.id, orden: p.orden, formato: p.formato, pareja1: porId.get(p.pareja1_id), pareja2: porId.get(p.pareja2_id), sets: p.sets, ganador_id: p.ganador_id })),
        completa: tabla.completa,
        tabla: tabla.filas.map((f) => ({ ...f, pareja: porId.get(f.inscripcion_id) })),
      };
    }),
  };
}

export async function verZonas(torneoId, categoriaId, usuario) {
  const torneo = await torneoPropio(torneoId, usuario);
  return detalleZonas(await categoriaDelTorneo(torneo, categoriaId));
}

/**
 * Sortea las zonas de nuevo con las parejas confirmadas. Borra las anteriores y su fixture,
 * así que solo se puede mientras no haya ningún resultado cargado en la categoría.
 */
export async function generarZonas(torneoId, categoriaId, usuario, { azar = azarSeguro } = {}) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigir(torneo, "armarZonas", "Las zonas se arman con la inscripción abierta o en juego");
    const categoria = await categoriaDelTorneo(torneo, categoriaId, t);
    if (await conResultados({ categoria_id: categoria.id }, t)) throw error("Ya hay resultados cargados: no se pueden volver a sortear las zonas.", 409, "CON_RESULTADOS");
    const parejas = await Inscripcion.findAll({ where: { categoria_id: categoria.id, estado: "confirmada" }, attributes: ["id", "cabeza_de_serie"], order: [["id", "ASC"]], transaction: t });
    if (parejas.length < 2) throw error("Hacen falta al menos 2 parejas confirmadas para armar zonas.", 409, "POCAS_PAREJAS");

    await Partido.destroy({ where: { categoria_id: categoria.id, fase: "zona" }, transaction: t });
    await Inscripcion.update({ zona_id: null }, { where: { categoria_id: categoria.id }, transaction: t });
    await Zona.destroy({ where: { categoria_id: categoria.id }, transaction: t });

    for (const [orden, armada] of armarZonas(parejas.map((p) => p.get({ plain: true })), categoria.parejas_por_zona, azar).entries()) {
      const zona = await Zona.create({ categoria_id: categoria.id, nombre: armada.nombre, orden }, { transaction: t });
      await Inscripcion.update({ zona_id: zona.id }, { where: { id: armada.parejas }, transaction: t });
      await crearPartidosDeZona(categoria, zona.id, armada.parejas, t);
    }
    return detalleZonas(categoria, t);
  });
}

/** Pasa una pareja a otra zona (o ubica a una que quedó sin zona) y rehace el fixture de las zonas tocadas. */
export async function moverPareja(torneoId, categoriaId, usuario, { inscripcion_id: inscripcionId, zona_id: zonaId } = {}) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigir(torneo, "armarZonas", "Las zonas se ajustan con la inscripción abierta o en juego");
    const categoria = await categoriaDelTorneo(torneo, categoriaId, t);
    const inscripcion = await Inscripcion.findOne({ where: { id: Number(inscripcionId) || 0, categoria_id: categoria.id, estado: "confirmada" }, transaction: t, lock: t.LOCK.UPDATE });
    const destino = await Zona.findOne({ where: { id: Number(zonaId) || 0, categoria_id: categoria.id }, transaction: t });
    if (!inscripcion || !destino) throw error("No encontramos esa pareja o esa zona en la categoría.", 404, "DATOS_INEXISTENTES");
    if (inscripcion.zona_id === destino.id) return detalleZonas(categoria, t);

    const tocadas = [destino.id, inscripcion.zona_id].filter(Boolean);
    if (await conResultados({ zona_id: tocadas }, t)) throw error("Esas zonas ya tienen resultados: no se pueden cambiar sus parejas.", 409, "CON_RESULTADOS");
    if (inscripcion.zona_id && await Inscripcion.count({ where: { zona_id: inscripcion.zona_id }, transaction: t }) <= 2) {
      throw error("La zona de origen quedaría con una sola pareja.", 409, "ZONA_CHICA");
    }
    await inscripcion.update({ zona_id: destino.id, actualizado_en: new Date() }, { transaction: t });
    for (const zonaTocada of tocadas) {
      await Partido.destroy({ where: { zona_id: zonaTocada }, transaction: t });
      const ids = (await Inscripcion.findAll({ where: { zona_id: zonaTocada, estado: "confirmada" }, attributes: ["id"], order: [["id", "ASC"]], transaction: t })).map((i) => i.id);
      await crearPartidosDeZona(categoria, zonaTocada, ids, t);
    }
    return detalleZonas(categoria, t);
  });
}

async function partidoDelTorneo(torneo, partidoId, t) {
  const partido = await Partido.findByPk(partidoId, { transaction: t, lock: t.LOCK.UPDATE });
  const categoria = partido && await TorneoCategoria.findOne({ where: { id: partido.categoria_id, torneo_id: torneo.id }, transaction: t });
  if (!partido || !categoria) throw error("No encontramos ese partido.", 404, "PARTIDO_INEXISTENTE");
  return { partido, categoria };
}

const LLAVE_ARMADA = "La llave ya está armada: deshacela (si todavía no tiene resultados) para corregir las zonas.";

/**
 * Carga (o corrige) el resultado; el marcador se valida con el formato del partido.
 * Devuelve las zonas o la llave según de qué fase era el partido.
 */
export async function cargarResultado(torneoId, partidoId, usuario, sets) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigir(torneo, "cargarResultados", "Los resultados se cargan con el torneo en juego");
    const { partido, categoria } = await partidoDelTorneo(torneo, partidoId, t);
    if (partido.fase === "llave") {
      await cargarResultadoDeLlave(partido, sets, t);
      return { fase: "llave", ...await detalleLlave(categoria, t) };
    }
    if (await tieneLlave(categoria.id, t)) throw error(LLAVE_ARMADA, 409, "LLAVE_ARMADA");
    const { datos, error: invalido } = validarResultado(sets, partido.formato);
    if (invalido) throw error(invalido, 400, "RESULTADO_INVALIDO");
    await partido.update({ sets: datos.sets, ganador_id: datos.ganador === 1 ? partido.pareja1_id : partido.pareja2_id, actualizado_en: new Date() }, { transaction: t });
    return { fase: "zona", ...await detalleZonas(categoria, t) };
  });
}

export async function borrarResultado(torneoId, partidoId, usuario) {
  return sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigir(torneo, "cargarResultados", "Los resultados se corrigen con el torneo en juego");
    const { partido, categoria } = await partidoDelTorneo(torneo, partidoId, t);
    if (partido.fase === "llave") {
      await borrarResultadoDeLlave(partido, t);
      return { fase: "llave", ...await detalleLlave(categoria, t) };
    }
    if (await tieneLlave(categoria.id, t)) throw error(LLAVE_ARMADA, 409, "LLAVE_ARMADA");
    await partido.update({ sets: null, ganador_id: null, actualizado_en: new Date() }, { transaction: t });
    return { fase: "zona", ...await detalleZonas(categoria, t) };
  });
}

