import { Op, QueryTypes, fn, col } from "sequelize";
import { sequelize } from "../../../database/sequelize.js";
import { ErrorApp, noExiste } from "../../../services/common/errores.js";
import { CON_ACENTO, SIN_ACENTO, patronBusqueda } from "../../../services/common/listados.js";
import { armarPaginacion, normalizarPaginacion } from "../../../services/common/pagination.js";
import { CatVariante } from "../../catalogo/modelos.js";
import { cacheCatalogo } from "../../catalogo/services/cache.js";
import { StkExistencia, StkMovimiento } from "../modelos.js";
import { efectoDelPedido, estadoStock, variacion } from "../reglas.js";

// Stock por variante (MST-01 a MST-07). Spec: docs/specs/core/stock.md.
const POR_PAGINA = 30;
const NO_CONTROLA = "Esa opción no controla stock.";

/**
 * MST-06: lo que ve la web sale de la cantidad. Se escribe en el "disponible" del catálogo, así la web,
 * sus filtros y pedidos no necesitan saber de stock. La caché se vacía recién cuando se guardó.
 */
async function reflejarEnCatalogo(variante_id, saldo, transaction) {
  await CatVariante.update({ disponible: saldo > 0 }, { where: { id: variante_id }, transaction });
  transaction.afterCommit(() => cacheCatalogo.vaciar());
}

/** El único lugar que cambia una cantidad (MST-02). La fila ya tiene que estar bloqueada. */
async function registrar(existencia, { tipo, delta, saldo, motivo = null, pedido_id = null, usuario_id = null }, transaction) {
  await existencia.update({ cantidad: saldo, actualizado_en: new Date() }, { transaction });
  await StkMovimiento.create({ variante_id: existencia.variante_id, tipo, cantidad: delta, saldo, motivo, pedido_id, usuario_id }, { transaction });
  await reflejarEnCatalogo(existencia.variante_id, saldo, transaction);
}

