import { orderConfig } from "../../../../order_config.js";
import { env } from "../../configuracion_servidor/env.js";

// Textos de los mails de pedidos. Sin acceso a la base: se prueban en ux_rules.test.mjs.

const ZONA = "America/Argentina/Buenos_Aires";
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
// Nombres, motivos y observaciones los escribe el cliente: nunca van crudos al HTML.
export const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
const dinero = (n) => Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const fecha = (d) => new Date(d).toLocaleString("es-AR", { timeZone: ZONA, dateStyle: "short", timeStyle: "short" });
const enlace = (ruta) => new URL(ruta, env.VERCEL_FRONTEND_URL).href;
const nombreCliente = (c) => [c?.nombre, c?.apellido].filter(Boolean).join(" ") || "Cliente";
const empresa = () => env.NOMBRE_REMITENTE || "la distribuidora";
const RUTA_MIS_PEDIDOS = "/distribuidora/mis-pedidos";
const rutaGestion = (id) => `/distribuidora/admin/notas-pedido?q=${encodeURIComponent("#" + id)}`;

// Lo que lee el comprador según el estado al que pasó su pedido.
const MENSAJE_ESTADO = {
  pendiente: "Tu pedido volvió a revisión. Te avisamos cuando esté confirmado.",
  confirmado: "Revisamos tu pedido y está confirmado. Ahora lo preparamos.",
  en_curso: "Estamos preparando tu pedido.",
  entregado: "Tu pedido figura como entregado. ¡Gracias por tu compra!",
  cancelada: "Tu pedido fue cancelado.",
};

function plantilla(titulo, cuerpo, { texto, url, boton }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
  <h1 style="font-size:20px">${escapar(titulo)}</h1>
  ${cuerpo}
  <p style="margin:24px 0"><a href="${escapar(url)}" style="background:#0f766e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">${escapar(boton)}</a></p>
  <p style="font-size:12px;color:#64748b">Este mail lo envió automáticamente ${escapar(empresa())}.</p>
</div>`;
  return { html, text: `${titulo}\n\n${texto}\n\n${boton}: ${url}` };
}

function detalle(nota) {
  const items = nota.items ?? [];
  const nombre = (i) => i.nombre_producto + (i.variedad_nombre ? ` (${i.variedad_nombre})` : "");
  const filas = items.map((i) => `<tr><td style="padding:6px 0">${escapar(i.cantidad)} × ${escapar(nombre(i))}</td><td style="padding:6px 0;text-align:right">${escapar(dinero(i.subtotal))}</td></tr>`).join("");
  const entrega = [nota.direccion, nota.localidad, nota.provincia].filter(Boolean).join(", ");
  return {
    html: `<table style="width:100%;border-collapse:collapse;font-size:14px">${filas}
  <tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;font-weight:bold">Total</td><td style="padding:8px 0;border-top:1px solid #e2e8f0;text-align:right;font-weight:bold">${escapar(dinero(nota.total))}</td></tr></table>
  ${entrega ? `<p style="font-size:14px">Entrega: ${escapar(entrega)}</p>` : ""}
  ${nota.notas ? `<p style="font-size:14px;white-space:pre-wrap">Observaciones: ${escapar(nota.notas)}</p>` : ""}`,
    texto: [...items.map((i) => `${i.cantidad} × ${nombre(i)}: ${dinero(i.subtotal)}`), `Total: ${dinero(nota.total)}`,
      entrega && `Entrega: ${entrega}`, nota.notas && `Observaciones: ${nota.notas}`].filter(Boolean).join("\n"),
  };
}

export function mailPedidoNuevoEquipo(nota, cliente) {
  const d = detalle(nota);
  const contacto = [cliente?.email, cliente?.celular && "Cel. " + cliente.celular].filter(Boolean).join(" · ");
  const subject = `Nuevo pedido #${nota.id} de ${nombreCliente(cliente)}: ${dinero(nota.total)}`;
  return { subject, ...plantilla(`Nuevo pedido #${nota.id}`,
    `<p>${escapar(nombreCliente(cliente))}${contacto ? ` (${escapar(contacto)})` : ""} envió un pedido el ${escapar(fecha(nota.fecha_alta))}.</p>${d.html}`,
    { texto: `${nombreCliente(cliente)}${contacto ? ` (${contacto})` : ""} envió un pedido el ${fecha(nota.fecha_alta)}.\n\n${d.texto}`,
      url: enlace(rutaGestion(nota.id)), boton: "Revisar el pedido" }) };
}

export function mailPedidoRecibidoCliente(nota, cliente) {
  const d = detalle(nota);
  const intro = `Hola ${nombreCliente(cliente)}, recibimos tu pedido. Lo revisamos y te avisamos por mail cuando esté confirmado.`;
  return { subject: `Recibimos tu pedido #${nota.id}`, ...plantilla(`Pedido #${nota.id} recibido`,
    `<p>${escapar(intro)}</p>${d.html}`,
    { texto: `${intro}\n\n${d.texto}`, url: enlace(RUTA_MIS_PEDIDOS), boton: "Ver mis pedidos" }) };
}

export function mailCambioEstadoCliente(nota, cliente, { nuevo, motivo = null }) {
  const etiqueta = orderConfig.states[nuevo]?.label ?? nuevo;
  // Solo la cancelación explica el motivo: los demás son notas internas del equipo.
  const razon = nuevo === "cancelada" && motivo ? `Motivo: ${motivo}` : "";
  const mensaje = `Hola ${nombreCliente(cliente)}. ${MENSAJE_ESTADO[nuevo] ?? `Tu pedido pasó a "${etiqueta}".`}`;
  return { subject: `Tu pedido #${nota.id}: ${etiqueta}`, ...plantilla(`Pedido #${nota.id}: ${etiqueta}`,
    `<p>${escapar(mensaje)}</p>${razon ? `<p>${escapar(razon)}</p>` : ""}`,
    { texto: [mensaje, razon].filter(Boolean).join("\n"), url: enlace(RUTA_MIS_PEDIDOS), boton: "Ver mis pedidos" }) };
}

export function mailCancelacionClienteEquipo(nota, cliente, motivo) {
  const texto = `${nombreCliente(cliente)} canceló el pedido #${nota.id} (${dinero(nota.total)}). Motivo: ${motivo}`;
  return { subject: `${nombreCliente(cliente)} canceló el pedido #${nota.id}`, ...plantilla(`Pedido #${nota.id} cancelado por el cliente`,
    `<p>${escapar(texto)}</p>`, { texto, url: enlace(rutaGestion(nota.id)), boton: "Ver el pedido" }) };
}
