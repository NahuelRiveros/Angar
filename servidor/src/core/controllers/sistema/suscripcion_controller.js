import { env } from "../../configuracion_servidor/env.js";
import {
  setupTablas,
  crearSuscripcionInicial,
  obtenerEstado,
  extenderSuscripcion,
  fijarFechaVencimiento,
  registrarPago,
  procesarPagoAprobado,
  historialPagos,
} from "../../services/sistema/software_suscripcion_service.js";
import {
  crearPreferencia,
  verificarPago,
} from "../../services/sistema/mercadopago_service.js";
import { invalidarCacheSuscripcion } from "../../middleware/suscripcion_middleware.js";

// ── Setup (una sola vez por instalación) ─────────────────────────────────────
export async function setupController(req, res, next) {
  try {
    const token = req.headers["x-seed-token"];
    if (!env.SEED_SECRET || token !== env.SEED_SECRET) {
      return res.status(403).json({ ok: false, mensaje: "No autorizado" });
    }
    await setupTablas();
    const r = await crearSuscripcionInicial();
    return res.json(r);
  } catch (err) {
    next(err);
  }
}

// ── Estado actual ─────────────────────────────────────────────────────────────
export async function estadoController(_req, res, next) {
  try {
    const estado = await obtenerEstado();
    return res.json(estado);
  } catch (err) {
    next(err);
  }
}

// ── Crear preferencia de pago ─────────────────────────────────────────────────
export async function crearPagoController(_req, res, next) {
  try {
    const estado = await obtenerEstado();
    if (!estado.ok) return res.status(400).json(estado);

    const pref = await crearPreferencia({
      suscripcionId: estado.id,
      monto:         estado.precio,
      clienteNombre: estado.cliente_nombre,
    });

    return res.json({ ok: true, ...pref });
  } catch (err) {
    // Error de configuración (MP_ACCESS_TOKEN faltante, etc.)
    if (err.message?.includes("MP_ACCESS_TOKEN") || err.message?.includes("SOFTWARE_PRECIO")) {
      return res.status(400).json({ ok: false, mensaje: err.message });
    }
    next(err);
  }
}

// ── Webhook de MercadoPago (público) ──────────────────────────────────────────
export async function webhookController(req, res) {
  try {
    const { type, data } = req.body ?? {};

    // MP envía notificaciones de tipo "payment"
    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200); // responder 200 para que MP no reintente
    }

    const paymentId = String(data.id);
    console.log(`📦 Webhook MP: pago ${paymentId}`);

    const pago = await verificarPago(paymentId);

    if (!pago.aprobado) {
      console.log(`  ⚠  Pago ${paymentId} no aprobado (${pago.estado})`);
      // Registrar igual para trazabilidad
      await registrarPago({
        mpPaymentId:    paymentId,
        mpPreferenceId: null,
        monto:          pago.monto,
        estado:         pago.estado,
        detalle:        pago.detalle,
      }).catch(() => {}); // ignorar duplicados
      return res.sendStatus(200);
    }

    // ── Pago aprobado ── 30 días, una sola vez aunque MercadoPago avise de nuevo (SIS-04)
    const resultado = await procesarPagoAprobado({
      mpPaymentId:    paymentId,
      mpPreferenceId: pago.external_reference,
      monto:          pago.monto,
      detalle:        pago.detalle,
    });
    if (resultado.extendida) {
      invalidarCacheSuscripcion(); // el bloqueo se levanta en el momento
      console.log(`  ✅ Suscripción extendida 30 días por pago ${paymentId}`);
    } else {
      console.log("  ℹ  Pago ya registrado, aviso repetido ignorado:", paymentId);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error en webhook MP:", err.message);
    // Siempre responder 200 a MP para que no reintente indefinidamente
    return res.sendStatus(200);
  }
}

