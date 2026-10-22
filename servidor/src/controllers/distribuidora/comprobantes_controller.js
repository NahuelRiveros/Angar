import {
  subirComprobante, enlaceComprobante, aceptarComprobante, rechazarComprobante,
} from "../../services/distribuidora/comprobantes_service.js";

const esId = (valor) => /^\d+$/.test(String(valor ?? ""));
const noEncontrado = (res, mensaje = "Pedido no encontrado") => res.status(404).json({ ok: false, mensaje });

function responderError(res, error, contexto, generico) {
  console.error(`Error al ${contexto}:`, error);
  return res.status(error.status ?? 500).json({ ok: false, codigo: error.codigo, mensaje: error.status ? error.message : generico });
}

export async function subirComprobanteController(req, res) {
  try {
    if (!esId(req.params.id)) return noEncontrado(res);
    const comprobante = await subirComprobante(req.user.usuario_id, Number(req.params.id), req.file);
    if (!comprobante) return noEncontrado(res);
    const { public_id: _privado, ...data } = comprobante.toJSON();
    return res.status(201).json({ ok: true, mensaje: "Recibimos tu comprobante. Lo revisamos y te avisamos por mail.", data });
  } catch (error) {
    return responderError(res, error, "subir comprobante", "Error interno al subir el comprobante");
  }
}

export async function enlaceComprobanteController(req, res) {
  try {
    if (!esId(req.params.id) || !esId(req.params.comprobanteId)) return noEncontrado(res, "Comprobante no encontrado");
    const enlace = await enlaceComprobante(req.user, Number(req.params.id), Number(req.params.comprobanteId));
    if (!enlace) return noEncontrado(res, "Comprobante no encontrado");
    return res.json({ ok: true, data: enlace });
  } catch (error) {
    return responderError(res, error, "abrir comprobante", "Error interno al abrir el comprobante");
  }
}

export async function aceptarComprobanteController(req, res) {
  try {
    if (!esId(req.params.id) || !esId(req.params.comprobanteId)) return noEncontrado(res, "Comprobante no encontrado");
    const nota = await aceptarComprobante(Number(req.params.id), Number(req.params.comprobanteId), { usuario_id: req.user.usuario_id, monto: req.body?.monto });
    if (!nota) return noEncontrado(res, "Comprobante no encontrado");
    return res.json({ ok: true, mensaje: "Comprobante aceptado y cobro registrado", data: nota });
  } catch (error) {
    return responderError(res, error, "aceptar comprobante", "Error interno al aceptar el comprobante");
  }
}

export async function rechazarComprobanteController(req, res) {
  try {
    if (!esId(req.params.id) || !esId(req.params.comprobanteId)) return noEncontrado(res, "Comprobante no encontrado");
    const comprobante = await rechazarComprobante(Number(req.params.id), Number(req.params.comprobanteId), { usuario_id: req.user.usuario_id, motivo: req.body?.motivo });
    if (!comprobante) return noEncontrado(res, "Comprobante no encontrado");
    return res.json({ ok: true, mensaje: "Comprobante rechazado. Le avisamos al cliente." });
  } catch (error) {
    return responderError(res, error, "rechazar comprobante", "Error interno al rechazar el comprobante");
  }
}
