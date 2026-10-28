// Textos de los avisos por correo, sin base de datos ni envío (se prueban en ux_rules.test.mjs).

// Dominios reservados para pruebas y ejemplos (RFC 2606): nunca reciben correo. Ahí viven la
// cuenta demo y las de los tests.
const DOMINIOS_DE_PRUEBA = /@([a-z0-9-]+\.)*(example\.(com|org|net)|example|test|invalid|localhost)$/i;
export const destinoValido = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !DOMINIOS_DE_PRUEBA.test(email.trim());

const escapar = (texto) => String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const enlace = (base, ruta) => `${String(base ?? "").replace(/\/+$/, "")}${ruta}`;

// Cada aviso: asunto, renglones de texto y a dónde ir a resolverlo.
const AVISOS = {
  nuevo_organizador: (d) => ({
    asunto: `Nuevo organizador: ${d.nombre}`,
    renglones: [`${d.nombre} (${d.email}) activó su cuenta de organizador y empezó la prueba gratis.`],
    boton: ["Ver organizadores", "/admin/suscripciones"],
  }),
  transferencia_plan: (d) => ({
    asunto: `Comprobante del plan para revisar: ${d.nombre}`,
    renglones: [`${d.nombre} (${d.email}) mandó el comprobante de la transferencia del plan.`, "Revisalo y aprobalo o rechazalo."],
    boton: ["Revisar comprobantes", "/panel"],
  }),
  nueva_inscripcion: (d) => ({
    asunto: `Nueva inscripción en ${d.torneo}`,
    renglones: [
      `${d.pareja} se anotó en ${d.categoria}.`,
      d.estado === "esperando" ? "Falta que el compañero acepte la invitación; después la podés confirmar." : "Quedó pendiente: confirmala o rechazala.",
    ],
    boton: ["Ver inscripciones", `/mis-torneos/${d.torneoId}`],
  }),
  comprobante_inscripcion: (d) => ({
    asunto: `Comprobante de inscripción en ${d.torneo}`,
    renglones: [`${d.pareja} (${d.categoria}) mandó el comprobante del pago.`, "Al aprobarlo, la inscripción queda confirmada."],
    boton: ["Revisar el comprobante", `/mis-torneos/${d.torneoId}`],
  }),
};

/** { subject, text, html } del aviso; los datos del usuario se escapan en el HTML. */
export function armarAviso(tipo, datos, baseUrl) {
  const armar = AVISOS[tipo];
  if (!armar) throw new Error(`Aviso desconocido: ${tipo}`);
  const { asunto, renglones, boton: [textoBoton, ruta] } = armar(datos);
  const url = enlace(baseUrl, ruta);
  return {
    subject: `MiPadel · ${asunto}`,
    text: [...renglones, "", `${textoBoton}: ${url}`].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#13312a;line-height:1.5">
${renglones.map((r) => `<p style="margin:0 0 10px">${escapar(r)}</p>`).join("\n")}
<p style="margin:18px 0"><a href="${escapar(url)}" style="background:#0f4c3a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:bold">${escapar(textoBoton)}</a></p>
<p style="margin:0;color:#5b6b66;font-size:12px">Aviso automático de MiPadel.</p>
</div>`,
  };
}
