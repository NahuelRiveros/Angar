import { OAuth2Client } from "google-auth-library";
import { env } from "../../configuracion_servidor/env.js";

const cliente = new OAuth2Client();

/**
 * Verifica con Google el comprobante (ID token) que recibió el navegador: firma,
 * vencimiento y que fue emitido para NUESTRO Client ID. Lanza error si no es válido.
 */
export async function verificarCredencialGoogle(credencial) {
  const ticket = await cliente.verifyIdToken({ idToken: String(credencial ?? ""), audience: env.GOOGLE_CLIENT_ID });
  const datos = ticket.getPayload();
  return {
    google_id: datos.sub,
    email: datos.email,
    email_verificado: datos.email_verified === true,
    nombre: datos.given_name ?? datos.name ?? "",
    apellido: datos.family_name ?? "",
  };
}
