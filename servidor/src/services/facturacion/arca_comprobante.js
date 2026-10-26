import { condicionIva, cuitValido, dniValido, fiscalConfig, tipoFacturaSugerida } from "../../../../fiscal_config.js";

/**
 * Arma el comprobante que se le pide a ARCA (FECAESolicitar → FeCabReq/FeDetReq)
 * a partir de un pedido de DistribuCG. PREPARADO, todavía sin integrar: no llama a
 * ARCA, no toca la base y ninguna ruta lo usa. Ver docs/facturacion-arca.md.
 *
 * Los nombres de los campos son los de ARCA, para mapearlos directo al servicio.
 * Códigos según las tablas FEParamGet...; confirmarlos con la documentación vigente.
 */

export const TIPO_COMPROBANTE = { A: 1, B: 6, C: 11 };
export const TIPO_DOCUMENTO = { CUIT: 80, DNI: 96, SIN_IDENTIFICAR: 99 };
// Alícuota (%) → Id de ARCA.
export const ALICUOTAS_IVA = { 0: 3, 2.5: 9, 5: 8, 10.5: 4, 21: 5, 27: 6 };

const centavos = (n) => Math.round(Number(n) * 100);
const pesos = (c) => c / 100;

/**
 * Agrupa las líneas por alícuota y separa neto e IVA de cada grupo. Los precios
 * guardados son FINALES: neto = total / (1 + alícuota) redondeado, IVA = total - neto,
 * así neto + IVA coincide al centavo con lo que pagó el cliente.
 */
export function desglosarIva(items) {
  const porAlicuota = new Map();
  for (const item of items) {
    if (item.iva_porcentaje === null || item.iva_porcentaje === undefined) {
      throw new Error(`"${item.nombre_producto}" no tiene la alícuota de IVA guardada (pedido anterior a la etapa 6): no se puede facturar automáticamente.`);
    }
    const porcentaje = Number(item.iva_porcentaje);
    if (!(porcentaje in ALICUOTAS_IVA)) throw new Error(`Alícuota de IVA ${porcentaje} % sin código de ARCA.`);
    porAlicuota.set(porcentaje, (porAlicuota.get(porcentaje) ?? 0) + centavos(item.subtotal));
  }
  return [...porAlicuota.entries()].sort(([a], [b]) => b - a).map(([porcentaje, total]) => {
    const neto = Math.round(total / (1 + porcentaje / 100));
    return { porcentaje, total: pesos(total), neto: pesos(neto), iva: pesos(total - neto) };
  });
}

/** Documento del cliente: CUIT (80), DNI (96) o, si no hay, sin identificar (99, solo consumidor final). */
export function documentoReceptor(nota) {
  const digitos = String(nota.cuit ?? "").replace(/\D/g, "");
  if (cuitValido(digitos)) return { DocTipo: TIPO_DOCUMENTO.CUIT, DocNro: Number(digitos) };
  if (dniValido(digitos)) return { DocTipo: TIPO_DOCUMENTO.DNI, DocNro: Number(digitos) };
  if (nota.condicion_iva === "consumidor_final") return { DocTipo: TIPO_DOCUMENTO.SIN_IDENTIFICAR, DocNro: 0 };
  throw new Error("El cliente no tiene un CUIT válido para facturar.");
}

/** Fecha del comprobante en Argentina, formato AAAAMMDD. */
export function fechaArca(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(fecha).replaceAll("-", "");
}

/**
 * Comprobante listo para pedir el CAE. `numero` es el último autorizado + 1
 * (FECompUltimoAutorizado), que solo se sabe al momento de facturar.
 */
export function armarComprobante({ nota, items, numero, puntoVenta, fecha = new Date(), condicionEmisor = fiscalConfig.emisor.condicion_iva }) {
  const tipo = tipoFacturaSugerida(nota.condicion_iva, condicionEmisor);
  if (!tipo) throw new Error("Falta la condición frente al IVA del cliente o de la distribuidora.");
  if (!Number.isInteger(numero) || numero < 1) throw new Error("Número de comprobante inválido.");
  if (!Number.isInteger(puntoVenta) || puntoVenta < 1) throw new Error("Punto de venta inválido.");

  const alicuotas = desglosarIva(items);
  const total = alicuotas.reduce((s, a) => s + centavos(a.total), 0);
  if (total !== centavos(nota.total)) throw new Error("La suma de las líneas no coincide con el total del pedido.");
  const neto = alicuotas.reduce((s, a) => s + centavos(a.neto), 0);
  const discrimina = tipo !== "C"; // la factura C (monotributo/exento) no informa IVA

  return {
    FeCabReq: { CantReg: 1, PtoVta: puntoVenta, CbteTipo: TIPO_COMPROBANTE[tipo] },
    FeDetReq: [{
      Concepto: 1, // productos
      ...documentoReceptor(nota),
      CondicionIVAReceptorId: condicionIva(nota.condicion_iva).codigoArca,
      CbteDesde: numero, CbteHasta: numero, CbteFch: fechaArca(fecha),
      ImpTotal: pesos(total), ImpTotConc: 0, ImpOpEx: 0, ImpTrib: 0,
      ImpNeto: discrimina ? pesos(neto) : pesos(total),
      ImpIVA: discrimina ? pesos(total - neto) : 0,
      MonId: "PES", MonCotiz: 1,
      ...(discrimina ? { Iva: alicuotas.map((a) => ({ Id: ALICUOTAS_IVA[a.porcentaje], BaseImp: a.neto, Importe: a.iva })) } : {}),
    }],
    // Para mostrar y guardar junto al CAE; no viaja a ARCA.
    resumen: { tipo, alicuotas },
  };
}
