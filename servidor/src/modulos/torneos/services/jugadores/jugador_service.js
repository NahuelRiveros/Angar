import { Op, QueryTypes, UniqueConstraintError } from "sequelize";
import { sequelize } from "../../../../core/database/sequelize.js";
import { Usuario, Persona, Jugador, Torneo, Inscripcion, TorneoCategoria } from "../../models/index.js";
import { nombreCategoria } from "../../../../../../rubros/torneos/torneo_config.js";
import { generarCodigoJugador, normalizarCodigoJugador } from "../common/codigo_jugador.js";
import { puestoAlcanzado, resumirHistorial } from "./jugador_reglas.js";

const error = (mensaje, status, codigo) => Object.assign(new Error(mensaje), { status, codigo });
const PUBLICOS = ["inscripcion", "en_juego", "finalizado"];

/** Las cuentas sin jugador (de antes del rubro o de antes del código) lo reciben al arrancar. Sin pendientes es una sola consulta. */
export async function asignarCodigosFaltantes() {
  const sinJugador = await Usuario.findAll({ include: [{ model: Jugador, as: "jugador", required: false, attributes: [] }], where: { "$jugador.id$": null }, attributes: ["id"] });
  for (const usuario of sinJugador) {
    for (let intento = 0; intento < 5; intento += 1) {
      try {
        await Jugador.create({ usuario_id: usuario.id, codigo: generarCodigoJugador() });
        break;
      } catch (e) {
        if (!(e instanceof UniqueConstraintError)) throw e; // muy raro: se repitió un código, se prueba otro
      }
    }
  }
  return sinJugador.length;
}

// Cuenta activa con su jugador (código y preferencia de mails).
const CON_JUGADOR = { model: Jugador, as: "jugador", attributes: ["codigo", "recibir_mails"] };
const ACTIVA = { activo: true, eliminado_en: null };
/**
 * Participaciones de varios jugadores en torneos que ya se juegan o terminaron, con la ronda de
 * llave a la que llegó cada pareja. Una sola consulta para todos (sin una por jugador).
 */
export async function participacionesDe(usuarioIds) {
  if (!usuarioIds.length) return [];
  const filas = await sequelize.query(`
    WITH mias AS (
      SELECT i.id, i.categoria_id, i.torneo_id, u.usuario_id
      FROM inscripcion i
      CROSS JOIN LATERAL (VALUES (i.usuario_id), (i.usuario2_id)) AS u(usuario_id)
      JOIN torneo t ON t.id = i.torneo_id
      WHERE u.usuario_id IN (:ids) AND i.estado = 'confirmada' AND t.estado IN ('en_juego', 'finalizado')
    ),
    llaves AS (
      SELECT categoria_id, MAX(ronda) AS rondas FROM partido
      WHERE fase = 'llave' AND categoria_id IN (SELECT categoria_id FROM mias)
      GROUP BY categoria_id
    )
    SELECT m.usuario_id, m.id AS inscripcion_id, m.torneo_id, t.nombre AS torneo, t.fecha_inicio, t.estado AS torneo_estado,
           c.nivel, c.rama, c.nombre_personalizado, l.rondas,
           (SELECT MAX(p.ronda) FROM partido p WHERE p.categoria_id = m.categoria_id AND p.fase = 'llave' AND (p.pareja1_id = m.id OR p.pareja2_id = m.id)) AS alcanzada,
           EXISTS (SELECT 1 FROM partido p WHERE p.categoria_id = m.categoria_id AND p.fase = 'llave' AND p.ronda = l.rondas AND p.ganador_id = m.id) AS campeon
    FROM mias m
    JOIN torneo t ON t.id = m.torneo_id
    JOIN torneo_categoria c ON c.id = m.categoria_id
    LEFT JOIN llaves l ON l.categoria_id = m.categoria_id
    ORDER BY t.fecha_inicio DESC NULLS LAST, m.id DESC`, { replacements: { ids: usuarioIds }, type: QueryTypes.SELECT });
  return filas.map((f) => ({
    usuario_id: f.usuario_id, inscripcion_id: f.inscripcion_id, torneo_id: f.torneo_id, torneo: f.torneo,
    fecha_inicio: f.fecha_inicio, torneo_estado: f.torneo_estado, categoria: nombreCategoria(f),
    puesto: puestoAlcanzado({ rondas: f.rondas, alcanzada: f.alcanzada, campeon: f.campeon }),
  }));
}

