import { getEnlaceComprobante } from "../../api/suscripcion_api.js";

/**
 * Abre el comprobante en otra pestaña. La pestaña se abre en el mismo clic (si se abre
 * después de esperar al servidor, el navegador la bloquea) y recién después recibe el enlace.
 */
export async function abrirComprobante(pagoId) {
  const pestania = window.open("", "_blank");
  try {
    const { url } = await getEnlaceComprobante(pagoId);
    if (pestania) pestania.location.href = url;
    else window.location.assign(url);
  } catch (error) {
    pestania?.close();
    throw error;
  }
}
