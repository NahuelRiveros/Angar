/**
 * mercadopago_service.js
 *
 * Integración con MercadoPago Checkout Pro.
 * Usa el SDK oficial v2+ (@mercadopago/sdk-node).
 *
 * Variables de entorno necesarias:
 *   MP_ACCESS_TOKEN      — token de acceso (test o producción)
 *   RENDER_APP_URL       — URL del backend en Render (para el webhook)
 *   VERCEL_FRONTEND_URL  — URL del frontend en Vercel (para redireccionamiento post-pago)
 *   SOFTWARE_PRECIO      — precio mensual en ARS
 *   SOFTWARE_CLIENTE     — nombre del gimnasio
 */

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { env } from "../../configuracion_servidor/env.js";

// ── Cliente MP ───────────────────────────────────────────────────────────────

function getCliente() {
  if (!env.MP_ACCESS_TOKEN) {
    throw new Error(
      "MP_ACCESS_TOKEN no configurado. Agregar en servidor/.env o en las variables de Render."
    );
  }
  return new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });
}

// ── Crear preferencia de pago (Checkout Pro) ─────────────────────────────────

export async function crearPreferencia({ suscripcionId, monto, clienteNombre }) {
  const client = getCliente();

  const periodoLabel = mesLabel(); // "Junio 2025"
  const precioUsar   = monto ?? env.SOFTWARE_PRECIO;

  if (!precioUsar || precioUsar <= 0) {
    throw new Error(
      "SOFTWARE_PRECIO no configurado o es 0. Definir en servidor/.env o Render."
    );
  }

  const backBase = env.VERCEL_FRONTEND_URL || "http://localhost:5173";
  const apiBase  = env.RENDER_APP_URL      ? `${env.RENDER_APP_URL}/api` : null;

  const body = {
    items: [
      {
        id:         "plan-mensual-software",
        title:      `DistribuCG — Plan Mensual ${periodoLabel}`,
        description: `Suscripción mensual para ${clienteNombre || env.SOFTWARE_CLIENTE}`,
        quantity:    1,
        unit_price:  Number(precioUsar),
        currency_id: "ARS",
      },
    ],
    back_urls: {
      success: `${backBase}/pago-exitoso`,
      failure: `${backBase}/pago-fallido`,
      pending: `${backBase}/pago-exitoso?pending=1`,
    },
    auto_return: "approved",
    external_reference: String(suscripcionId),
    // El webhook solo funciona en producción con URL pública
    ...(apiBase && {
      notification_url: `${apiBase}/suscripcion/webhook`,
    }),
  };

  const preference = new Preference(client);
  const response   = await preference.create({ body });

  return {
    preference_id: response.id,
    init_point:    response.init_point,       // URL de pago producción
    sandbox_init_point: response.sandbox_init_point, // URL de pago sandbox
  };
}

// ── Verificar un pago recibido vía webhook ────────────────────────────────────

export async function verificarPago(paymentId) {
  const client = getCliente();
  const api    = new Payment(client);

  const data = await api.get({ id: paymentId });

  return {
    id:                 data.id,
    estado:             data.status,            // approved | pending | rejected | cancelled
    monto:              data.transaction_amount,
    external_reference: data.external_reference,
    aprobado:           data.status === "approved",
    detalle:            {
      metodo:     data.payment_method_id,
      tipo:       data.payment_type_id,
      descripcion: data.status_detail,
    },
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

function mesLabel() {
  return new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}
