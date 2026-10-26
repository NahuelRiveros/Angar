// Datos fiscales compartidos por la API y la interfaz: qué condición de IVA tiene
// cada cliente, qué documento corresponde y qué factura le toca. Base para la
// facturación electrónica de ARCA (ver docs/facturacion-arca.md); hoy se usa para
// validar el perfil y sugerirle al equipo qué comprobante emitir.
export const fiscalConfig = {
  // Condición de la DISTRIBUIDORA frente al IVA: define si factura A/B o C.
  // [COMPLETAR] con la del cliente ("responsable_inscripto", "monotributista" o "exento").
  // Mientras sea null no se sugiere tipo de factura.
  // El resto no viaja a ARCA: lo tiene que mostrar el PDF de la factura. No son secretos
  // (van impresos en cada factura), por eso viven acá y no en variables de entorno.
  emisor: {
    condicion_iva: null,
    razon_social: null, // [COMPLETAR] como figura en ARCA
    domicilio_comercial: null, // [COMPLETAR] calle, número, localidad
    ingresos_brutos: null, // [COMPLETAR] número de IIBB o "Convenio Multilateral …"
    inicio_actividades: null, // [COMPLETAR] "AAAA-MM-DD"
  },
  // `documento`: "cuit" exige CUIT; "cuit_o_dni" acepta también DNI (consumidor final).
  // `codigoArca`: CondicionIVAReceptorId del servicio de facturación (FEParamGetCondicionIvaReceptor).
  condicionesIva: [
    { value: "responsable_inscripto", label: "Responsable Inscripto", documento: "cuit", codigoArca: 1 },
    { value: "monotributista", label: "Monotributista", documento: "cuit", codigoArca: 6 },
    { value: "exento", label: "Exento", documento: "cuit", codigoArca: 4 },
    { value: "consumidor_final", label: "Consumidor Final", documento: "cuit_o_dni", codigoArca: 5 },
  ],
};

// Prefijos que asigna ARCA: personas (20, 23, 24, 27), empresas (30, 33, 34).
const PREFIJOS_CUIT = ["20", "23", "24", "27", "30", "33", "34"];
const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const soloDigitos = (valor) => String(valor ?? "").replace(/\D/g, "");

/** CUIT de 11 números con prefijo conocido y dígito verificador correcto (acepta guiones o espacios). */
export function cuitValido(valor) {
  const cuit = soloDigitos(valor);
  if (cuit.length !== 11 || !PREFIJOS_CUIT.includes(cuit.slice(0, 2))) return false;
  const suma = PESOS_CUIT.reduce((total, peso, i) => total + peso * Number(cuit[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto;
  return verificador !== 10 && verificador === Number(cuit[10]);
}

export const dniValido = (valor) => /^\d{7,8}$/.test(soloDigitos(valor)) && Number(soloDigitos(valor)) >= 1000000;

/** Forma guardada: CUIT "20-12345678-6"; DNI solo números. Si no es ninguno, el texto tal cual. */
export function normalizarDocumento(valor) {
  const digitos = soloDigitos(valor);
  if (cuitValido(digitos)) return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
  if (dniValido(digitos)) return digitos;
  return String(valor ?? "").trim();
}

export const condicionIva = (codigo) => fiscalConfig.condicionesIva.find((c) => c.value === codigo) ?? null;

/** Qué falta o está mal en los datos fiscales del cliente, o null si alcanzan para facturar. */
export function problemaFiscal({ condicion_iva, cuit } = {}) {
  const condicion = condicionIva(condicion_iva);
  if (!condicion) return "Elegí tu condición frente al IVA.";
  if (condicion.documento === "cuit_o_dni") {
    return cuitValido(cuit) || dniValido(cuit) ? null : "Ingresá un CUIT o DNI válido (solo números o con guiones).";
  }
  return cuitValido(cuit) ? null : "Ingresá un CUIT válido de 11 números, ej: 20-12345678-6. Revisá el último número.";
}

/**
 * Factura que corresponde según la condición del emisor y la del cliente:
 * un responsable inscripto emite A a inscriptos y monotributistas, y B al resto;
 * un monotributista o exento emite siempre C. null si falta algún dato.
 */
export function tipoFacturaSugerida(condicionCliente, condicionEmisor = fiscalConfig.emisor.condicion_iva) {
  if (!condicionIva(condicionCliente) || !condicionEmisor) return null;
  if (condicionEmisor !== "responsable_inscripto") return "C";
  return ["responsable_inscripto", "monotributista"].includes(condicionCliente) ? "A" : "B";
}