const bloquear = (variante_ids, transaction) => StkExistencia.findAll({
  // En orden: dos operaciones sobre las mismas variantes se esperan en vez de trabarse entre sí.
  where: { variante_id: variante_ids }, order: [["variante_id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE,
});

async function existenciaDe(variante_id, transaction) {
  const [existencia] = await bloquear([variante_id], transaction);
  if (!existencia) throw noExiste(NO_CONTROLA);
  return existencia;
}

const resumen = (e) => ({ variante_id: e.variante_id, cantidad: e.cantidad, minimo: e.minimo, estado: estadoStock(e) });

/** MST-01: empieza a controlar una variante con lo que hay hoy. */
export async function controlar(variante_id, { cantidad, minimo }, usuario_id) {
  const existencia = await sequelize.transaction(async (transaction) => {
    const variante = await CatVariante.findOne({ where: { id: variante_id, eliminado_en: null }, transaction, lock: transaction.LOCK.UPDATE });
    if (!variante) throw noExiste("Esa opción no existe.");
    if (await StkExistencia.findByPk(variante_id, { transaction })) throw new ErrorApp("DUPLICADO", "Esa opción ya controla stock.", 409);
    const nueva = await StkExistencia.create({ variante_id, cantidad: 0, minimo }, { transaction });
    await registrar(nueva, { tipo: "inicio", delta: cantidad, saldo: cantidad, motivo: "Inicio del control de stock", usuario_id }, transaction);
    return nueva;
  });
  return resumen(existencia);
}

/** Deja de controlar: vuelve a mandar la casilla del catálogo. Los movimientos quedan. */
export async function dejarDeControlar(variante_id) {
  const borradas = await StkExistencia.destroy({ where: { variante_id } });
  if (!borradas) throw noExiste(NO_CONTROLA);
  cacheCatalogo.vaciar();
}

export async function cambiarMinimo(variante_id, { minimo }) {
  const existencia = await sequelize.transaction(async (transaction) => {
    const e = await existenciaDe(variante_id, transaction);
    return e.update({ minimo, actualizado_en: new Date() }, { transaction });
  });
  return resumen(existencia);
}

/** MST-02 y MST-03: entrada, salida o ajuste, con su motivo. Nunca deja la cantidad negativa. */
export async function mover(variante_id, { tipo, cantidad, motivo }, usuario_id) {
  const existencia = await sequelize.transaction(async (transaction) => {
    const e = await existenciaDe(variante_id, transaction);
    const cambio = variacion(tipo, cantidad, e.cantidad);
    if (cambio.error) throw new ErrorApp("STOCK_INSUFICIENTE", cambio.error, 409);
    if (cambio.delta === 0) throw new ErrorApp("SIN_CAMBIOS", `Ya hay ${e.cantidad}: no cambia nada.`, 400);
    await registrar(e, { tipo, ...cambio, motivo, usuario_id }, transaction);
    return e;
  });
  return resumen(existencia);
}

// ── Enganches (MOD-17) ──────────────────────────────────────────────────────
/** Las variantes que controla stock: su "hay stock" sale de la cantidad, no de la casilla. */
export async function disponibilidad(variante_ids, transaction) {
  if (!variante_ids.length) return new Map();
  const filas = await StkExistencia.findAll({ where: { variante_id: variante_ids }, attributes: ["variante_id", "cantidad"], raw: true, transaction });
  return new Map(filas.map((e) => [e.variante_id, { disponible: e.cantidad > 0, por: "stock" }]));
}

/**
 * MST-04 y MST-05: al confirmar se descuenta y al cancelar (o volver a Recibido) se devuelve, una sola
 * vez: se mira lo que ya se movió por ese pedido. Si falta algo, el cambio de estado no se guarda.
 */
export async function alCambiarPedido({ pedido_id, de, a, items, usuario_id }, transaction) {
  const efecto = efectoDelPedido(de, a);
  if (!efecto) return;
  const existencias = await bloquear(items.map((i) => i.variante_id), transaction);
  if (!existencias.length) return;
  const movido = await StkMovimiento.findAll({
    where: { pedido_id, variante_id: existencias.map((e) => e.variante_id), tipo: ["pedido", "devolucion"] },
    attributes: ["variante_id", [fn("SUM", col("cantidad")), "neto"]], group: ["variante_id"], raw: true, transaction,
  });
  const neto = new Map(movido.map((m) => [m.variante_id, Number(m.neto)]));
  const porId = new Map(items.map((i) => [i.variante_id, i]));
  if (efecto === "descontar") {
    const pendientes = existencias.filter((e) => !(neto.get(e.variante_id) < 0));
    const faltan = pendientes.filter((e) => e.cantidad < porId.get(e.variante_id).cantidad);
    if (faltan.length) {
      const detalle = faltan.map((e) => `${porId.get(e.variante_id).nombre}: pide ${porId.get(e.variante_id).cantidad} y hay ${e.cantidad}`).join("; ");
      throw new ErrorApp("STOCK_INSUFICIENTE", `No hay stock suficiente para confirmar. ${detalle}.`, 409, { faltan: faltan.map((e) => ({ variante_id: e.variante_id, pide: porId.get(e.variante_id).cantidad, hay: e.cantidad })) });
    }
    for (const e of pendientes) {
      const delta = -porId.get(e.variante_id).cantidad;
      await registrar(e, { tipo: "pedido", delta, saldo: e.cantidad + delta, motivo: `Pedido #${pedido_id}`, pedido_id, usuario_id }, transaction);
    }
    return;
  }
  for (const e of existencias) {
    const tomado = -(neto.get(e.variante_id) ?? 0);
    if (tomado > 0) await registrar(e, { tipo: "devolucion", delta: tomado, saldo: e.cantidad + tomado, motivo: `Pedido #${pedido_id}`, pedido_id, usuario_id }, transaction);
  }
}

// ── Panel ───────────────────────────────────────────────────────────────────
const SIN_ACENTOS = `lower(translate(p.nombre, '${CON_ACENTO}', '${SIN_ACENTO}'))`;
// SQL fijo por filtro: lo que escribe la persona va siempre como reemplazo.
const POR_ESTADO = {
  controlados: "e.variante_id IS NOT NULL",
  reponer: "e.variante_id IS NOT NULL AND (e.cantidad = 0 OR e.cantidad <= e.minimo)",
  agotado: "e.variante_id IS NOT NULL AND e.cantidad = 0",
  sin_control: "e.variante_id IS NULL",
};

/** MST-06: todas las variantes, con su cantidad si la controlan. Lo agotado y lo bajo, primero. */
export async function listar({ estado, q, page }) {
  const p = normalizarPaginacion({ page, limit: POR_PAGINA, maxLimit: POR_PAGINA });
  const condiciones = ["v.eliminado_en IS NULL", "p.eliminado_en IS NULL", ...(estado ? [POR_ESTADO[estado]] : [])];
  const replacements = { limit: p.limit, offset: p.offset };
  if (q) {
    condiciones.push(`(${SIN_ACENTOS} LIKE :nombre OR v.codigo ILIKE :codigo)`);
    replacements.nombre = patronBusqueda(q.toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""));
    replacements.codigo = patronBusqueda(q);
  }
  const desde = `FROM cat_variante v JOIN cat_producto p ON p.id = v.producto_id LEFT JOIN stk_existencia e ON e.variante_id = v.id WHERE ${condiciones.join(" AND ")}`;
  const [filas, { total }] = await Promise.all([
    sequelize.query(`
      SELECT v.id AS variante_id, p.id AS producto_id, p.nombre AS producto, v.nombre AS opcion, v.codigo, v.disponible,
             (e.variante_id IS NOT NULL) AS controla, e.cantidad, e.minimo
      ${desde}
      ORDER BY CASE WHEN e.cantidad = 0 THEN 0 WHEN e.cantidad <= e.minimo THEN 1 ELSE 2 END, p.nombre, v.orden, v.id
      LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(`SELECT count(*)::int AS total ${desde}`, { replacements, type: QueryTypes.SELECT, plain: true }),
  ]);
  return {
    items: filas.map((f) => ({ ...f, estado: f.controla ? estadoStock(f) : null })),
    paginacion: armarPaginacion({ page: p.page, limit: p.limit, total }),
  };
}

/** MST-02: los movimientos de una variante, del más nuevo al más viejo, con quién los hizo. */
export async function movimientos(variante_id, { page }) {
  const p = normalizarPaginacion({ page, limit: 20, maxLimit: 20 });
  const replacements = { variante_id, limit: p.limit, offset: p.offset };
  const [items, total] = await Promise.all([
    sequelize.query(`
      SELECT m.id, m.tipo, m.cantidad, m.saldo, m.motivo, m.pedido_id, m.creado_en, NULLIF(TRIM(CONCAT(pe.nombre, ' ', pe.apellido)), '') AS persona
      FROM stk_movimiento m
      LEFT JOIN usuario u ON u.id = m.usuario_id
      LEFT JOIN persona pe ON pe.id = u.persona_id
      WHERE m.variante_id = :variante_id
      ORDER BY m.id DESC LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT }),
    StkMovimiento.count({ where: { variante_id: { [Op.eq]: variante_id } } }),
  ]);
  return { items, paginacion: armarPaginacion({ page: p.page, limit: p.limit, total }) };
}
