import { randomUUID } from "node:crypto";
import { orderConfig, receiptProblem } from "../../../../order_config.js";
import { tienePermiso } from "../../../../permisos_config.js";
import { sequelize } from "../../database/sequelize.js";
import { NotaPedido, NotaPedidoComprobante } from "../../models/index.js";
import { cartError } from "../common/cart_rules.js";
import { detectarFormatoComprobante } from "../common/comprobante_rules.js";
import { subirArchivoPrivado, eliminarArchivoPrivado, enlaceArchivoPrivado } from "../common/upload_service.js";
import { centavosDeImporte, cobrarPedidoBloqueado } from "./nota_pedido_service.js";
import { avisarComprobanteNuevo, avisarComprobanteRechazado } from "./avisos_pedido_service.js";

const CARPETA = "distribucg/comprobantes";
const SEGUNDOS_ENLACE = 300;

async function pedidoPropio(usuario_id, nota_pedido_id, t) {
  const nota = await NotaPedido.findOne({ where: { id: nota_pedido_id, usuario_id }, ...(t ? { transaction: t, lock: t.LOCK.UPDATE } : {}) });
  if (!nota) return null;
  const previos = await NotaPedidoComprobante.count({ where: { nota_pedido_id }, ...(t ? { transaction: t } : {}) });
  const problema = receiptProblem(nota, previos);
  if (problema) throw cartError(problema, 409, "COMPROBANTE_NO_ADMITIDO");
  return nota;
}

/**
 * El comprador adjunta un comprobante a SU pedido. Se valida antes de subir (para no
 * subir de balde) y otra vez con el pedido bloqueado; si el registro falla, el archivo
 * subido se borra de Cloudinary.
 */
export async function subirComprobante(usuario_id, nota_pedido_id, archivo) {
  if (!archivo?.buffer?.length) throw cartError("Adjuntá la foto o el PDF del comprobante.");
  if (archivo.buffer.length > orderConfig.receipts.maxBytes) throw cartError("El archivo supera los 5 MB.", 413, "ARCHIVO_GRANDE");
  const formato = detectarFormatoComprobante(archivo.buffer);
  if (!formato) throw cartError("El comprobante tiene que ser una imagen (JPG, PNG o WEBP) o un PDF.", 400, "ARCHIVO_INVALIDO");
  if (!await pedidoPropio(usuario_id, nota_pedido_id)) return null;

  const subido = await subirArchivoPrivado(archivo.buffer, { folder: CARPETA, public_id: `pedido-${nota_pedido_id}-${randomUUID()}` });
  let comprobante;
  try {
    comprobante = await sequelize.transaction(async (t) => {
      if (!await pedidoPropio(usuario_id, nota_pedido_id, t)) throw cartError("Pedido no encontrado", 404);
      return NotaPedidoComprobante.create({
        nota_pedido_id, public_id: subido.public_id, resource_type: subido.resource_type ?? "image", formato,
        nombre_archivo: String(archivo.originalname ?? "").slice(0, 150) || null, tamano: archivo.buffer.length,
        estado: "pendiente", subido_por: usuario_id, subido_en: new Date(),
      }, { transaction: t });
    });
  } catch (error) {
    await eliminarArchivoPrivado(subido.public_id).catch((e) => console.error("No se pudo borrar el comprobante huérfano:", e.message));
    throw error;
  }
  avisarComprobanteNuevo(nota_pedido_id);
  return comprobante;
}

/** Enlace temporal al archivo: solo para el dueño del pedido o el equipo de gestión. */
export async function enlaceComprobante(usuario, nota_pedido_id, comprobante_id) {
  const esEquipo = tienePermiso(usuario, "pedidos.ver");
  const { usuario_id } = usuario;
  const comprobante = await NotaPedidoComprobante.findOne({
    where: { id: comprobante_id, nota_pedido_id },
    include: [{ model: NotaPedido, as: "nota_pedido", attributes: ["id"], ...(esEquipo ? {} : { where: { usuario_id } }) }],
  });
  if (!comprobante) return null;
  return { url: enlaceArchivoPrivado(comprobante.public_id, comprobante.formato, SEGUNDOS_ENLACE), vence_en_segundos: SEGUNDOS_ENLACE };
}

async function comprobanteParaRevisar(nota_pedido_id, comprobante_id, t) {
  const pedido = await NotaPedido.findByPk(nota_pedido_id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!pedido) return {};
  const comprobante = await NotaPedidoComprobante.findOne({ where: { id: comprobante_id, nota_pedido_id }, transaction: t, lock: t.LOCK.UPDATE });
  if (comprobante && comprobante.estado !== "pendiente") throw cartError("Este comprobante ya fue revisado. Actualizá la lista.", 409, "COMPROBANTE_REVISADO");
  return { pedido, comprobante };
}

/**
 * Aceptar = registrar el cobro por transferencia y marcar el comprobante, todo junto.
 * El estado "pendiente" del comprobante, leído con lock, evita cobrar dos veces el mismo.
 */
export async function aceptarComprobante(nota_pedido_id, comprobante_id, { usuario_id, monto }) {
  const cents = centavosDeImporte(monto);
  return sequelize.transaction(async (t) => {
    const { pedido, comprobante } = await comprobanteParaRevisar(nota_pedido_id, comprobante_id, t);
    if (!comprobante) return null;
    const { pago, nota } = await cobrarPedidoBloqueado(pedido, { cents, metodo: "transferencia", notaTexto: `Comprobante #${comprobante.id}`, usuario_id }, t);
    await comprobante.update({ estado: "aceptado", pago_id: pago.id, revisado_por: usuario_id, revisado_en: new Date(), motivo_rechazo: null }, { transaction: t });
    return nota;
  });
}

export async function rechazarComprobante(nota_pedido_id, comprobante_id, { usuario_id, motivo }) {
  if (typeof motivo !== "string" || motivo.trim().length < 3 || motivo.length > 500) throw cartError("Indicá el motivo del rechazo (3 a 500 caracteres). Lo va a leer el cliente.");
  const resultado = await sequelize.transaction(async (t) => {
    const { comprobante } = await comprobanteParaRevisar(nota_pedido_id, comprobante_id, t);
    if (!comprobante) return null;
    return comprobante.update({ estado: "rechazado", revisado_por: usuario_id, revisado_en: new Date(), motivo_rechazo: motivo.trim() }, { transaction: t });
  });
  if (resultado) avisarComprobanteRechazado(Number(nota_pedido_id), motivo.trim());
  return resultado;
}
