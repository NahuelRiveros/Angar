// Cómo pagan los organizadores su plan. Lo leen la API y la interfaz; nunca incluir secretos
// (el token de MercadoPago va en el .env del servidor).
export const cobroConfig = {
  // Programado y probado, pero apagado: hoy se cobra por transferencia. Para activarlo,
  // poner true y cargar MP_ACCESS_TOKEN y PRECIO_SUSCRIPCION_MENSUAL en el servidor.
  mercadoPagoHabilitado: false,

  // Datos que ve el organizador para transferir. [COMPLETAR] con los reales antes de publicar:
  // mientras quede alguno entre corchetes, la pantalla avisa que todavía no se puede transferir.
  transferencia: {
    titular: "[COMPLETAR titular de la cuenta]",
    banco: "[COMPLETAR banco]",
    cbu: "[COMPLETAR CBU o CVU]",
    alias: "[COMPLETAR alias]",
    cuit: "[COMPLETAR CUIT del titular]",
  },

  comprobante: {
    maxBytes: 5 * 1024 * 1024,
    formatos: ["jpg", "png", "webp", "pdf"],
  },
};

const esPlaceholder = (valor) => /^\[.*\]$/.test(String(valor ?? "").trim());

/** true si todos los datos bancarios están cargados (ninguno quedó como [COMPLETAR]). */
export const transferenciaLista = () => Object.values(cobroConfig.transferencia).every((v) => v && !esPlaceholder(v));
