import { orderConfig, transitionProblem } from "../../../../order_config.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";
import { NotaPedidoEstadoLog } from "../../models/index.js";
import { Op } from "sequelize";
import { withCart, idempotent } from "./cart_transaction.js";
import { cartError, validQuantity, validateSnapshot } from "../common/cart_rules.js";
import { CarritoDistribuidoraItem, VariedadDistribuidora, ProductoDistribuidora } from "../../models/index.js";
import { sequelize } from "../../database/sequelize.js";
import { NotaPedido, NotaPedidoItem, NotaPedidoPago, Persona, Usuario } from "../../models/index.js";
import { listarItemsCarrito, reponerEnCarrito } from "./carrito_distribuidora_service.js";
import { obtenerPerfil, perfilCompleto } from "./perfil_cliente_service.js";
import { listaDeUsuario } from "./listas_precio_service.js";
import { avisarPedidoNuevo, avisarCambioEstado, avisarCancelacionCliente } from "./avisos_pedido_service.js";

const ESTADOS_QUE_REQUIEREN_PAGO = orderConfig.paymentRequiredStates;
const nombreItem = (item) => item.nombre_producto + (item.variedad_nombre ? " (" + item.variedad_nombre + ")" : "");

// Consultas separadas por asociación evitan multiplicar items × cobros × historial.
// Se cargan en lote para toda la página, sin una consulta por pedido.
const INCLUDE_PAGOS = {
  model: NotaPedidoPago,
  as: "pagos", separate: true, order: [["registrado_en", "ASC"], ["id", "ASC"]],
  include: [
    { model: Usuario, as: "registrado_por_usuario", attributes: ["id"], include: [{ model: Persona, as: "persona", attributes: ["nombre", "apellido"] }] },
    { model: Usuario, as: "anulado_por_usuario", attributes: ["id"], include: [{ model: Persona, as: "persona", attributes: ["nombre", "apellido"] }] },
  ],
};

/**
 * Recalcula estado_pago/monto_pagado de un NotaPedido a partir de la suma de
 * sus pagos activos (anulado_en IS NULL) — se llama siempre dentro de la
 * misma transacción que crea o anula un pago, nunca se escriben esos campos
 * a mano desde otro lado.
 */
async function recomputarEstadoPago(nota_pedido_id, t) {
  const nota = await NotaPedido.findByPk(nota_pedido_id, { transaction: t, lock: t.LOCK.UPDATE });
  const pagosActivos = await NotaPedidoPago.findAll({
    where: { nota_pedido_id, anulado_en: null },
    transaction: t,
  });
  const monto_pagado = pagosActivos.reduce((s, p) => s + Math.round(Number(p.monto) * 100), 0) / 100;
  const estado_pago = monto_pagado <= 0 ? "pendiente" : monto_pagado >= Number(nota.total) ? "pagado" : "parcial";
  await nota.update({ monto_pagado, estado_pago, fecha_mod: new Date() }, { transaction: t });
  return nota;
}

/**
 * Snapshotea el CarritoDistribuidora actual del usuario a un NotaPedido +
 * NotaPedidoItem (inmutable) y vacía el carrito. Sin pago online — queda
 * "pendiente" hasta que un empleado la procese por fuera del sistema.
 *
 * Exige que el cliente ya tenga PerfilClienteDistribuidora completo (cuit +
 * dirección) — si no, tira PERFIL_INCOMPLETO para que el frontend le pida
 * completarlo antes de reintentar (no se pide en el registro, ver
 * perfil_cliente_service.js).
 */
