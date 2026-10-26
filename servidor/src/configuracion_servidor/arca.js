import { env } from "./env.js";
import { cuitValido, fiscalConfig } from "../../../fiscal_config.js";

/**
 * Configuración de la facturación electrónica de ARCA (ex AFIP). Solo servidor:
 * el certificado y la clave privada permiten facturar a nombre de la distribuidora,
 * así que nunca viajan al navegador ni se escriben en logs.
 *
 * Todavía no hay servicio que facture (ver docs/facturacion-arca.md). Esto deja
 * listos los datos y las direcciones para cuando se programe.
 */

// Direcciones oficiales de los servicios web. Homologación = pruebas, sin valor fiscal.
// Confirmarlas con la documentación vigente de ARCA antes de usarlas.
const SERVICIOS = {
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
};

/** Datos públicos de la configuración (sin certificado ni clave), leídos del entorno en cada llamada. */
export function arcaConfig() {
  const ambiente = env.ARCA_PRODUCCION ? "produccion" : "homologacion";
  return {
    ambiente,
    urls: SERVICIOS[ambiente],
    // Solo números, como lo piden los servicios.
    cuitEmisor: String(env.ARCA_CUIT_EMISOR ?? "").replace(/\D/g, ""),
    puntoVenta: Number(env.ARCA_PUNTO_VENTA) || null,
    // Servicio que se autoriza en WSAA: factura electrónica de mercado interno.
    servicio: "wsfe",
  };
}

/**
 * Qué falta para poder facturar. Devuelve solo NOMBRES (nunca valores), así se puede
 * mostrar en un log o en el panel sin exponer secretos.
 */
export function estadoArca() {
  const { ambiente, cuitEmisor, puntoVenta } = arcaConfig();
  const faltan = [];
  if (!cuitValido(cuitEmisor)) faltan.push("ARCA_CUIT_EMISOR");
  if (!Number.isInteger(puntoVenta) || puntoVenta < 1 || puntoVenta > 99998) faltan.push("ARCA_PUNTO_VENTA");
  if (!env.ARCA_CERTIFICADO_PEM) faltan.push("ARCA_CERTIFICADO_PEM");
  if (!env.ARCA_CLAVE_PRIVADA_PEM) faltan.push("ARCA_CLAVE_PRIVADA_PEM");
  if (!fiscalConfig.emisor.condicion_iva) faltan.push("fiscal_config.js → emisor.condicion_iva");
  return { listo: faltan.length === 0, ambiente, faltan };
}

// En Render los PEM se cargan en base64 (una sola línea); en local se aceptan tal cual.
function leerPem(valor, nombre) {
  const texto = String(valor ?? "").trim();
  const pem = texto.startsWith("-----BEGIN") ? texto : Buffer.from(texto, "base64").toString("utf8");
  if (!pem.startsWith("-----BEGIN")) throw new Error(`${nombre} no es un PEM válido (ni en texto ni en base64).`);
  return pem;
}

/** Certificado y clave para firmar el pedido a WSAA. Se lee solo al facturar, no al arrancar. */
export function credencialesArca() {
  const { listo, faltan } = estadoArca();
  if (!listo) throw new Error(`Facturación ARCA sin configurar. Faltan: ${faltan.join(", ")}.`);
  return {
    certificado: leerPem(env.ARCA_CERTIFICADO_PEM, "ARCA_CERTIFICADO_PEM"),
    clavePrivada: leerPem(env.ARCA_CLAVE_PRIVADA_PEM, "ARCA_CLAVE_PRIVADA_PEM"),
  };
}
