// Variables de entorno propias del rubro torneos (las del core están en core/configuracion_servidor/env.js,
// que además carga servidor/.env.local y limpia los valores: por eso se importa primero).
import "../../core/configuracion_servidor/env.js";

export const configTorneos = {
  // Precio de 30 días del plan de organizadores, en pesos sin centavos. 0 o vacío = sin pago por MercadoPago.
  PRECIO_SUSCRIPCION_MENSUAL: Number(process.env.PRECIO_SUSCRIPCION_MENSUAL || 0),
  // Avisos por correo (organizador nuevo, inscripciones, comprobantes). "no" los apaga (los tests y la demo lo hacen).
  AVISOS_POR_CORREO: String(process.env.AVISOS_POR_CORREO || "si").toLowerCase() !== "no",
  // "si": al arrancar (cada deploy) crea los torneos DEMO si todavía no existen. Vacío o "no": nada.
  DEMO_AL_INICIAR: ["si", "true"].includes(String(process.env.DEMO_AL_INICIAR || "").toLowerCase()),
};