export async function crearNotaPedido(usuario_id, { notas = null, expectedItems, key } = {}) {
  if (notas != null && (typeof notas !== "string" || notas.length > 2000)) throw cartError("Las notas pueden tener hasta 2000 caracteres.");
  // Solo la ejecución que crea la nota avisa; un reintento con la misma clave no repite mails.
  let creada = null;
  const resultado = await withCart(usuario_id, async (carrito, t) => idempotent(usuario_id, "order:" + key, { notas, expectedItems }, t, async () => {
    const perfil = await obtenerPerfil(usuario_id);
    if (!perfilCompleto(perfil)) throw cartError("Completá tus datos (nombre, apellido, celular y entrega) antes de enviar el pedido.", 400, "PERFIL_INCOMPLETO");
    // Bloquear precios y disponibilidad hasta completar el snapshot. El pedido no reserva stock.
    const raw = await CarritoDistribuidoraItem.findAll({ where: { carrito_id: carrito.id }, transaction: t });
    const productIds = [...new Set(raw.map((i) => i.producto_id))].sort((a,b) => a-b);
    const variantIds = [...new Set(raw.map((i) => i.variedad_id).filter(Boolean))].sort((a,b) => a-b);
    // Bloqueo por lote (un solo SELECT ... FOR UPDATE con IN) en vez de un
    // findByPk por id — un pedido de 20 líneas antes eran 20 round-trips.
    if (productIds.length) await ProductoDistribuidora.findAll({ where: { id: { [Op.in]: productIds } }, transaction: t, lock: t.LOCK.UPDATE, order: [["id", "ASC"]] });
    if (variantIds.length) await VariedadDistribuidora.findAll({ where: { id: { [Op.in]: variantIds } }, transaction: t, lock: t.LOCK.UPDATE, order: [["id", "ASC"]] });
    const items = await listarItemsCarrito(carrito.id, t);
    if (!items.length) throw cartError("El carrito está vacío.");
    for (const item of items) {
      if (!item.activo || !item.variante_disponible) throw cartError("Hay productos no disponibles. Revisá tu carrito.", 409);
      validQuantity(item.cantidad, item.stock_disponible);
    }
    validateSnapshot(items, expectedItems);
    const total = items.reduce((sum, i) => sum + Math.round(i.precio * 100) * i.cantidad, 0) / 100;
    // Los precios de items ya salen de esta lista (listarItemsCarrito); se guarda cuál fue.
    const lista = await listaDeUsuario(usuario_id, t);
    const nota = await NotaPedido.create({
      usuario_id, estado: "pendiente", estado_pago: "pendiente", monto_pagado: 0, notas, total,
      cuit: perfil.cuit, razon_social: perfil.razon_social, condicion_iva: perfil.condicion_iva,
      direccion: perfil.direccion, provincia: perfil.provincia, departamento: perfil.departamento,
      localidad: perfil.localidad, codigo_postal: perfil.codigo_postal,
      lista_precio_id: lista?.id ?? null, lista_precio_nombre: lista?.nombre ?? null,
      fecha_alta: new Date(), fecha_mod: new Date(),
    }, { transaction: t });
    await NotaPedidoEstadoLog.create({ nota_pedido_id: nota.id, usuario_id, anterior: null, nuevo: "pendiente", motivo: "Nota enviada por el cliente" }, { transaction: t });
    await NotaPedidoItem.bulkCreate(items.map((i) => ({
      nota_pedido_id: nota.id, producto_id: i.producto_id, variedad_id: i.variedad_id,
      nombre_producto: i.nombre, variedad_nombre: i.variante, precio_unitario: i.precio,
      cantidad: i.cantidad, subtotal: Math.round(i.precio * 100) * i.cantidad / 100,
    })), { transaction: t });
    await CarritoDistribuidoraItem.destroy({ where: { carrito_id: carrito.id }, transaction: t });
    creada = nota.id;
    return nota;
  }));
  if (creada) avisarPedidoNuevo(creada);
  return resultado;
}

export async function listarPropias(usuario_id) {
  return NotaPedido.findAll({
    where: { usuario_id },
    order: [["fecha_alta", "DESC"]],
    include: [{ model: NotaPedidoItem, as: "items" }, INCLUDE_PAGOS],
  });
}

