import { Op } from "sequelize";
import { orderConfig } from "../../../../order_config.js";
import { enviarEmail, mailConfigured } from "../common/mail_service.js";
import { NotaPedido, NotaPedidoItem, Persona, Rol, Usuario } from "../../models/index.js";
import {
  mailCambioEstadoCliente, mailCancelacionClienteEquipo, mailComprobanteNuevoEquipo, mailComprobanteRechazadoCliente,
  mailPedidoNuevoEquipo, mailPedidoRecibidoCliente,
} from "./avisos_pedido_plantillas.js";

/**
 * Mails de pedidos: al equipo (todo usuario activo con rol de gestión) y al comprador.
 * Se disparan DESPUÉS de confirmar la transacción y nunca propagan errores: un mail
 * que falla queda en el log y el pedido sigue su curso.
 */

/** Emails únicos de los usuarios activos con algún rol de gestión, en una sola consulta. */
export async function correosEquipo() {
  const usuarios = await Usuario.findAll({
    where: { activo: true, eliminado_en: null }, attributes: ["id"],
    include: [
      { model: Rol, as: "roles", attributes: [], through: { attributes: [] }, where: { codigo: { [Op.in]: orderConfig.managementRoles } } },
      { model: Persona, as: "persona", attributes: ["email"], where: { email: { [Op.ne]: null } } },
    ],
  });
  return [...new Set(usuarios.map((u) => u.persona.email.trim().toLowerCase()).filter(Boolean))];
}

async function cargarPedido(id) {
  return NotaPedido.findByPk(id, {
    include: [
      { model: NotaPedidoItem, as: "items", separate: true, order: [["id", "ASC"]] },
      { model: Usuario, as: "usuario", attributes: ["id"], include: [{ model: Persona, as: "persona", attributes: ["nombre", "apellido", "email", "celular"] }] },
    ],
  });
}

const pendientes = new Set();
function enSegundoPlano(nombre, tarea) {
  if (!mailConfigured()) { console.warn(`✉️  Correo no configurado: no se envió "${nombre}".`); return; }
  const envio = tarea()
    .catch((error) => console.error(`✉️  No se pudo enviar "${nombre}":`, error.message))
    .finally(() => pendientes.delete(envio));
  pendientes.add(envio);
}
/** Espera los mails en curso (pruebas y apagado ordenado). */
export const esperarAvisos = () => Promise.allSettled([...pendientes]);

async function enviarTodos(envios) {
  const resultados = await Promise.allSettled(envios.filter(Boolean).map((mail) => enviarEmail(mail)));
  const fallas = resultados.filter((r) => r.status === "rejected");
  if (fallas.length) throw new Error(fallas.map((f) => f.reason?.message).join(" | "));
}

export function avisarPedidoNuevo(id) {
  enSegundoPlano(`pedido nuevo #${id}`, async () => {
    const nota = await cargarPedido(id);
    if (!nota) return;
    const cliente = nota.usuario?.persona;
    const equipo = await correosEquipo();
    await enviarTodos([
      equipo.length && { to: equipo, ...mailPedidoNuevoEquipo(nota, cliente) },
      cliente?.email && { to: cliente.email, ...mailPedidoRecibidoCliente(nota, cliente) },
    ]);
  });
}

export function avisarCambioEstado(id, { nuevo, motivo }) {
  enSegundoPlano(`pedido #${id} → ${nuevo}`, async () => {
    const nota = await cargarPedido(id);
    const cliente = nota?.usuario?.persona;
    if (!cliente?.email) return;
    await enviarTodos([{ to: cliente.email, ...mailCambioEstadoCliente(nota, cliente, { nuevo, motivo }) }]);
  });
}

export function avisarCancelacionCliente(id, motivo) {
  enSegundoPlano(`cancelación del cliente #${id}`, async () => {
    const nota = await cargarPedido(id);
    if (!nota) return;
    const equipo = await correosEquipo();
    if (equipo.length) await enviarTodos([{ to: equipo, ...mailCancelacionClienteEquipo(nota, nota.usuario?.persona, motivo) }]);
  });
}

export function avisarComprobanteNuevo(id) {
  enSegundoPlano(`comprobante del pedido #${id}`, async () => {
    const nota = await cargarPedido(id);
    if (!nota) return;
    const equipo = await correosEquipo();
    if (equipo.length) await enviarTodos([{ to: equipo, ...mailComprobanteNuevoEquipo(nota, nota.usuario?.persona) }]);
  });
}

export function avisarComprobanteRechazado(id, motivo) {
  enSegundoPlano(`comprobante rechazado del pedido #${id}`, async () => {
    const nota = await cargarPedido(id);
    const cliente = nota?.usuario?.persona;
    if (cliente?.email) await enviarTodos([{ to: cliente.email, ...mailComprobanteRechazadoCliente(nota, cliente, motivo) }]);
  });
}
