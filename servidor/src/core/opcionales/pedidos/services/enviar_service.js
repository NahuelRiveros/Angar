import { randomBytes } from "node:crypto";
import { UniqueConstraintError } from "sequelize";
import { sequelize } from "../../../database/sequelize.js";
import { ErrorApp, noExiste } from "../../../services/common/errores.js";
import { paginar } from "../../../services/common/listados.js";
import { CatProducto, CatVariante } from "../../catalogo/modelos.js";
import { categoriasVisibles } from "../../catalogo/services/categorias_service.js";
import { PedHistorial, PedItem, PedPedido } from "../modelos.js";
import { armarLineas } from "../reglas.js";

// Lo que hace la persona que compra: enviar, seguir y ver sus pedidos. El panel está en panel_service.js.
const ITEMS = { model: PedItem, as: "items", separate: true, order: [["orden", "ASC"], ["id", "ASC"]], attributes: ["pedido_id", "producto_nombre", "variante_nombre", "precio", "cantidad", "subtotal"] };

/** Las variantes pedidas, con lo necesario para venderlas. Vendible = se ve en la web, disponible y con precio. */
async function variantesPedidas(ids, transaction) {
  const visibles = new Set((await categoriasVisibles()).map((c) => c.id));
  const filas = await CatVariante.findAll({
    where: { id: ids }, transaction,
    include: [{ model: CatProducto, as: "producto", attributes: ["nombre", "activo", "eliminado_en", "categoria_id"] }],
  });
  return new Map(filas.map((v) => [v.id, {
    nombre: v.nombre, codigo: v.codigo, precio: v.precio, producto: v.producto.nombre,
    vendible: !v.eliminado_en && v.disponible && v.precio !== null && v.producto.activo && !v.producto.eliminado_en && visibles.has(v.producto.categoria_id),
  }]));
}

const enviado = (pedido) => ({ numero: pedido.id, clave: pedido.clave, total: pedido.total });

/** MPE-02 a MPE-06: crea el pedido con precios de la base. Un reintento con la misma `clave_envio` devuelve el mismo. */
export async function enviarPedido({ items, clave_envio, ...cliente }, usuario_id = null) {
  const previo = await PedPedido.findOne({ where: { clave_envio } });
  if (previo) return enviado(previo);
  try {
    const pedido = await sequelize.transaction(async (transaction) => {
      const { cambios, lineas, total } = armarLineas(items, await variantesPedidas(items.map((i) => i.variante_id), transaction));
      if (cambios.length) throw new ErrorApp("CARRITO_CAMBIO", "Algunos productos cambiaron desde que los agregaste. Revisá tu carrito y volvé a enviar.", 409, { cambios });
      const nuevo = await PedPedido.create({ ...cliente, clave_envio, usuario_id, total, clave: randomBytes(18).toString("base64url") }, { transaction });
      await PedItem.bulkCreate(lineas.map((linea) => ({ ...linea, pedido_id: nuevo.id })), { transaction });
      await PedHistorial.create({ pedido_id: nuevo.id, de: null, a: "recibido", usuario_id }, { transaction });
      return nuevo;
    });
    return enviado(pedido);
  } catch (error) {
    // MPE-04: dos envíos iguales al mismo tiempo; el segundo choca con el único y devuelve el primero.
    if (error instanceof UniqueConstraintError) {
      const ganador = await PedPedido.findOne({ where: { clave_envio } });
      if (ganador) return enviado(ganador);
    }
    throw error;
  }
}

/** MPE-09: lo que ve quien tiene el link. Sin celular, dirección ni motivos internos. */
export async function seguirPedido(clave) {
  const pedido = await PedPedido.findOne({
    where: { clave }, attributes: ["id", "clave", "estado", "nombre", "entrega", "total", "creado_en"],
    include: [ITEMS, { model: PedHistorial, as: "historial", separate: true, attributes: ["pedido_id", "a", "creado_en"], order: [["id", "ASC"]] }],
  });
  if (!pedido) throw noExiste("No encontramos ese pedido. Revisá el link.");
  const { id, nombre, historial, items, ...datos } = pedido.get({ plain: true });
  return {
    ...datos, numero: id, nombre: nombre.split(/\s+/)[0],
    items: items.map(({ pedido_id: _p, ...item }) => item),
    historial: historial.map((h) => ({ estado: h.a, creado_en: h.creado_en })),
  };
}

/** MPE-06: los pedidos que hizo quien ingresó. */
export async function misPedidos(usuario_id, { page }) {
  const pagina = await paginar(PedPedido, {
    where: { usuario_id }, attributes: ["id", "clave", "estado", "total", "entrega", "creado_en"],
    include: [ITEMS], order: [["id", "DESC"]],
  }, { page, limit: 10 });
  return {
    ...pagina,
    items: pagina.items.map((p) => {
      const { id, items, ...datos } = p.get({ plain: true });
      return { ...datos, numero: id, unidades: items.reduce((suma, i) => suma + i.cantidad, 0), resumen: items.slice(0, 3).map((i) => i.producto_nombre) };
    }),
  };
}
