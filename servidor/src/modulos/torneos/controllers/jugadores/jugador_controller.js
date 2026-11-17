import { miPerfil, perfilPublico, participantesPublicos } from "../../services/jugadores/jugador_service.js";
import { responderInvitacion } from "../../services/torneos/inscripcion_service.js";
import { conIds, responderError } from "../torneos/torneo_controller.js";

export async function miPerfilController(req, res) {
  try {
    return res.json({ ok: true, data: await miPerfil(req.user.usuario_id) });
  } catch (e) { return responderError(res, e, "No pudimos cargar tu perfil."); }
}

export async function perfilPublicoController(req, res) {
  try {
    res.set("Cache-Control", "public, max-age=60");
    return res.json({ ok: true, data: await perfilPublico(req.params.codigo) });
  } catch (e) { return responderError(res, e, "No pudimos cargar el perfil."); }
}

export const participantesController = conIds(async (req, res, { torneoId }) => {
  res.set("Cache-Control", "public, max-age=60");
  return res.json({ ok: true, data: await participantesPublicos(torneoId) });
}, "No pudimos cargar los participantes.");

export const responderInvitacionController = conIds(async (req, res, { inscripcionId }) => {
  if (typeof req.body?.acepta !== "boolean") return res.status(400).json({ ok: false, codigo: "DATOS_INVALIDOS", mensaje: "Indicá si aceptás o rechazás la invitación." });
  await responderInvitacion(req.user, inscripcionId, req.body.acepta);
  return res.json({ ok: true, mensaje: req.body.acepta ? "¡Aceptaste! Ahora la organización confirma la inscripción." : "Rechazaste la invitación." });
}, "No pudimos responder la invitación.");
