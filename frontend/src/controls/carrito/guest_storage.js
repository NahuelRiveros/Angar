export function readGuestCart(storage, key, ttlDays = 30) {
  try {
    const value = JSON.parse(storage.getItem(key));
    if (!value || !Array.isArray(value.items) || !value.key || !Number.isFinite(value.updatedAt) || Date.now() - value.updatedAt > ttlDays * 86400000) return null;
    const items = value.items.filter((i) => Number.isInteger(i.producto_id) && Number.isInteger(i.variedad_id) && Number.isInteger(i.cantidad) && i.cantidad > 0);
    return { ...value, items };
  } catch { return null; }
}
export function guestItem(product, variety, quantity) {
  return {
    item_id: "guest:" + variety.id, producto_id: product.id, variedad_id: variety.id,
    nombre: product.nombre, variante: variety.nombre, imagen: product.imagen_url,
    categoria: product.categoria?.nombre, precio: Number(variety.precio), precio_al_agregar: Number(variety.precio),
    // Visitante: solo la oferta General (el precio de zona llega al iniciar sesión).
    ...(Number(variety.precio_anterior) > Number(variety.precio) ? { precio_referencia: Number(variety.precio_anterior), descuento: "oferta" } : {}),
    stock_disponible: variety.controla_stock ? variety.cantidad : null, cantidad: quantity,
    activo: true, variante_disponible: true,
  };
}
export function mergeGuestItems(items, next, maxQuantity, maxLines) {
  const old = items.find((i) => i.variedad_id === next.variedad_id);
  const quantity = (old?.cantidad ?? 0) + next.cantidad;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity || next.stock_disponible != null && quantity > next.stock_disponible) throw new Error("La cantidad supera la disponibilidad o el máximo permitido.");
  if (!old && items.length >= maxLines) throw new Error("Alcanzaste el máximo de productos por pedido.");
  // Si ya existía la línea, conservamos su item_id real (para un usuario
  // logueado es el id numérico del servidor) — solo una línea nueva usa el
  // id provisorio "guest:variedad_id" de `next`.
  const item = { ...next, item_id: old?.item_id ?? next.item_id, cantidad: quantity };
  return old ? items.map((i) => i.variedad_id === next.variedad_id ? item : i) : [...items, item];
}
