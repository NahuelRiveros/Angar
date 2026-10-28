import { env } from "../../configuracion_servidor/env.js";
import { Usuario, Persona } from "../../models/index.js";
import { enviarEmail, mailConfigured } from "./mail_service.js";
import { armarAviso, destinoValido } from "./avisos_reglas.js";

const activos = () => env.AVISOS_POR_CORREO && mailConfigured();

/** Nombre y email de la cuenta, para escribirle o para contar quién hizo algo. */
export async function contactoDeUsuario(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId, { attributes: ["persona_id"] });
  const persona = usuario && await Persona.findByPk(usuario.persona_id, { attributes: ["nombre", "apellido", "email"] });
  return persona ? { nombre: `${persona.nombre ?? ""} ${persona.apellido ?? ""}`.trim(), email: persona.email } : null;
}

/**
 * Manda un aviso en segundo plano: no se espera ni puede romper lo que lo disparó (anotarse,
 * mandar un comprobante…). `preparar` arma { para, datos } y puede consultar la base; si
 * devuelve null o un destino de prueba, no se manda nada. Los errores solo quedan en el log.
 */
export function avisarSinEsperar(tipo, preparar, { enviar = enviarEmail } = {}) {
  if (!activos()) return;
  Promise.resolve()
    .then(preparar)
    .then((aviso) => {
      if (!aviso || !destinoValido(aviso.para)) return;
      return enviar({ to: aviso.para.trim(), ...armarAviso(tipo, aviso.datos, env.VERCEL_FRONTEND_URL) });
    })
    .catch((e) => console.error(`No se pudo mandar el aviso "${tipo}":`, e.message));
}
