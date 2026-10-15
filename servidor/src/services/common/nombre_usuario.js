// Sin "@" a propósito: así el login distingue un usuario de un email sin consultar la base.
export const NOMBRE_USUARIO_REGEX = /^[a-z0-9._-]{3,30}$/;

// No distingue mayúsculas: "Juan.P" y "juan.p" son la misma cuenta.
export function normalizarNombreUsuario(valor) {
  return String(valor ?? "").trim().toLowerCase();
}

export function esNombreUsuarioValido(valor) {
  return NOMBRE_USUARIO_REGEX.test(normalizarNombreUsuario(valor));
}

/** Lo que se escribe en "Email o usuario": con "@" es un email; si no, un nombre de usuario. */
export function clasificarIdentificador(valor) {
  const normalizado = normalizarNombreUsuario(valor);
  if (normalizado.includes("@")) return { tipo: "email", valor: normalizado };
  return { tipo: "usuario", valor: normalizado, valido: NOMBRE_USUARIO_REGEX.test(normalizado) };
}