export async function listarTodas({ q, estado, estado_pago, pagina, por_pagina } = {}) {
  const where = {};
  if (estado && orderConfig.states[estado]) where.estado = estado;
  if (["pendiente", "parcial", "pagado"].includes(estado_pago)) where.estado_pago = estado_pago;
  if (q) {
    const text = "%" + String(q).trim().slice(0, 100) + "%";
    const people = await Persona.findAll({ where: { [Op.or]: [{ nombre: { [Op.iLike]: text } }, { apellido: { [Op.iLike]: text } }, { email: { [Op.iLike]: text } }] }, attributes: ["id"], raw: true });
    const users = people.length ? await Usuario.findAll({ where: { persona_id: { [Op.in]: people.map((p) => p.id) } }, attributes: ["id"], raw: true }) : [];
    where[Op.or] = [{ usuario_id: { [Op.in]: users.map((u) => u.id) } }, ...(/^#?\d+$/.test(q) ? [{ id: Number(String(q).replace("#", "")) }] : [])];
  }
  const { page, limit, offset } = normalizarPaginacion({ page: pagina, limit: por_pagina, defaultLimit: 20, maxLimit: 50 });
  const result = await NotaPedido.findAndCountAll({
    where, limit, offset, distinct: true, order: [["fecha_alta", "DESC"], ["id", "DESC"]],
    include: [
      { model: NotaPedidoItem, as: "items" }, INCLUDE_PAGOS,
      { model: NotaPedidoEstadoLog, as: "historial_estados", separate: true, order: [["fecha", "ASC"], ["id", "ASC"]], include: [{ model: Usuario, as: "autor", attributes: ["id"], include: [{ model: Persona, as: "persona", attributes: ["nombre", "apellido"] }] }] },
      { model: Usuario, as: "usuario", attributes: ["id"], include: [{ model: Persona, as: "persona", attributes: ["nombre", "apellido", "email", "celular"] }] },
    ],
  });
  return { data: result.rows, ...armarPaginacion({ page, limit, total: result.count }) };
}

/** Detalle completo de un pedido para el export a Excel. */
export async function obtenerDetalle(id) {
  return NotaPedido.findByPk(id, {
    include: [
      { model: NotaPedidoItem, as: "items" },
      {
        model: Usuario, as: "usuario", attributes: ["id"],
        include: [{ model: Persona, as: "persona", attributes: ["nombre", "apellido", "email", "celular"] }],
      },
    ],
  });
}

/**
 * Resta (sentido -1) o devuelve (+1) las cantidades del pedido en las presentaciones
 * que controlan stock. Bloquea las variedades en orden de id, como el envío del pedido,
 * para que dos confirmaciones simultáneas no dejen el stock negativo.
 */
async function moverStock(nota, sentido, t) {
  const items = await NotaPedidoItem.findAll({ where: { nota_pedido_id: nota.id }, transaction: t });
  const porVariedad = new Map();
  for (const item of items) {
    if (!item.variedad_id) continue;
    const previo = porVariedad.get(item.variedad_id);
    porVariedad.set(item.variedad_id, {
      cantidad: (previo?.cantidad ?? 0) + item.cantidad,
      nombre: nombreItem(item),
    });
  }
  if (!porVariedad.size) return;
  const variedades = await VariedadDistribuidora.findAll({
    where: { id: { [Op.in]: [...porVariedad.keys()] }, controla_stock: true },
    transaction: t, lock: t.LOCK.UPDATE, order: [["id", "ASC"]],
  });
  if (sentido < 0) {
    const faltantes = variedades.filter((v) => v.cantidad < porVariedad.get(v.id).cantidad)
      .map((v) => `${porVariedad.get(v.id).nombre}: hay ${v.cantidad}, el pedido lleva ${porVariedad.get(v.id).cantidad}`);
    if (faltantes.length) throw cartError("No hay stock suficiente para confirmar. " + faltantes.join("; ") + ".", 409, "STOCK_INSUFICIENTE");
  }
  for (const variedad of variedades) {
    await variedad.increment("cantidad", { by: sentido * porVariedad.get(variedad.id).cantidad, transaction: t });
  }
}

// Solo entrar o salir del grupo de estados con stock lo mueve: pasar de "en preparación"
// a "entregado" no vuelve a descontar, y un pedido viejo sin descuento no devuelve nada.
async function ajustarStockPorEstado(nota, estado, t) {
  const antes = orderConfig.stockStates.includes(nota.estado);
  const despues = orderConfig.stockStates.includes(estado);
  if (!antes && despues) { await moverStock(nota, -1, t); return true; }
  if (antes && !despues && nota.stock_descontado) { await moverStock(nota, 1, t); return false; }
  return nota.stock_descontado;
}

export async function cambiarEstado(id, estado, { usuario_id, motivo = null, expectedState } = {}) {
  if (motivo != null && (typeof motivo !== "string" || motivo.length > 500)) throw cartError("El motivo puede tener hasta 500 caracteres.");
  let cambio = false;
  const resultado = await sequelize.transaction(async (t) => {
    const nota = await NotaPedido.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!nota) return null;
    if (nota.estado === estado) return nota;
    if (expectedState !== nota.estado) throw cartError("Otro operador actualizó este pedido. Actualizá la lista.", 409);
    const problem = transitionProblem(nota.estado, estado, motivo, nota.estado_pago);
    if (problem) throw cartError(problem, 409);
    const stock_descontado = await ajustarStockPorEstado(nota, estado, t);
    await NotaPedidoEstadoLog.create({ nota_pedido_id: nota.id, usuario_id, anterior: nota.estado, nuevo: estado, motivo: motivo?.trim() || null }, { transaction: t });
    await nota.update({ estado, stock_descontado, fecha_mod: new Date() }, { transaction: t });
    cambio = true;
    return nota;
  });
  if (cambio) avisarCambioEstado(resultado.id, { nuevo: estado, motivo: motivo?.trim() || null });
  return resultado;
}

/**
 * El comprador cancela su propio pedido mientras el equipo no lo tomó
 * (orderConfig.buyerCancelableStates). Con volverAlCarrito, sus productos vuelven
 * al carrito al precio de hoy; lo que ya no está disponible se informa en `omitidos`.
 * Toma el lock del carrito: un doble clic encuentra el pedido ya cancelado y no
 * repone dos veces.
 */
export async function cancelarPropia(usuario_id, id, { motivo, volverAlCarrito = false } = {}) {
  if (typeof motivo !== "string" || motivo.trim().length < 3 || motivo.length > 500) throw cartError("Contanos el motivo de la cancelación (3 a 500 caracteres).");
  const resultado = await withCart(usuario_id, async (carrito, t) => {
    const nota = await NotaPedido.findOne({ where: { id, usuario_id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!nota) return null;
    if (nota.estado === "cancelada") throw cartError("El pedido ya está cancelado.", 409, "PEDIDO_CANCELADO");
    if (!orderConfig.buyerCancelableStates.includes(nota.estado)) throw cartError("Tu pedido ya está en proceso. Para cancelarlo, comunicate con nosotros.", 409, "PEDIDO_EN_PROCESO");
    const stock_descontado = await ajustarStockPorEstado(nota, "cancelada", t);
    await NotaPedidoEstadoLog.create({ nota_pedido_id: nota.id, usuario_id, anterior: nota.estado, nuevo: "cancelada", motivo: "Cancelado por el cliente: " + motivo.trim() }, { transaction: t });
    await nota.update({ estado: "cancelada", stock_descontado, fecha_mod: new Date() }, { transaction: t });
    if (!volverAlCarrito) return { nota, omitidos: [] };
    const items = await NotaPedidoItem.findAll({ where: { nota_pedido_id: nota.id }, order: [["id", "ASC"]], transaction: t });
    const omitidos = await reponerEnCarrito(carrito, items.map((i) => ({
      producto_id: i.producto_id, variedad_id: i.variedad_id, cantidad: i.cantidad,
      nombre: nombreItem(i),
    })), t);
    return { nota, omitidos };
  });
  if (resultado) avisarCancelacionCliente(resultado.nota.id, motivo.trim());
  return resultado;
}

// Registro de dinero YA recibido fuera de la web; no ejecuta un cobro.
export async function registrarPago(nota_pedido_id, { monto, nota: notaTexto = null, usuario_id, metodo, key }) {
  const amount = Number(monto);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - cents) > 0.00001) throw cartError("Ingresá un importe positivo con hasta dos decimales.");
  if (!orderConfig.paymentMethods.some((m) => m.value === metodo)) throw cartError("Elegí cómo se recibió el cobro.");
  if (notaTexto != null && (typeof notaTexto !== "string" || notaTexto.length > 255)) throw cartError("La referencia puede tener hasta 255 caracteres.");
  return sequelize.transaction(async (t) => {
    const pedido = await NotaPedido.findByPk(nota_pedido_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!pedido) return null;
    return idempotent(usuario_id, "payment:" + key, { nota_pedido_id: String(nota_pedido_id), cents, notaTexto, metodo }, t, async () => {
      if (pedido.estado === "cancelada") throw cartError("Reabrí el pedido antes de registrar un nuevo cobro.", 409);
      const saldo = Math.round(Number(pedido.total) * 100) - Math.round(Number(pedido.monto_pagado) * 100);
      if (cents > saldo) throw cartError("El importe supera el saldo pendiente. Actualizá el pedido.", 409);
      await NotaPedidoPago.create({ nota_pedido_id, monto: cents / 100, nota: notaTexto, metodo, registrado_por: usuario_id, registrado_en: new Date() }, { transaction: t });
      return recomputarEstadoPago(nota_pedido_id, t);
    });
  });
}

export async function anularPago(pago_id, usuario_id, { pedidoId, motivo } = {}) {
  if (typeof motivo !== "string" || motivo.trim().length < 3 || motivo.length > 500) throw cartError("Indicá el motivo de la anulación (3 a 500 caracteres).");
  return sequelize.transaction(async (t) => {
    const pedido = await NotaPedido.findByPk(pedidoId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!pedido) return null;
    const pago = await NotaPedidoPago.findOne({ where: { id: pago_id, nota_pedido_id: pedidoId }, transaction: t });
    if (!pago) return null;
    if (pago.anulado_en) return pago;
    const restante = Math.round(Number(pedido.monto_pagado) * 100) - Math.round(Number(pago.monto) * 100);
    if (restante <= 0 && ESTADOS_QUE_REQUIEREN_PAGO.includes(pedido.estado)) throw cartError("Revertí primero el estado del pedido.", 409);
    await pago.update({ anulado_por: usuario_id, anulado_en: new Date(), anulacion_motivo: motivo.trim() }, { transaction: t });
    await recomputarEstadoPago(pedidoId, t);
    return pago;
  });
}
