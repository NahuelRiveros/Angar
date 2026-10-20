/**
 * software_suscripcion_service.js
 *
 * Gestión de la suscripción mensual al software DistribuCG.
 * Una sola fila en software_suscripcion por instalación.
 *
 * Ciclo de vida:
 *   activo   → más de 10 días antes del vencimiento
 *   aviso    → 1-10 días antes (últimos días del mes)
 *   gracia   → 0 a -10 días (del 1 al 10 del mes siguiente)
 *   vencido  → más de 10 días después del vencimiento (bloqueo suave)
 */

import { sequelize } from "../../database/sequelize.js";
import { QueryTypes } from "sequelize";
import { env } from "../../configuracion_servidor/env.js";

const DIAS_AVISO  = 10;   // días previos al vencimiento → aviso
const DIAS_GRACIA = 3;    // días de gracia después del vencimiento (solo UI, no bloquea)

// ── Setup inicial (se llama UNA VEZ por instalación) ────────────────────────

export async function setupTablas() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.software_suscripcion (
      id                SERIAL PRIMARY KEY,
      cliente_nombre    VARCHAR(200) NOT NULL DEFAULT 'Gym',
      plan_nombre       VARCHAR(100) NOT NULL DEFAULT 'Plan Mensual',
      precio            DECIMAL(10,2) NOT NULL DEFAULT 0,
      fecha_inicio      DATE NOT NULL,
      fecha_vencimiento DATE NOT NULL,
      creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.software_pago (
      id                SERIAL PRIMARY KEY,
      mp_payment_id     VARCHAR(100) UNIQUE,
      mp_preference_id  VARCHAR(300),
      monto             DECIMAL(10,2) NOT NULL,
      estado            VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
      detalle           JSONB,
      periodo_desde     DATE,
      periodo_hasta     DATE,
      creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  return { tablas: "ok" };
}

export async function crearSuscripcionInicial() {
  const existe = await sequelize.query(
    `SELECT id FROM public.software_suscripcion LIMIT 1`,
    { type: QueryTypes.SELECT }
  );
  if (existe.length > 0) {
    return { ok: false, codigo: "YA_EXISTE", mensaje: "La suscripción ya existe" };
  }

  const hoy = new Date().toISOString().slice(0, 10);
  // Vencimiento: último día del mes siguiente al inicio
  const venc = primerDiaSiguiente(hoy);

  await sequelize.query(
    `INSERT INTO public.software_suscripcion
       (cliente_nombre, plan_nombre, precio, fecha_inicio, fecha_vencimiento)
     VALUES (:cliente, 'Plan Mensual', :precio, :inicio, :venc)`,
    {
      replacements: {
        cliente: env.SOFTWARE_CLIENTE,
        precio:  env.SOFTWARE_PRECIO,
        inicio:  hoy,
        venc,
      },
      type: QueryTypes.INSERT,
    }
  );

  return { ok: true, mensaje: "Suscripción inicial creada", vencimiento: venc };
}

// ── Estado actual ────────────────────────────────────────────────────────────

export async function obtenerEstado() {
  const rows = await sequelize.query(
    `SELECT * FROM public.software_suscripcion ORDER BY id LIMIT 1`,
    { type: QueryTypes.SELECT }
  );

  if (!rows.length) {
    return {
      ok:        false,
      codigo:    "SIN_SUSCRIPCION",
      mensaje:   "No hay suscripción configurada. Contactá al soporte.",
      estado:    "sin_suscripcion",
      bloqueado: false,
    };
  }

  const s      = rows[0];
  const estado = calcularEstado(s.fecha_vencimiento);

  return {
    ok:               true,
    id:               s.id,
    cliente_nombre:   s.cliente_nombre,
    plan_nombre:      s.plan_nombre,
    precio:           Number(s.precio),
    fecha_inicio:     String(s.fecha_inicio).slice(0, 10),
    fecha_vencimiento: String(s.fecha_vencimiento).slice(0, 10),
    ...estado,
  };
}

// ── Extender suscripción después de un pago aprobado ────────────────────────

export async function extenderSuscripcion(dias = 30) {
  const rows = await sequelize.query(
    `SELECT id, fecha_vencimiento FROM public.software_suscripcion ORDER BY id LIMIT 1`,
    { type: QueryTypes.SELECT }
  );
  if (!rows.length) return { ok: false, mensaje: "Sin suscripción" };

  const s       = rows[0];
  const base    = new Date(s.fecha_vencimiento);
  const hoy     = new Date();

  // Si el plan ya vencio, el nuevo período empieza desde hoy
  const desde = base > hoy ? base : hoy;
  const calculada = new Date(desde);
  calculada.setDate(calculada.getDate() + dias);
  // Redondear al 1ro del mes siguiente al resultado (ciclo mensual limpio)
  const nuevaFecha    = new Date(calculada.getFullYear(), calculada.getMonth() + 1, 1);
  const nuevaFechaStr = nuevaFecha.toISOString().slice(0, 10);

  await sequelize.query(
    `UPDATE public.software_suscripcion
     SET fecha_vencimiento = :venc,
         actualizado_en    = NOW()
     WHERE id = :id`,
    {
      replacements: { venc: nuevaFechaStr, id: s.id },
      type: QueryTypes.UPDATE,
    }
  );

  console.log(`✅ Suscripción extendida hasta: ${nuevaFechaStr}`);
  return { ok: true, nuevo_vencimiento: nuevaFechaStr };
}

// ── Registrar pago ───────────────────────────────────────────────────────────

export async function registrarPago({ mpPaymentId, mpPreferenceId, monto, estado, detalle, desde, hasta }) {
  // Evitar duplicados (MP puede reenviar el webhook)
  const existe = await sequelize.query(
    `SELECT id FROM public.software_pago WHERE mp_payment_id = :pid LIMIT 1`,
    { replacements: { pid: String(mpPaymentId) }, type: QueryTypes.SELECT }
  );
  if (existe.length > 0) return { ok: false, codigo: "DUPLICADO" };

  await sequelize.query(
    `INSERT INTO public.software_pago
       (mp_payment_id, mp_preference_id, monto, estado, detalle, periodo_desde, periodo_hasta)
     VALUES (:pid, :pref, :monto, :estado, :detalle, :desde, :hasta)`,
    {
      replacements: {
        pid:    String(mpPaymentId),
        pref:   mpPreferenceId || null,
        monto:  Number(monto),
        estado,
        detalle: JSON.stringify(detalle || {}),
        desde:  desde || null,
        hasta:  hasta || null,
      },
      type: QueryTypes.INSERT,
    }
  );

  return { ok: true };
}

// ── Fijar fecha de vencimiento exacta ────────────────────────────────────────

export async function fijarFechaVencimiento(fecha) {
  const rows = await sequelize.query(
    `SELECT id FROM public.software_suscripcion ORDER BY id LIMIT 1`,
    { type: QueryTypes.SELECT }
  );
  if (!rows.length) return { ok: false, mensaje: "Sin suscripción" };

  await sequelize.query(
    `UPDATE public.software_suscripcion
     SET fecha_vencimiento = :fecha,
         actualizado_en    = NOW()
     WHERE id = :id`,
    { replacements: { fecha, id: rows[0].id }, type: QueryTypes.UPDATE }
  );

  console.log(`✅ Vencimiento fijado a: ${fecha}`);
  return { ok: true, nuevo_vencimiento: fecha };
}

// ── Historial de pagos ────────────────────────────────────────────────────────

export async function historialPagos(limit = 12) {
  return sequelize.query(
    `SELECT id, mp_payment_id, monto, estado, periodo_desde, periodo_hasta, creado_en
     FROM public.software_pago
     ORDER BY creado_en DESC
     LIMIT :limit`,
    { replacements: { limit }, type: QueryTypes.SELECT }
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function calcularEstado(fechaVencimiento) {
  const hoy  = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento);
  venc.setHours(0, 0, 0, 0);

  const diffMs   = venc - hoy;
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias > DIAS_AVISO) {
    return {
      estado:    "activo",
      bloqueado: false,
      dias_restantes: diffDias,
      mensaje:   `Plan activo — vence en ${diffDias} días`,
    };
  }
  if (diffDias > 0) {
    return {
      estado:    "aviso",
      bloqueado: false,
      dias_restantes: diffDias,
      mensaje:   `Renovar antes del ${fmtFechaAR(venc)} — quedan ${diffDias} día${diffDias === 1 ? "" : "s"}`,
    };
  }
  if (diffDias >= -DIAS_GRACIA) {
    const diasGracia = DIAS_GRACIA + diffDias; // cuántos días de gracia quedan
    return {
      estado:    "gracia",
      bloqueado: false,
      dias_restantes: diffDias,
      dias_gracia_restantes: diasGracia,
      mensaje:   `Plan vencido — período de gracia: ${diasGracia} día${diasGracia === 1 ? "" : "s"} restante${diasGracia === 1 ? "" : "s"} para renovar`,
    };
  }
  const diasVencido = Math.abs(diffDias) - DIAS_GRACIA;
  return {
    estado:    "vencido",
    bloqueado: true,
    dias_restantes: diffDias,
    mensaje:   `Sistema bloqueado — el plan venció hace ${diasVencido} días. Renovar para continuar.`,
  };
}

function fmtFechaAR(d) {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Calcula primer día del mes siguiente a partir de una fecha YYYY-MM-DD
function primerDiaSiguiente(fechaStr) {
  const d = new Date(fechaStr);
  return new Date(d.getFullYear(), d.getMonth() + 2, 0).toISOString().slice(0, 10);
}
