import {
  obtenerMiSuscripcion, empezarAOrganizar, historialPagos, crearPagoMercadoPago,
  procesarPagoMercadoPago, listarSuscripciones, extenderManual, fijarVencimiento, ESTADOS_FILTRABLES,
  avisarTransferencia, enlaceComprobante, listarTransferencias, aprobarTransferencia, rechazarTransferencia,
} from "../../services/suscripciones/suscripcion_service.js";
import { validarExtensionManual, validarAjusteFecha, validarRechazo } from "../../services/suscripciones/suscripcion_reglas.js";

// Errores de negocio con status propio; el resto, 500 con mensaje genérico.
function responderError(res, e, mensaje) {
  if (e.status) return res.status(e.status).json({ ok: false, codigo: e.codigo, mensaje: e.message });
  console.error(mensaje, e);
  return res.status(500).json({ ok: false, codigo: "ERROR_SUSCRIPCION", mensaje });
}

const usuarioIdValido = (valor) => {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function miSuscripcionController(req, res) {
  try {
    return res.json({ ok: true, data: await obtenerMiSuscripcion(req.user.usuario_id) });
  } catch (e) { return responderError(res, e, "No pudimos cargar tu plan."); }
}

export async function empezarController(req, res) {
  try {
    const { creada, suscripcion } = await empezarAOrganizar(req.user.usuario_id);
    return res.status(creada ? 201 : 200).json({
      ok: true,
      mensaje: creada ? "¡Listo! Empezó tu prueba gratis." : "Ya tenías tu cuenta de organizador.",
      data: suscripcion,
    });
  } catch (e) { return responderError(res, e, "No pudimos activar tu cuenta de organizador."); }
}

export async function misPagosController(req, res) {
  try {
    return res.json({ ok: true, data: await historialPagos(req.user.usuario_id) });
  } catch (e) { return responderError(res, e, "No pudimos cargar tus pagos."); }
}

export async function crearPagoController(req, res) {
  try {
    return res.json({ ok: true, data: await crearPagoMercadoPago(req.user.usuario_id) });
  } catch (e) { return responderError(res, e, "No pudimos iniciar el pago con MercadoPago. Probá de nuevo en unos minutos."); }
}

/**
 * Aviso de MercadoPago (público). Llega como { type: "payment", data: { id } } o, en el
 * formato viejo, como ?topic=payment&id=. 200 si se procesó o no corresponde; 500 ante
 * un error nuestro para que MercadoPago lo reintente.
 */
export async function webhookController(req, res) {
  const tipo = req.body?.type ?? req.query?.type ?? req.query?.topic;
  const id = req.body?.data?.id ?? req.query?.["data.id"] ?? req.query?.id;
  if (tipo !== "payment" || !/^\d{1,30}$/.test(String(id ?? ""))) return res.sendStatus(200);
  try {
    const r = await procesarPagoMercadoPago(String(id));
    console.log(`MercadoPago: pago ${id} → ${r.resultado}${r.estado ? ` (${r.estado})` : ""}${r.motivo ? ` (${r.motivo})` : ""}`);
    return res.sendStatus(200);
  } catch (e) {
    console.error(`MercadoPago: error al procesar el pago ${id}:`, e.message);
    return res.sendStatus(500);
  }
}

export async function listarController(req, res) {
  try {
    const estado = ESTADOS_FILTRABLES.includes(req.query.estado) ? req.query.estado : "";
    const r = await listarSuscripciones({ busqueda: req.query.busqueda, estado, page: req.query.page, limit: req.query.limit });
    return res.json({ ok: true, ...r });
  } catch (e) { return responderError(res, e, "No pudimos listar las suscripciones."); }
}

export async function pagosDeUsuarioController(req, res) {
  const usuarioId = usuarioIdValido(req.params.usuarioId);
  if (!usuarioId) return res.status(400).json({ ok: false, codigo: "ID_INVALIDO", mensaje: "Usuario inválido." });
  try {
    return res.json({ ok: true, data: await historialPagos(usuarioId) });
  } catch (e) { return responderError(res, e, "No pudimos cargar los pagos."); }
}

export async function extenderController(req, res) {
  const usuarioId = usuarioIdValido(req.params.usuarioId);
  const { datos, error } = validarExtensionManual(req.body);
  if (!usuarioId || error) return res.status(400).json({ ok: false, codigo: "DATOS_INVALIDOS", mensaje: error ?? "Usuario inválido." });
  try {
    const data = await extenderManual(usuarioId, datos, req.user.usuario_id);
    return res.json({ ok: true, mensaje: `Se sumaron ${datos.dias} día(s). Vence el ${data.fecha_vencimiento}.`, data });
  } catch (e) { return responderError(res, e, "No pudimos extender el plan."); }
}

export async function fijarController(req, res) {
  const usuarioId = usuarioIdValido(req.params.usuarioId);
  const { datos, error } = validarAjusteFecha(req.body);
  if (!usuarioId || error) return res.status(400).json({ ok: false, codigo: "DATOS_INVALIDOS", mensaje: error ?? "Usuario inválido." });
  try {
    const data = await fijarVencimiento(usuarioId, datos, req.user.usuario_id);
    return res.json({ ok: true, mensaje: `Vencimiento fijado al ${datos.fecha}.`, data });
  } catch (e) { return responderError(res, e, "No pudimos cambiar el vencimiento."); }
}

// ── Transferencias ──────────────────────────────────────────────────────────

const pagoIdValido = usuarioIdValido;

export async function avisarTransferenciaController(req, res) {
  try {
    const pago = await avisarTransferencia(req.user.usuario_id, { archivo: req.file, nota: req.body?.nota });
    return res.status(201).json({ ok: true, mensaje: "¡Recibimos tu comprobante! Te avisamos apenas confirmemos la transferencia.", data: { id: pago.id, estado: pago.estado } });
  } catch (e) { return responderError(res, e, "No pudimos registrar tu transferencia."); }
}

export async function comprobanteController(req, res) {
  const pagoId = pagoIdValido(req.params.pagoId);
  if (!pagoId) return res.status(400).json({ ok: false, codigo: "ID_INVALIDO", mensaje: "Comprobante inválido." });
  try {
    return res.json({ ok: true, data: await enlaceComprobante(pagoId, req.user) });
  } catch (e) { return responderError(res, e, "No pudimos abrir el comprobante."); }
}

export async function listarTransferenciasController(req, res) {
  try {
    return res.json({ ok: true, ...await listarTransferencias({ estado: req.query.estado, page: req.query.page, limit: req.query.limit }) });
  } catch (e) { return responderError(res, e, "No pudimos listar las transferencias."); }
}

export async function aprobarTransferenciaController(req, res) {
  const pagoId = pagoIdValido(req.params.pagoId);
  if (!pagoId) return res.status(400).json({ ok: false, codigo: "ID_INVALIDO", mensaje: "Transferencia inválida." });
  try {
    const pago = await aprobarTransferencia(pagoId, req.user.usuario_id);
    return res.json({ ok: true, mensaje: `Transferencia aprobada: el plan vence el ${pago.vencimiento_nuevo}.`, data: pago });
  } catch (e) { return responderError(res, e, "No pudimos aprobar la transferencia."); }
}

export async function rechazarTransferenciaController(req, res) {
  const pagoId = pagoIdValido(req.params.pagoId);
  const { datos, error } = validarRechazo(req.body);
  if (!pagoId || error) return res.status(400).json({ ok: false, codigo: "DATOS_INVALIDOS", mensaje: error ?? "Transferencia inválida." });
  try {
    await rechazarTransferencia(pagoId, datos, req.user.usuario_id);
    return res.json({ ok: true, mensaje: "Transferencia rechazada. El organizador ve el motivo en su plan." });
  } catch (e) { return responderError(res, e, "No pudimos rechazar la transferencia."); }
}
