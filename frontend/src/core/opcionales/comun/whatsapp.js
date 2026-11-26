/** Link de WhatsApp con el mensaje escrito. `numero`: con código de país, sin "+" ni espacios. */
export const linkWhatsapp = (numero, texto) => `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
