import { Op } from "sequelize";
import { AvisoUsuario, Usuario } from "../../models/index.js";
import { avisarSinEsperar, contactoDeUsuario } from "../common/avisos_service.js";
import { avisoParaCampanita } from "../common/avisos_reglas.js";

const DIAS_DE_HISTORIAL = 90;
const ULTIMOS = 30;

/**
 * Avisa a jugadores (los dos de la pareja, si tienen cuenta): siempre en la campanita y, con
 * `mail`, también por correo a quien no lo desactivó. Corre en segundo plano después de guardar:
 * nunca frena ni rompe la acción que lo dispara. Devuelve la promesa por si alguien (un test)
 * quiere esperarla.
 */
export function avisarAJugadores(usuarioIds, tipo, datos, { mail = true } = {}) {
  const ids = [...new Set(usuarioIds.filter(Boolean))];
  if (!ids.length) return Promise.resolve();
  return Promise.resolve()
    .then(async () => {
      const aviso = avisoParaCampanita(tipo, datos);
      await AvisoUsuario.bulkCreate(ids.map((usuario_id) => ({ usuario_id, ...aviso })));
      // La campanita no crece para siempre: lo viejo se borra al llegar algo nuevo.
      await AvisoUsuario.destroy({ where: { usuario_id: ids, creado_en: { [Op.lt]: new Date(Date.now() - DIAS_DE_HISTORIAL * 86400000) } } });
      if (!mail) return;
      for (const id of ids) {
        avisarSinEsperar(tipo, async () => {
          const usuario = await Usuario.findByPk(id, { attributes: ["recibir_mails"] });
          if (!usuario?.recibir_mails) return null;
          const contacto = await contactoDeUsuario(id);
          return contacto && { para: contacto.email, datos };
        });
      }
    })
    .catch((e) => console.error(`No se pudo guardar el aviso "${tipo}":`, e.message));
}

/** Los últimos avisos del usuario y cuántos no leyó. */
export async function misAvisos(usuario) {
  const [avisos, noLeidos] = await Promise.all([
    AvisoUsuario.findAll({ where: { usuario_id: usuario.usuario_id }, attributes: ["id", "tipo", "titulo", "detalle", "ruta", "leido_en", "creado_en"], order: [["creado_en", "DESC"], ["id", "DESC"]], limit: ULTIMOS }),
    AvisoUsuario.count({ where: { usuario_id: usuario.usuario_id, leido_en: null } }),
  ]);
  return { avisos, no_leidos: noLeidos };
}

/** Marca todos como leídos (se hace al abrir la campanita). */
export async function marcarAvisosLeidos(usuario) {
  const [cantidad] = await AvisoUsuario.update({ leido_en: new Date() }, { where: { usuario_id: usuario.usuario_id, leido_en: null } });
  return cantidad;
}

/** Preferencia de mails del jugador (la campanita llega igual). */
export async function cambiarRecibirMails(usuario, valor) {
  if (typeof valor !== "boolean") {
    const error = new Error("Indicá si querés recibir avisos por mail.");
    throw Object.assign(error, { status: 400, codigo: "DATOS_INVALIDOS" });
  }
  await Usuario.update({ recibir_mails: valor }, { where: { id: usuario.usuario_id } });
  return { recibir_mails: valor };
}
