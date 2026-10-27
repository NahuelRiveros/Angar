/**
 * Integración con MercadoPago Checkout Pro (SDK oficial "mercadopago").
 *
 * Variables de entorno:
 *   MP_ACCESS_TOKEN            — token de acceso (TEST para pruebas, PROD para cobrar)
 *   RENDER_APP_URL             — URL pública del backend (para recibir el aviso de pago)
 *   VERCEL_FRONTEND_URL        — URL del frontend (para volver después de pagar)
 */

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { env } from "../../configuracion_servidor/env.js";
import { referenciaDeUsuario } from "./suscripcion_reglas.js";

function getCliente() {
  if (!env.MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN no configurado.");
  return new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });
}

/** Preferencia de un mes para un organizador; devuelve la URL de pago. */
export async function crearPreferencia({ usuarioId, monto, dias }) {
  const vuelta = `${env.VERCEL_FRONTEND_URL || "http://localhost:5173"}/mi-suscripcion`;
  const body = {
    items: [{
      id: "plan-mensual-organizador",
      title: `MiPadel — Plan organizador (${dias} días)`,
      quantity: 1,
      unit_price: Number(monto),
      currency_id: "ARS",
    }],
    back_urls: {
      success: `${vuelta}?pago=aprobado`,
      failure: `${vuelta}?pago=rechazado`,
      pending: `${vuelta}?pago=pendiente`,
    },
    auto_return: "approved",
    external_reference: referenciaDeUsuario(usuarioId),
    // Sin URL pública (local) MercadoPago no puede avisar; el plan se extiende al llegar el aviso.
    ...(env.RENDER_APP_URL && { notification_url: `${env.RENDER_APP_URL}/api/suscripcion/webhook` }),
  };

  const response = await new Preference(getCliente()).create({ body });
  const prueba = env.MP_ACCESS_TOKEN.startsWith("TEST-");
  return { preference_id: response.id, url_pago: prueba ? response.sandbox_init_point : response.init_point };
}

/** Consulta el pago a MercadoPago: la única fuente confiable de su estado. */
export async function verificarPago(paymentId) {
  const data = await new Payment(getCliente()).get({ id: paymentId });
  return {
    id: data.id,
    estado: data.status, // approved | pending | in_process | rejected | cancelled | refunded
    monto: data.transaction_amount,
    moneda: data.currency_id,
    external_reference: data.external_reference,
    detalle: { metodo: data.payment_method_id, tipo: data.payment_type_id, descripcion: data.status_detail },
  };
}
