// Reglas del plan de los organizadores, sin base de datos (se prueban en ux_rules.test.mjs).
// Las fechas son "YYYY-MM-DD" en hora de Argentina; el plan rige mientras hoy <= vencimiento.

export const DIAS_PRUEBA = 14;
export const DIAS_POR_PAGO = 30;
export const DIAS_AVISO = 7;
export const MAX_DIAS_MANUAL = 365;

const ZONA = "America/Argentina/Buenos_Aires";
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

export function hoyArgentina(ahora = new Date()) {
  // en-CA da el formato YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

const aUtc = (fecha) => {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};

export function esFechaValida(fecha) {
  if (typeof fecha !== "string" || !FECHA.test(fecha)) return false;
  return new Date(aUtc(fecha)).toISOString().slice(0, 10) === fecha;
}

export const sumarDias = (fecha, dias) => new Date(aUtc(fecha) + dias * DIA_MS).toISOString().slice(0, 10);
export const diasEntre = (desde, hasta) => Math.round((aUtc(hasta) - aUtc(desde)) / DIA_MS);

/** La prueba cuenta hoy como el día 1: 14 días = hoy + 13. */
export function vencimientoDePrueba(hoy) {
  return sumarDias(hoy, DIAS_PRUEBA - 1);
}

/** Suma días al final del plan; si ya venció, cuentan desde hoy (hoy es el día 1). */
export function nuevoVencimiento(vencimientoActual, hoy, dias) {
  const base = vencimientoActual && vencimientoActual >= hoy ? vencimientoActual : sumarDias(hoy, -1);
  return sumarDias(base, dias);
}

/** Estado que ve el organizador y que decide si puede editar. */
export function calcularEstado({ fecha_vencimiento, en_prueba }, hoy) {
  const diasRestantes = diasEntre(hoy, fecha_vencimiento) + 1; // incluye hoy
  if (diasRestantes <= 0) {
    return {
      estado: "vencido", vigente: false, dias_restantes: 0,
      mensaje: "Tu plan venció: podés ver tus torneos pero no crear ni editar. Renovalo para seguir organizando.",
    };
  }
  const plural = diasRestantes === 1 ? "día" : "días";
  if (en_prueba) {
    return { estado: "prueba", vigente: true, dias_restantes: diasRestantes, mensaje: `Prueba gratis: te quedan ${diasRestantes} ${plural}.` };
  }
  if (diasRestantes <= DIAS_AVISO) {
    return { estado: "por_vencer", vigente: true, dias_restantes: diasRestantes, mensaje: `Tu plan vence en ${diasRestantes} ${plural}. Renovalo para no quedar en solo lectura.` };
  }
  return { estado: "activo", vigente: true, dias_restantes: diasRestantes, mensaje: `Plan activo: te quedan ${diasRestantes} ${plural}.` };
}

// La preferencia de MercadoPago lleva el usuario en external_reference.
export const referenciaDeUsuario = (usuarioId) => `usuario:${usuarioId}`;
export function usuarioDeReferencia(referencia) {
  const m = /^usuario:(\d{1,10})$/.exec(String(referencia ?? ""));
  return m ? Number(m[1]) : null;
}

/**
 * Qué hacer con un pago consultado a MercadoPago. Solo un pago aprobado, en pesos y por
 * el precio vigente (o más) suma días: así nadie se habilita con un pago de menor monto.
 */
export function evaluarPagoMercadoPago(pago, precioMensual) {
  const usuarioId = usuarioDeReferencia(pago?.external_reference);
  if (!usuarioId) return { aplicar: false, usuarioId: null, estado: "referencia_invalida" };
  if (pago.estado !== "approved") return { aplicar: false, usuarioId, estado: pago.estado === "pending" || pago.estado === "in_process" ? "pendiente" : "rechazado" };
  if (pago.moneda !== "ARS" || !(Number(pago.monto) >= Number(precioMensual)) || !(Number(precioMensual) > 0)) {
    return { aplicar: false, usuarioId, estado: "monto_insuficiente" };
  }
  return { aplicar: true, usuarioId, estado: "aprobado" };
}

/** Body de la extensión manual: { dias, nota? }. */
export function validarExtensionManual(body) {
  const dias = Number(body?.dias);
  if (!Number.isInteger(dias) || dias < 1 || dias > MAX_DIAS_MANUAL) {
    return { error: `Indicá una cantidad de días entre 1 y ${MAX_DIAS_MANUAL}.` };
  }
  const nota = validarNota(body?.nota);
  if (nota.error) return nota;
  return { datos: { dias, nota: nota.valor } };
}

/** Body del ajuste de fecha: { fecha: "YYYY-MM-DD", nota? }. */
export function validarAjusteFecha(body) {
  if (!esFechaValida(body?.fecha)) return { error: "Indicá una fecha válida (AAAA-MM-DD)." };
  const nota = validarNota(body?.nota);
  if (nota.error) return nota;
  return { datos: { fecha: body.fecha, nota: nota.valor } };
}

function validarNota(nota) {
  if (nota == null || nota === "") return { valor: null };
  if (typeof nota !== "string" || nota.trim().length > 300) return { error: "La nota puede tener hasta 300 caracteres." };
  return { valor: nota.trim() || null };
}
