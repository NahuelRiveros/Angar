import { sequelize } from "../../database/sequelize.js";
import { TorneoCategoria, Inscripcion, Zona, Partido } from "../../models/index.js";
import { PERMITIDO, ESTADOS_TORNEO, nombreCategoria, nombreRonda } from "../../../../torneo_config.js";
import { torneoPropio, error } from "./torneo_service.js";
import { validarConfigCronograma, armarCronograma } from "./cronograma_reglas.js";
import { textoDeHorario } from "./zona_service.js";
import { avisarAJugadores } from "../avisos/avisos_jugador_service.js";

function exigirConfig(body) {
  const { datos, error: invalido } = validarConfigCronograma(body);
  if (invalido) throw error(invalido, 400, "CRONOGRAMA_INVALIDO");
  return datos;
}

/** Todo lo que hace falta para armar y mostrar el cronograma de un torneo (consultas por torneo, no por partido). */
async function cargar(torneo, t) {
  const categorias = await TorneoCategoria.findAll({ where: { torneo_id: torneo.id }, attributes: ["id", "nivel", "rama", "nombre_personalizado"], transaction: t });
  const ids = categorias.map((c) => c.id);
  const [partidos, zonas, parejas] = await Promise.all([
    Partido.findAll({ where: { categoria_id: ids }, attributes: ["id", "categoria_id", "zona_id", "fase", "ronda", "orden", "pareja1_id", "pareja2_id", "sets", "fecha", "hora", "cancha"], transaction: t }),
    Zona.findAll({ where: { categoria_id: ids }, attributes: ["id", "nombre"], transaction: t }),
    Inscripcion.findAll({ where: { torneo_id: torneo.id }, attributes: ["id", "jugador1_nombre", "jugador2_nombre", "usuario_id", "usuario2_id"], transaction: t }),
  ]);
  const rondas = new Map();
  for (const p of partidos) if (p.fase === "llave") rondas.set(p.categoria_id, Math.max(rondas.get(p.categoria_id) ?? 0, p.ronda));
  const nombre = { categoria: new Map(categorias.map((c) => [c.id, nombreCategoria(c)])), zona: new Map(zonas.map((z) => [z.id, z.nombre])), pareja: new Map(parejas.map((p) => [p.id, `${p.jugador1_nombre} / ${p.jugador2_nombre}`])) };
  const describir = (p) => ({
    categoria: nombre.categoria.get(p.categoria_id),
    etapa: p.fase === "zona" ? `Zona ${nombre.zona.get(p.zona_id) ?? ""}`.trim() : nombreRonda(2 ** (rondas.get(p.categoria_id) - p.ronda)),
    partido: `${nombre.pareja.get(p.pareja1_id) ?? "A definir"} vs ${nombre.pareja.get(p.pareja2_id) ?? "A definir"}`,
  });
  // Se programan los que no se jugaron y no tienen ni día ni hora; lo cargado a mano se respeta.
  const pendientes = partidos.filter((p) => !p.sets && !p.fecha && !p.hora);
  const ocupados = partidos.filter((p) => p.fecha && p.hora);
  return { partidos, parejas, pendientes, ocupados, describir };
}

function calcular({ pendientes, ocupados }, config) {
  return armarCronograma({
    config,
    partidos: pendientes.map((p) => ({ id: p.id, categoria_id: p.categoria_id, zona_id: p.zona_id, fase: p.fase, ronda: p.ronda, orden: p.orden, parejas: [p.pareja1_id, p.pareja2_id] })),
    ocupados: ocupados.map((p) => ({ fecha: p.fecha, hora: p.hora, cancha: p.cancha, parejas: [p.pareja1_id, p.pareja2_id], categoria_id: p.categoria_id, fase: p.fase, ronda: p.ronda })),
  });
}

function exigirEstado(torneo) {
  if (!PERMITIDO.programarPartidos.includes(torneo.estado)) {
    throw error(`El cronograma se arma con el torneo en inscripción o en juego (está en "${ESTADOS_TORNEO[torneo.estado]?.etiqueta ?? torneo.estado}").`, 409, "ESTADO_NO_PERMITE");
  }
}

function resultado(datos, r) {
  const porId = new Map(datos.partidos.map((p) => [p.id, p]));
  return {
    asignados: r.asignados.map((a) => ({ ...a, ...datos.describir(porId.get(a.id)) })),
    sin_lugar: r.sinLugar.map((id) => ({ id, ...datos.describir(porId.get(id)) })),
    ya_programados: datos.ocupados.length,
  };
}

/** Cómo quedaría, sin guardar nada. */
export async function previsualizarCronograma(torneoId, usuario, body) {
  const config = exigirConfig(body);
  const torneo = await torneoPropio(torneoId, usuario);
  exigirEstado(torneo);
  const datos = await cargar(torneo);
  if (!datos.pendientes.length) throw error("No hay partidos sin horario para programar: primero sorteá las zonas.", 409, "SIN_PARTIDOS");
  return resultado(datos, calcular(datos, config));
}

/**
 * Guarda el cronograma (se vuelve a calcular con el torneo bloqueado: da lo mismo que la vista
 * previa salvo que algo haya cambiado en el medio) y avisa a cada jugador con cuenta una sola vez,
 * con todos sus horarios juntos.
 */
export async function aplicarCronograma(torneoId, usuario, body) {
  const config = exigirConfig(body);
  let guardado;
  const salida = await sequelize.transaction(async (t) => {
    const torneo = await torneoPropio(torneoId, usuario, t);
    exigirEstado(torneo);
    const datos = await cargar(torneo, t);
    if (!datos.pendientes.length) throw error("No hay partidos sin horario para programar.", 409, "SIN_PARTIDOS");
    const r = calcular(datos, config);
    for (const a of r.asignados) await Partido.update({ fecha: a.fecha, hora: a.hora, cancha: a.cancha, actualizado_en: new Date() }, { where: { id: a.id }, transaction: t });
    guardado = { torneo: { id: torneo.id, nombre: torneo.nombre }, datos, asignados: r.asignados };
    return resultado(datos, r);
  });
  avisarHorarios(guardado);
  return salida;
}

/** Un aviso por jugador (campanita y mail) con todos sus partidos programados. En segundo plano. */
function avisarHorarios({ torneo, datos, asignados }) {
  const porId = new Map(datos.partidos.map((p) => [p.id, p]));
  const usuariosDe = new Map(datos.parejas.map((p) => [p.id, [p.usuario_id, p.usuario2_id].filter(Boolean)]));
  const lineas = new Map(); // usuario → renglones
  for (const a of asignados) {
    const p = porId.get(a.id);
    const d = datos.describir(p);
    for (const usuarioId of [p.pareja1_id, p.pareja2_id].flatMap((id) => usuariosDe.get(id) ?? [])) {
      lineas.set(usuarioId, [...(lineas.get(usuarioId) ?? []), `${d.categoria} · ${d.partido}: ${textoDeHorario(a)}`]);
    }
  }
  for (const [usuarioId, partidos] of lineas) {
    avisarAJugadores([usuarioId], "horarios_torneo", { torneo: torneo.nombre, torneoId: torneo.id, partidos });
  }
}
