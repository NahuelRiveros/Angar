import { Op, QueryTypes, fn, col } from "sequelize";
import { sequelize } from "../../../database/sequelize.js";
import { ErrorApp } from "../../../services/common/errores.js";
import { contiene, exigirVersion, obtenerOFallar, paginar, quienLoHizo } from "../../../services/common/consultas.js";
import { cambioDePedido } from "../../enganches.js";
import { PedHistorial, PedItem, PedPedido } from "../modelos.js";
import { NOMBRE_ESTADO, siguientes, soloDigitos, transicion } from "../reglas.js";

// Pedidos en el panel (MPE-07, MPE-08, MPE-10). Lo de quien compra está en enviar_service.js.
const POR_PAGINA = 30;
const NO_EXISTE = "Ese pedido no existe.";
const MAX_ID = 2147483647;

/** MPE-10: busca por número, nombre o celular. */
function busqueda(q) {
  const digitos = soloDigitos(q);
  const opciones = [contiene("PedPedido.nombre", q)];
  if (digitos && /^\s*#?\d+\s*$/.test(q) && Number(digitos) <= MAX_ID) opciones.push({ id: Number(digitos) });
  if (digitos.length >= 3) opciones.push({ celular: { [Op.like]: `%${digitos}%` } });
  return { [Op.or]: opciones };
}

export async function listarPedidos({ estado, q, page }) {
  const filtros = [...(q ? [busqueda(q)] : [])];
  const pagina = await paginar(PedPedido, {
    where: { [Op.and]: [...filtros, ...(estado ? [{ estado }] : [])] },
    attributes: ["id", "estado", "nombre", "celular", "entrega", "total", "creado_en"],
    include: [{ model: PedItem, as: "items", separate: true, attributes: ["pedido_id", "cantidad"] }],
    order: [["id", "DESC"]],
  }, { page, limit: POR_PAGINA });
  // Cuántos hay en cada estado con la misma búsqueda: es lo que muestran las pestañas.
  const conteo = await PedPedido.findAll({ where: { [Op.and]: filtros }, attributes: ["estado", [fn("COUNT", col("id")), "cantidad"]], group: ["estado"], raw: true });
  return {
    ...pagina,
    por_estado: Object.fromEntries(conteo.map((c) => [c.estado, Number(c.cantidad)])),
    items: pagina.items.map((p) => {
      const { id, items, ...datos } = p.get({ plain: true });
      return { ...datos, numero: id, unidades: items.reduce((suma, i) => suma + i.cantidad, 0) };
    }),
  };
}

/** El historial con el nombre de quien hizo cada cambio (vacío si fue la persona que compró). */
const QUIEN = quienLoHizo("h.usuario_id");
const historialDe = (pedido_id) => sequelize.query(`
  SELECT h.de, h.a, h.motivo, h.creado_en, ${QUIEN.columna}
  FROM ped_historial h ${QUIEN.union}
  WHERE h.pedido_id = :pedido_id
  ORDER BY h.id`, { replacements: { pedido_id }, type: QueryTypes.SELECT });

export async function obtenerPedido(id) {
  const pedido = await obtenerOFallar(PedPedido, id, NO_EXISTE, {
    attributes: { exclude: ["clave_envio"] },
    include: [{ model: PedItem, as: "items", separate: true, order: [["orden", "ASC"], ["id", "ASC"]] }],
  });
  const { id: numero, items, ...datos } = pedido.get({ plain: true });
  return {
    ...datos, id: numero, numero, siguientes: siguientes(datos.estado),
    items: items.map(({ pedido_id: _p, orden: _o, ...item }) => item),
    historial: await historialDe(numero),
  };
}

/** MPE-07 y MPE-08: cambia de estado y lo anota. Si otra persona lo cambió antes, avisa en vez de pisarlo. */
export async function cambiarEstado(id, { estado, motivo, version }, usuario_id) {
  await sequelize.transaction(async (transaction) => {
    const pedido = await obtenerOFallar(PedPedido, id, NO_EXISTE, { transaction, bloquear: true });
    exigirVersion(pedido, version, "Otra persona cambió este pedido recién. Actualizalo para ver cómo quedó.");
    const paso = transicion(pedido.estado, estado);
    if (!paso) throw new ErrorApp("ESTADO_INVALIDO", `Un pedido ${NOMBRE_ESTADO[pedido.estado]} no puede pasar a ${NOMBRE_ESTADO[estado]}.`, 400);
    if (paso.pideMotivo && !motivo) throw new ErrorApp("DATOS_INVALIDOS", "Escribí el motivo.", 400);
    const de = pedido.estado;
    // MOD-17: lo que dependa del estado (ej. stock) cambia junto con él o no cambia nada.
    const items = await PedItem.findAll({ where: { pedido_id: id }, attributes: ["variante_id", "cantidad", "producto_nombre", "variante_nombre"], raw: true, transaction });
    await cambioDePedido({
      pedido_id: id, de, a: estado, usuario_id,
      items: items.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad, nombre: i.variante_nombre ? `${i.producto_nombre} (${i.variante_nombre})` : i.producto_nombre })),
    }, transaction);
    await pedido.update({ estado, version: version + 1, actualizado_en: new Date() }, { transaction });
    await PedHistorial.create({ pedido_id: id, de, a: estado, motivo: paso.pideMotivo ? motivo : null, usuario_id }, { transaction });
  });
  return obtenerPedido(id);
}
