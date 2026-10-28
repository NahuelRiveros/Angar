import { LIMITES } from "../../../../torneo_config.js";

// Monto de inscripción en un campo de texto: mismas reglas que el servidor (torneo_reglas.js),
// hasta 2 decimales y se acepta la coma.
const comoNumero = (v) => Number(v.replace(",", "."));
export const esMontoValido = (v) => v === "" || (/^\d+([.,]\d{1,2})?$/.test(v) && comoNumero(v) > 0 && comoNumero(v) <= LIMITES.montoMaximo);
export const montoParaEnviar = (v) => (v === "" ? "" : v.replace(",", "."));
export const MENSAJE_MONTO = "Un monto en pesos mayor a 0 (ej. 20000), o vacío.";