// ── Historial de pagos ────────────────────────────────────────────────────────
export async function pagosController(_req, res, next) {
  try {
    const pagos = await historialPagos(24);
    return res.json({ ok: true, pagos });
  } catch (err) {
    next(err);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  RUTAS SUPER_ADMIN — requieren JWT + rol super_admin
//  Sin SEED_SECRET: usan el token de sesión normal
// ════════════════════════════════════════════════════════════════════════════

export async function superEstadoController(_req, res, next) {
  try {
    const estado = await obtenerEstado();
    return res.json(estado);
  } catch (err) { next(err); }
}

// Body: { "dias": 30 }
export async function superExtenderController(req, res, next) {
  try {
    const dias = Number(req.body?.dias);
    if (!dias || dias <= 0 || dias > 3650) {
      return res.status(400).json({ ok: false, mensaje: "Enviá { \"dias\": N } con N entre 1 y 3650" });
    }
    const r = await extenderSuscripcion(dias);
    invalidarCacheSuscripcion();
    return res.json({ ok: true, mensaje: `Plan extendido ${dias} día(s)`, nuevo_vencimiento: r.nuevo_vencimiento });
  } catch (err) { next(err); }
}

// Body: { "fecha": "YYYY-MM-DD" }
export async function superFijarController(req, res, next) {
  try {
    const fecha = req.body?.fecha;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, mensaje: "Enviá { \"fecha\": \"YYYY-MM-DD\" }" });
    }
    const r = await fijarFechaVencimiento(fecha);
    invalidarCacheSuscripcion();
    return res.json({ ok: true, mensaje: `Vencimiento fijado al ${fecha}`, nuevo_vencimiento: r.nuevo_vencimiento });
  } catch (err) { next(err); }
}

// ════════════════════════════════════════════════════════════════════════════
//  RUTAS DE ADMINISTRACIÓN — solo Nahuel (protegidas por SEED_SECRET)
//  Usar vía Postman con header:  x-seed-token: <SEED_SECRET>
// ════════════════════════════════════════════════════════════════════════════

function verificarSeedToken(req, res) {
  const token = req.headers["x-seed-token"];
  if (!env.SEED_SECRET || token !== env.SEED_SECRET) {
    res.status(403).json({ ok: false, mensaje: "Token de administración inválido" });
    return false;
  }
  return true;
}

// ── Ver estado sin login ──────────────────────────────────────────────────────
export async function adminEstadoController(req, res, next) {
  try {
    if (!verificarSeedToken(req, res)) return;
    const estado = await obtenerEstado();
    return res.json(estado);
  } catch (err) { next(err); }
}

// ── Extender N días a partir del vencimiento actual ───────────────────────────
// Body: { "dias": 30 }
export async function adminExtenderController(req, res, next) {
  try {
    if (!verificarSeedToken(req, res)) return;

    const dias = Number(req.body?.dias);
    if (!dias || dias <= 0 || dias > 365) {
      return res.status(400).json({
        ok: false,
        mensaje: "Enviá { \"dias\": N } con N entre 1 y 365",
      });
    }

    const r = await extenderSuscripcion(dias);
    invalidarCacheSuscripcion();
    return res.json({
      ok: true,
      mensaje: `Plan extendido ${dias} día(s)`,
      nuevo_vencimiento: r.nuevo_vencimiento,
    });
  } catch (err) { next(err); }
}

// ── Fijar fecha de vencimiento exacta (para pruebas o casos especiales) ───────
// Body: { "fecha": "2026-12-31" }
export async function adminFijarController(req, res, next) {
  try {
    if (!verificarSeedToken(req, res)) return;

    const fecha = req.body?.fecha;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Enviá { \"fecha\": \"YYYY-MM-DD\" }",
      });
    }

    await fijarFechaVencimiento(fecha);

    invalidarCacheSuscripcion();
    const estado = await obtenerEstado();
    return res.json({
      ok:      true,
      mensaje: `Vencimiento fijado a ${fecha}`,
      estado:  estado.estado,
      mensaje_estado: estado.mensaje,
    });
  } catch (err) { next(err); }
}
