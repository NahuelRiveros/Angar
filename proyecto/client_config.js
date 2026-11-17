// Políticas de MiPadel, compartidas por la API y el navegador; nunca incluir secretos.
export const clientConfig = {
  // Elige la marca de frontend/src/proyecto/config/brand_config.js.
  id: "mipadel",
  // SIS-56: MiPadel es producto propio: no se cobra el software. Lo que pagan los organizadores es
  // su plan, que vive en el rubro torneos (/api/plan-organizador).
  suscripcionDelSoftware: false,
  // Jugadores y organizadores se registran solos.
  auth: { publicRegistration: true, passwordMinLength: 8, passwordMaxLength: 72, resetMinutes: 20, sesionClienteDias: 30, sesionPersonalHoras: 24 },
  // Sin tienda: el core lo lee, pero MiPadel no tiene catálogo ni carrito.
  tienda: { publicCatalog: false, guestCart: false, pageSize: 24, maxQuantity: 9999, maxCartLines: 200, cartTtlDays: 30 },
  // MiPadel no factura por ARCA.
  emisorFiscal: {
    condicion_iva: null,
    razon_social: null,
    domicilio_comercial: null,
    ingresos_brutos: null,
    inicio_actividades: null,
  },
};
