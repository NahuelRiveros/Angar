import { CarritoDistribuidora, CarritoDistribuidoraItem, ProductoDistribuidora, VariedadDistribuidora, CategoriaDistribuidora } from "../../models/index.js";
import { withCart, idempotent } from "./cart_transaction.js";
import { cartError, validQuantity } from "../common/cart_rules.js";
import { clientConfig } from "../../../../client_config.js";
import { listaDeUsuario, preciosDeLista } from "./listas_precio_service.js";
export async function obtenerOCrearCarrito(usuario_id) {
  const [cart] = await CarritoDistribuidora.findOrCreate({ where: { usuario_id }, defaults: { usuario_id } });
  return cart;
}
/**
 * Qué mostrar tachado en el carrito: el precio anterior si es oferta, o la General
 * si su lista de zona la cobra más barata. Nunca se muestra cuando la zona paga más.
 */
function referenciaDescuento(variedad, deLista) {
  if (!variedad) return { precio_referencia: null, descuento: null };
  const precio = Number(deLista?.precio ?? variedad.precio);
  const anterior = deLista ? deLista.precio_anterior : (variedad.precio_anterior == null ? null : Number(variedad.precio_anterior));
  if (anterior != null && anterior > precio) return { precio_referencia: anterior, descuento: "oferta" };
  if (deLista && Number(variedad.precio) > precio) return { precio_referencia: Number(variedad.precio), descuento: "zona" };
  return { precio_referencia: null, descuento: null };
}
// Precio vigente de cada presentación para el dueño del carrito: el de su lista
// regional si tiene, si no la General. Lo usan el carrito y el pedido (mismo valor).
async function preciosDelCarrito(carrito_id, variedadIds, transaction) {
  const cart = await CarritoDistribuidora.findByPk(carrito_id, { attributes: ["usuario_id"], transaction });
  const lista = await listaDeUsuario(cart?.usuario_id, transaction);
  return { lista, precios: await preciosDeLista(lista?.id, variedadIds, transaction) };
}
export async function listarItemsCarrito(carrito_id, transaction) {
  const rows = await CarritoDistribuidoraItem.findAll({
    where: { carrito_id }, transaction,
    include: [
      { model: ProductoDistribuidora, as: "producto", required: false, include: [{ model: CategoriaDistribuidora, as: "categoria", attributes: ["nombre"] }] },
      { model: VariedadDistribuidora, as: "variedad", required: false },
    ], order: [["fecha_alta", "ASC"]],
  });
  const { precios } = await preciosDelCarrito(carrito_id, rows.map((r) => r.variedad_id).filter(Boolean), transaction);
  return rows.map((item) => ({
    ...referenciaDescuento(item.variedad, precios.get(item.variedad_id)),
    item_id: item.id, producto_id: item.producto_id, variedad_id: item.variedad_id,
    nombre: item.producto?.nombre ?? "Producto no disponible", categoria: item.producto?.categoria?.nombre ?? null,
    imagen: item.producto?.imagen_url ?? null, variante: item.variedad?.nombre ?? null,
    variante_disponible: !!item.variedad && !item.variedad.fecha_baja,
    precio: Number(precios.get(item.variedad_id)?.precio ?? item.variedad?.precio ?? item.precio_unidad), precio_al_agregar: Number(item.precio_unidad),
    stock_disponible: item.variedad?.controla_stock ? item.variedad.cantidad : null,
    iva_porcentaje: item.variedad ? Number(item.variedad.iva_porcentaje) : null,
    cantidad: item.cantidad, activo: !!item.producto?.activo && !item.producto.fecha_baja,
  }));
}
export async function obtenerCarrito(usuario_id) { const cart = await obtenerOCrearCarrito(usuario_id); return listarItemsCarrito(cart.id); }
async function addToCart(cart, payload, t) {
  const { producto_id, variedad_id, cantidad } = payload;
  validQuantity(cantidad);
  const product = await ProductoDistribuidora.findOne({ where: { id: producto_id, activo: true, fecha_baja: null }, transaction: t });
  if (!product) throw cartError("Producto no disponible", 404);
  const variants = await VariedadDistribuidora.findAll({ where: { producto_id, fecha_baja: null, ...(variedad_id ? { id: variedad_id } : {}) }, transaction: t });
  if (variants.length !== 1) throw cartError("Elegí una presentación disponible");
  const variant = variants[0];
  const { precios } = await preciosDelCarrito(cart.id, [variant.id], t);
  const precio = precios.get(variant.id)?.precio ?? variant.precio;
  const existing = await CarritoDistribuidoraItem.findOne({ where: { carrito_id: cart.id, variedad_id: variant.id }, transaction: t });
  const quantity = validQuantity((existing?.cantidad ?? 0) + cantidad, variant.controla_stock ? variant.cantidad : null);
  if (existing) await existing.update({ cantidad: quantity, precio_unidad: precio }, { transaction: t });
  else {
    const count = await CarritoDistribuidoraItem.count({ where: { carrito_id: cart.id }, transaction: t });
    if (count >= clientConfig.distribuidora.maxCartLines) throw cartError("Alcanzaste el máximo de productos por pedido.");
    await CarritoDistribuidoraItem.create({ carrito_id: cart.id, producto_id, variedad_id: variant.id, cantidad: quantity, precio_unidad: precio, fecha_alta: new Date() }, { transaction: t });
  }
  await cart.update({ fecha_mod: new Date() }, { transaction: t });
}
/**
 * Vuelve a cargar las líneas de un pedido cancelado en el carrito ya bloqueado.
 * Ajusta cada cantidad a lo disponible hoy; lo que no entra (o entra en parte)
 * se devuelve para avisarle al comprador, en vez de abortar toda la reposición.
 */
