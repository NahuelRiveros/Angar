import { http } from "./http";

export async function getEstadoSuscripcion() {
  const r = await http.get("/suscripcion/estado");
  return r.data;
}

export async function crearPagoSuscripcion() {
  const r = await http.post("/suscripcion/crear-pago");
  return r.data;
}

export async function getHistorialPagos() {
  const r = await http.get("/suscripcion/pagos");
  return r.data;
}

// ── Super Admin ──────────────────────────────────────────────────────────────
export async function getSuperEstadoSuscripcion() {
  const r = await http.get("/suscripcion/super/estado");
  return r.data;
}

export async function superExtenderSuscripcion(dias) {
  const r = await http.post("/suscripcion/super/extender", { dias });
  return r.data;
}

export async function superFijarFechaSuscripcion(fecha) {
  const r = await http.post("/suscripcion/super/fijar", { fecha });
  return r.data;
}
