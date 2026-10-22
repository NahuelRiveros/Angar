import nodemailer from "nodemailer";
import { env } from "../../configuracion_servidor/env.js";

// Render gratis bloquea los puertos SMTP (25/465/587): en producción se envía por la
// API HTTPS de Brevo. El SMTP queda para desarrollo local (ej. Gmail con contraseña de app).
const usaBrevo = () => !!env.CLAVE_API_BREVO;
export function mailConfigured() { return usaBrevo() || !!(env.SMTP_USER && env.SMTP_PASS); }

const destinatarios = (to) => (Array.isArray(to) ? to : [to]).filter(Boolean);

async function enviarPorBrevo({ to, subject, html, text }) {
  if (!env.CORREO_REMITENTE) throw new Error("Falta CORREO_REMITENTE para enviar con Brevo");
  const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.CLAVE_API_BREVO, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: env.CORREO_REMITENTE, name: env.NOMBRE_REMITENTE || undefined },
      to: destinatarios(to).map((email) => ({ email })),
      subject,
      ...(html ? { htmlContent: html } : {}),
      ...(text ? { textContent: text } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  // El cuerpo del error de Brevo explica el motivo (remitente sin verificar, clave inválida...).
  if (!respuesta.ok) throw new Error(`Brevo respondió ${respuesta.status}: ${(await respuesta.text()).slice(0, 300)}`);
  return respuesta.json();
}

export async function enviarEmail({ to, subject, html, text }) {
  if (!mailConfigured()) throw new Error("Correo no configurado");
  if (usaBrevo()) return enviarPorBrevo({ to, subject, html, text });
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10000, socketTimeout: 15000,
  });
  return transporter.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to: destinatarios(to).join(", "), subject, html, text });
}
