import { http } from "./http.js";

// ── El organizador sobre su propio plan ─────────────────────────────────────
export async function getMiSuscripcion() {
  const r = await http.get("/suscripcion/mia");
  return r.data.data;
}

export async function empezarAOrganizar() {
  const r = await http.post("/suscripcion/empezar");
  return r.data;
}

export async function getMisPagos() {
  const r = await http.get("/suscripcion/mia/pagos");
  return r.data.data;
}

/** Devuelve { url_pago } para ir a MercadoPago. */
export async function crearPagoSuscripcion() {
  const r = await http.post("/suscripcion/pagar");
  return r.data.data;
}

// ── Equipo de la plataforma ─────────────────────────────────────────────────
export async function getSuscripciones({ busqueda = "", estado = "", page = 1, limit = 20 } = {}) {
  const r = await http.get("/suscripcion/admin", { params: { busqueda, estado, page, limit } });
  return r.data;
}

export async function getPagosDeUsuario(usuarioId) {
  const r = await http.get(`/suscripcion/admin/${usuarioId}/pagos`);
  return r.data.data;
}

export async function extenderSuscripcion(usuarioId, { dias, nota }) {
  const r = await http.post(`/suscripcion/admin/${usuarioId}/extender`, { dias, nota });
  return r.data;
}

export async function fijarVencimientoSuscripcion(usuarioId, { fecha, nota }) {
  const r = await http.post(`/suscripcion/admin/${usuarioId}/fijar`, { fecha, nota });
  return r.data;
}