async function perfil(usuario) {
  const persona = await Persona.findByPk(usuario.persona_id, { attributes: ["nombre", "apellido"] });
  const participaciones = await participacionesDe([usuario.id]);
  return {
    codigo: usuario.jugador?.codigo ?? null,
    nombre: `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim(),
    resumen: resumirHistorial(participaciones),
    historial: participaciones.slice(0, 50).map(({ usuario_id: _u, inscripcion_id: _i, ...p }) => p),
  };
}

export async function miPerfil(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId, { attributes: ["id", "persona_id"], include: [CON_JUGADOR] });
  if (!usuario) throw error("No encontramos tu cuenta.", 404, "USUARIO_INEXISTENTE");
  // La preferencia de mails es solo del perfil propio, nunca del público.
  return { ...await perfil(usuario), recibir_mails: usuario.jugador?.recibir_mails ?? true };
}

/** Perfil público por código: solo nombre y datos deportivos (nada de email ni teléfono). */
export async function perfilPublico(codigo) {
  const normalizado = normalizarCodigoJugador(codigo);
  const usuario = normalizado && await Usuario.findOne({
    where: ACTIVA, attributes: ["id", "persona_id"],
    include: [{ ...CON_JUGADOR, where: { codigo: normalizado } }],
  });
  if (!usuario) throw error("No encontramos ese jugador.", 404, "JUGADOR_INEXISTENTE");
  return perfil(usuario);
}

/** Usuario activo dueño de un código (para invitarlo como compañero). */
export async function usuarioPorCodigo(codigo, t) {
  const normalizado = normalizarCodigoJugador(codigo);
  if (!normalizado) return null;
  const usuario = await Usuario.findOne({ where: ACTIVA, attributes: ["id", "persona_id"], include: [{ ...CON_JUGADOR, where: { codigo: normalizado } }], transaction: t });
  if (!usuario) return null;
  const persona = await Persona.findByPk(usuario.persona_id, { attributes: ["nombre", "apellido"], transaction: t });
  return { id: usuario.id, codigo: usuario.jugador.codigo, nombre: `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim() };
}

/**
 * Parejas confirmadas de un torneo publicado, por categoría. Los jugadores con cuenta muestran su
 * código y resumen (torneos, títulos, mejor puesto); los cargados por nombre, solo el nombre.
 */
export async function participantesPublicos(torneoId) {
  const torneo = await Torneo.findOne({ where: { id: torneoId, estado: PUBLICOS }, attributes: ["id"] });
  if (!torneo) throw error("No encontramos ese torneo.", 404, "TORNEO_INEXISTENTE");
  const [categorias, parejas] = await Promise.all([
    TorneoCategoria.findAll({ where: { torneo_id: torneo.id }, attributes: ["id", "nivel", "rama", "nombre_personalizado"], order: [["orden", "ASC"], ["id", "ASC"]] }),
    Inscripcion.findAll({ where: { torneo_id: torneo.id, estado: "confirmada" }, attributes: ["id", "categoria_id", "usuario_id", "usuario2_id", "jugador1_nombre", "jugador2_nombre"], order: [["id", "ASC"]] }),
  ]);
  const ids = [...new Set(parejas.flatMap((p) => [p.usuario_id, p.usuario2_id]).filter(Boolean))];
  const [cuentas, participaciones] = await Promise.all([
    ids.length ? Usuario.findAll({ where: { id: { [Op.in]: ids }, ...ACTIVA }, attributes: ["id"], include: [CON_JUGADOR] }) : [],
    participacionesDe(ids),
  ]);
  const codigo = new Map(cuentas.filter((u) => u.jugador).map((u) => [u.id, u.jugador.codigo]));
  const resumen = (id) => resumirHistorial(participaciones.filter((p) => p.usuario_id === id));
  const jugador = (nombre, id) => (id && codigo.has(id) ? { nombre, codigo: codigo.get(id), resumen: resumen(id) } : { nombre, codigo: null, resumen: null });
  return categorias.map((c) => ({
    id: c.id,
    nombre: nombreCategoria(c),
    parejas: parejas.filter((p) => p.categoria_id === c.id).map((p) => ({
      id: p.id, jugador1: jugador(p.jugador1_nombre, p.usuario_id), jugador2: jugador(p.jugador2_nombre, p.usuario2_id),
    })),
  }));
}
