import { orderConfig } from "../../../../order_config.js";
import ExcelJS from "exceljs";
import {
  crearNotaPedido, listarPropias, listarTodas, obtenerDetalle,
  cambiarEstado, cancelarPropia, registrarPago, anularPago,
} from "../../services/distribuidora/nota_pedido_service.js";

export async function crearNotaPedidoController(req, res) {
  try {
    const { notas, expectedItems, key } = req.body ?? {};
    const nota = await crearNotaPedido(req.user.usuario_id, { notas, expectedItems, key });
    return res.status(201).json({ ok: true, mensaje: "Pedido enviado correctamente", data: nota });
  } catch (error) {
    console.error("Error al crear nota de pedido:", error);
    return res.status(error.status ?? 500).json({
      ok: false,
      codigo: error.codigo,
      mensaje: error.status ? error.message : "Error interno al enviar el pedido",
    });
  }
}

export async function listarMisNotasController(req, res) {
  try {
    return res.json({ ok: true, data: await listarPropias(req.user.usuario_id) });
  } catch (error) {
    console.error("Error al listar notas de pedido:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar los pedidos" });
  }
}

export async function listarTodasController(req, res) {
  try {
    return res.json({ ok: true, ...await listarTodas(req.query) });
  } catch (error) {
    console.error("Error al listar notas de pedido:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar los pedidos" });
  }
}

export async function cambiarEstadoController(req, res) {
  try {
    const { estado, motivo, expectedState } = req.body ?? {};
    if (!orderConfig.states[estado]) {
      return res.status(400).json({ ok: false, mensaje: "estado inválido" });
    }
    const nota = await cambiarEstado(req.params.id, estado, { usuario_id: req.user.usuario_id, motivo, expectedState });
    if (!nota) return res.status(404).json({ ok: false, mensaje: "Pedido no encontrado" });
    return res.json({ ok: true, mensaje: "Estado actualizado", data: nota });
  } catch (error) {
    console.error("Error al cambiar estado de nota de pedido:", error);
    return res.status(error.status ?? 500).json({
      ok: false,
      codigo: error.codigo,
      mensaje: error.status ? error.message : "Error interno al actualizar el pedido",
    });
  }
}

export async function cancelarMiNotaController(req, res) {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ ok: false, mensaje: "Pedido no encontrado" });
    const { motivo, volverAlCarrito } = req.body ?? {};
    const resultado = await cancelarPropia(req.user.usuario_id, Number(req.params.id), { motivo, volverAlCarrito: volverAlCarrito === true });
    if (!resultado) return res.status(404).json({ ok: false, mensaje: "Pedido no encontrado" });
    return res.json({
      ok: true,
      mensaje: volverAlCarrito === true ? "Pedido cancelado. Sus productos volvieron a tu carrito." : "Pedido cancelado",
      data: resultado.nota,
      omitidos: resultado.omitidos,
    });
  } catch (error) {
    console.error("Error al cancelar nota de pedido:", error);
    return res.status(error.status ?? 500).json({
      ok: false,
      codigo: error.codigo,
      mensaje: error.status ? error.message : "Error interno al cancelar el pedido",
    });
  }
}

export async function registrarPagoController(req, res) {
  try {
    const { monto, nota, metodo, key } = req.body ?? {};
    const notaPedido = await registrarPago(req.params.id, { monto, nota, metodo, key, usuario_id: req.user.usuario_id });
    if (!notaPedido) return res.status(404).json({ ok: false, mensaje: "Pedido no encontrado" });
    return res.status(201).json({ ok: true, mensaje: "Pago registrado", data: notaPedido });
  } catch (error) {
    console.error("Error al registrar pago de nota de pedido:", error);
    return res.status(error.status ?? 500).json({
      ok: false,
      codigo: error.codigo,
      mensaje: error.status ? error.message : "Error interno al registrar el pago",
    });
  }
}

export async function anularPagoController(req, res) {
  try {
    const pago = await anularPago(req.params.pagoId, req.user.usuario_id, { pedidoId: req.params.id, motivo: req.body?.motivo });
    if (!pago) return res.status(404).json({ ok: false, mensaje: "Pago no encontrado" });
    return res.json({ ok: true, mensaje: "Pago anulado", data: pago });
  } catch (error) {
    console.error("Error al anular pago de nota de pedido:", error);
    return res.status(error.status ?? 500).json({
      ok: false,
      codigo: error.codigo,
      mensaje: error.status ? error.message : "Error interno al anular el pago",
    });
  }
}

const fmtMoneda = (n) => `$ ${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
const ESTADO_PAGO_LABEL = { pendiente: "Pendiente", parcial: "Parcial", pagado: "Pagado" };
const ESTADO_LABEL = Object.fromEntries(Object.entries(orderConfig.states).map(([key, state]) => [key, state.label]));

export async function exportarNotaPedidoController(req, res) {
  try {
    const nota = await obtenerDetalle(req.params.id);
    if (!nota) return res.status(404).json({ ok: false, mensaje: "Pedido no encontrado" });

    const persona = nota.usuario?.persona;
    const workbook = new ExcelJS.Workbook();
    const hoja = workbook.addWorksheet(`Pedido ${nota.id}`);
    hoja.columns = [{ width: 34 }, { width: 20 }, { width: 12 }, { width: 18 }, { width: 18 }];

    hoja.addRow([`Pedido #${nota.id}`]).font = { bold: true, size: 14 };
    hoja.addRow(["Cliente", persona ? `${persona.nombre} ${persona.apellido}` : "—"]);
    hoja.addRow(["Email", persona?.email ?? "—"]);
    hoja.addRow(["CUIT", nota.cuit ?? "—", nota.razon_social ?? ""]);
    hoja.addRow(["Entrega", `${nota.direccion ?? ""}, ${nota.localidad ?? ""}, ${nota.provincia ?? ""}`]);
    hoja.addRow(["Fecha", new Date(nota.fecha_alta).toLocaleString("es-AR")]);
    hoja.addRow(["Estado", ESTADO_LABEL[nota.estado] ?? nota.estado]);
    hoja.addRow(["Estado de pago", ESTADO_PAGO_LABEL[nota.estado_pago] ?? nota.estado_pago]);
    if (nota.notas) hoja.addRow(["Notas", nota.notas]);
    hoja.addRow([]);

    const headerRow = hoja.addRow(["Producto", "Variedad", "Cantidad", "Precio unitario", "Subtotal"]);
    headerRow.font = { bold: true };

    for (const item of nota.items ?? []) {
      hoja.addRow([
        item.nombre_producto,
        item.variedad_nombre ?? "",
        item.cantidad,
        fmtMoneda(item.precio_unitario),
        fmtMoneda(item.subtotal),
      ]);
    }

    const totalRow = hoja.addRow(["", "", "", "Total", fmtMoneda(nota.total)]);
    totalRow.font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="pedido-${nota.id}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al exportar nota de pedido:", error);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, mensaje: "Error interno al exportar el pedido" });
    }
    res.end();
  }
}
