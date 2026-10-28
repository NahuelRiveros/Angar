import { http } from "../../api/http.js";

export async function getMiPerfil() {
  const r = await http.get("/jugadores/yo");
  return r.data.data;
}

export async function getPerfilPublico(codigo) {
  const r = await http.get(`/jugadores/${encodeURIComponent(codigo)}`, { publicAccess: true });
  return r.data.data;
}

export async function getParticipantes(torneoId) {
  const r = await http.get(`/publico/torneos/${torneoId}/participantes`, { publicAccess: true });
  return r.data.data;
}

/** El compañero invitado responde: acepta = true | false. */
export async function responderInvitacion(inscripcionId, acepta) {
  const r = await http.post(`/inscripciones/${inscripcionId}/invitacion`, { acepta });
  return r.data;
}