export async function reponerEnCarrito(cart, lineas, t) {
  const omitidos = [];
  for (const { producto_id, variedad_id, cantidad, nombre } of lineas) {
    const variant = producto_id && variedad_id
      ? await VariedadDistribuidora.findOne({ where: { id: variedad_id, producto_id, fecha_baja: null }, transaction: t })
      : null;
    const enCarrito = variant ? (await CarritoDistribuidoraItem.findOne({ where: { carrito_id: cart.id, variedad_id }, transaction: t }))?.cantidad ?? 0 : 0;
    const libre = !variant ? 0 : variant.controla_stock ? variant.cantidad - enCarrito : cantidad;
    const aCargar = Math.min(cantidad, libre);
    if (aCargar >= 1) {
      try {
        await addToCart(cart, { producto_id, variedad_id, cantidad: aCargar }, t);
      } catch (error) {
        if (!error.status) throw error;
        omitidos.push({ nombre, pedido: cantidad, cargado: 0 });
        continue;
      }
    }
    if (aCargar < cantidad) omitidos.push({ nombre, pedido: cantidad, cargado: Math.max(0, aCargar) });
  }
  return omitidos;
}
export async function agregarItem(usuario_id, payload) {
  return withCart(usuario_id, async (cart, t) => { await addToCart(cart, payload, t); return listarItemsCarrito(cart.id, t); });
}
export async function fusionarCarrito(usuario_id, { key, items }) {
  if (!clientConfig.distribuidora.guestCart || !Array.isArray(items) || items.length > clientConfig.distribuidora.maxCartLines) throw cartError("Carrito de visitante inválido");
  return withCart(usuario_id, async (cart, t) => {
    await idempotent(usuario_id, "merge:" + key, items, t, async () => {
      for (const item of items) await addToCart(cart, item, t);
      return { ok: true };
    });
    return listarItemsCarrito(cart.id, t);
  });
}
export async function actualizarCantidad(usuario_id, item_id, cantidad) {
  return withCart(usuario_id, async (cart, t) => {
    const item = await CarritoDistribuidoraItem.findOne({ where: { id: item_id, carrito_id: cart.id }, transaction: t });
    if (!item) throw cartError("Producto no encontrado en tu carrito", 404);
    const variant = await VariedadDistribuidora.findOne({ where: { id: item.variedad_id, fecha_baja: null }, transaction: t });
    if (!variant) throw cartError("La presentación ya no está disponible", 409);
    validQuantity(cantidad, variant.controla_stock ? variant.cantidad : null);
    await item.update({ cantidad }, { transaction: t });
    return listarItemsCarrito(cart.id, t);
  });
}
export async function eliminarItem(usuario_id, item_id) {
  return withCart(usuario_id, async (cart, t) => {
    await CarritoDistribuidoraItem.destroy({ where: { id: item_id, carrito_id: cart.id }, transaction: t });
    return listarItemsCarrito(cart.id, t);
  });
}
export async function vaciarCarrito(usuario_id) {
  return withCart(usuario_id, async (cart, t) => { await CarritoDistribuidoraItem.destroy({ where: { carrito_id: cart.id }, transaction: t }); });
}
