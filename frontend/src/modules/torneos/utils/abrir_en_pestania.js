/**
 * Abre en otra pestaña un enlace que hay que pedirle al servidor (por ejemplo, un comprobante
 * con enlace firmado). La pestaña se abre en el mismo clic (si se abre después de esperar al
 * servidor, el navegador la bloquea) y recién después recibe la dirección.
 */
export async function abrirEnPestania(obtenerEnlace) {
  const pestania = window.open("", "_blank");
  try {
    const { url } = await obtenerEnlace();
    if (pestania) pestania.location.href = url;
    else window.location.assign(url);
  } catch (error) {
    pestania?.close();
    throw error;
  }
}
