// Etiquetas y colores de cada estado del plan (los calcula el servidor).
export const ESTADOS_PLAN = {
  prueba: { etiqueta: "Prueba gratis", clase: "bg-sky-50 text-sky-800 ring-sky-200" },
  activo: { etiqueta: "Activo", clase: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  por_vencer: { etiqueta: "Por vencer", clase: "bg-amber-50 text-amber-900 ring-amber-200" },
  vencido: { etiqueta: "Vencido", clase: "bg-red-50 text-red-800 ring-red-200" },
};

export const ORIGENES_PAGO = { mercadopago: "MercadoPago", transferencia: "Transferencia", manual: "Extensión manual", ajuste: "Ajuste de fecha" };

export const ESTADOS_PAGO = {
  aprobado: "Aprobado", pendiente: "En revisión", rechazado: "Rechazado",
  monto_insuficiente: "Monto distinto al precio", sin_plan: "Sin plan",
};

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const formatearPesos = (monto) => (monto == null ? "—" : pesos.format(Number(monto)));

// creado_en es un instante (UTC): se muestra el día que era en Argentina.
const diaArgentina = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" });
export const formatearMomento = (instante) => (instante ? diaArgentina.format(new Date(instante)) : "");

// Clave de las transferencias del panel: la pestaña cuenta las pendientes con la misma consulta.
export const claveTransferencias = (filtros) => ["suscripciones", "transferencias", filtros];
