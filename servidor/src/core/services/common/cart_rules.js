import { createHash } from "node:crypto";
import { clientConfig } from "../../../../../proyecto/client_config.js";
export const cartError = (message, status = 400, codigo = "CARRITO_INVALIDO") => Object.assign(new Error(message), { status, codigo });
export function validQuantity(value, stock = null) {
  if (!Number.isInteger(value) || value < 1 || value > clientConfig.tienda.maxQuantity) throw cartError("Ingresá una cantidad entera dentro del límite permitido.");
  if (stock != null && value > stock) throw cartError(`Solo quedan ${stock} unidades disponibles.`, 409, "STOCK_INSUFICIENTE");
  return value;
}
export function fingerprint(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
export function validateSnapshot(items, expected) {
  if (!Array.isArray(expected) || expected.length !== items.length) throw cartError("El carrito cambió. Revisá el pedido antes de enviarlo.", 409, "CARRITO_CAMBIO");
  for (const item of items) {
    const previous = expected.find((i) => String(i.item_id) === String(item.item_id));
    if (!previous || previous.cantidad !== item.cantidad || Number(previous.precio) !== Number(item.precio))
      throw cartError("Cambió el precio o la cantidad. Revisá el pedido y volvé a confirmar.", 409, "CARRITO_CAMBIO");
  }
}
