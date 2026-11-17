import { http } from "../../../core/api/http.js";

// ── El organizador sobre su propio plan ─────────────────────────────────────
export async function getMiSuscripcion() {
  const r = await http.get("/plan-organizador/mia");
  return r.data.data;
}

export async function empezarAOrganizar() {
  const r = await http.post("/plan-organizador/empezar");
  return r.data;
}

export async function getMisPagos() {
  const r = await http.get("/plan-organizador/mia/pagos");
  return r.data.data;
}

/** Devuelve { url_pago } para ir a MercadoPago. */
export async function crearPagoSuscripcion() {
  const r = await http.post("/plan-organizador/pagar");
  return r.data.data;
}

// ── Equipo de la plataforma ─────────────────────────────────────────────────
export async function getSuscripciones({ busqueda = "", estado = "", page = 1, limit = 20 } = {}) {
  const r = await http.get("/plan-organizador/admin", { params: { busqueda, estado, page, limit } });
  return r.data;
}

export async function getPagosDeUsuario(usuarioId) {
  const r = await http.get(`/plan-organizador/admin/${usuarioId}/pagos`);
  return r.data.data;
}

export async function extenderSuscripcion(usuarioId, { dias, nota }) {
  const r = await http.post(`/plan-organizador/admin/${usuarioId}/extender`, { dias, nota });
  return r.data;
}

export async function fijarVencimientoSuscripcion(usuarioId, { fecha, nota }) {
  const r = await http.post(`/plan-organizador/admin/${usuarioId}/fijar`, { fecha, nota });
  return r.data;
}

// ── Transferencias ──────────────────────────────────────────────────────────
export async function avisarTransferencia({ comprobante, nota }) {
  const datos = new FormData();
  datos.append("comprobante", comprobante);
  if (nota) datos.append("nota", nota);
  const r = await http.post("/plan-organizador/transferencia", datos);
  return r.data;
}

/** Enlace firmado que vence a los pocos minutos. */
export async function getEnlaceComprobante(pagoId) {
  const r = await http.get(`/plan-organizador/comprobantes/${pagoId}`);
  return r.data.data;
}

export async function getTransferencias({ estado = "pendiente", page = 1, limit = 20 } = {}) {
  const r = await http.get("/plan-organizador/admin/transferencias", { params: { estado, page, limit } });
  return r.data;
}

export async function aprobarTransferencia(pagoId) {
  const r = await http.post(`/plan-organizador/admin/transferencias/${pagoId}/aprobar`);
  return r.data;
}

export async function rechazarTransferencia(pagoId, motivo) {
  const r = await http.post(`/plan-organizador/admin/transferencias/${pagoId}/rechazar`, { motivo });
  return r.data;
}
