import { getEnlaceComprobante } from "../api/plan_api.js";
import { abrirEnPestania } from "../utils/abrir_en_pestania.js";

/** Comprobante de un pago de la suscripción, en otra pestaña. */
export const abrirComprobante = (pagoId) => abrirEnPestania(() => getEnlaceComprobante(pagoId));
