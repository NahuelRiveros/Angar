// Políticas de este cliente, compartidas por la API y el navegador; nunca incluir secretos.
export const clientConfig = {
  // Elige la marca de frontend/src/proyecto/config/brand_config.js.
  id: "ejemplo",
  // SIS-56: false = esta instalación no se cobra el software (sin bloqueo ni pantallas del plan).
  suscripcionDelSoftware: true,
  // publicRegistration: true si el proyecto tiene tienda y los clientes se registran solos.
  auth: { publicRegistration: false, passwordMinLength: 8, passwordMaxLength: 72, resetMinutes: 20, sesionClienteDias: 30, sesionPersonalHoras: 24 },
  // Catálogo y carrito de la tienda (las reglas del carrito del core leen estos límites).
  tienda: { publicCatalog: true, guestCart: true, pageSize: 24, maxQuantity: 9999, maxCartLines: 200, cartTtlDays: 30 },
  // Datos fiscales de quien factura (ver core/fiscal_config.js). [COMPLETAR] antes de facturar.
  // condicion_iva: "responsable_inscripto", "monotributista" o "exento"; null = no se sugiere factura.
  emisorFiscal: {
    condicion_iva: null,
    razon_social: null, // [COMPLETAR] como figura en ARCA
    domicilio_comercial: null, // [COMPLETAR] calle, número, localidad
    ingresos_brutos: null, // [COMPLETAR] número de IIBB o "Convenio Multilateral …"
    inicio_actividades: null, // [COMPLETAR] "AAAA-MM-DD"
  },
};
