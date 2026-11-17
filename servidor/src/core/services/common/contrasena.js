import { clientConfig } from "../../../../../proyecto/client_config.js";

const { passwordMinLength: MINIMO, passwordMaxLength: MAXIMO_BYTES } = clientConfig.auth;

// Misma regla para clientes y personal (USU-11, PER-20). El máximo va en bytes porque
// bcrypt ignora lo que pase de 72: dos contraseñas largas distintas valdrían igual.
export const MENSAJE_CONTRASENA = `La contraseña debe tener entre ${MINIMO} caracteres y ${MAXIMO_BYTES} bytes`;

export const contrasenaValida = (valor) =>
  typeof valor === "string" && valor.length >= MINIMO && Buffer.byteLength(valor, "utf8") <= MAXIMO_BYTES;
