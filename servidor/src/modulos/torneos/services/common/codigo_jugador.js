import { randomInt } from "node:crypto";

// Sin 0/O, 1/I/L ni U: se dicta por teléfono o se copia de una foto sin confundirse.
const LETRAS = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const LARGO = 5;

/** "MP-7K3QX": código público para invitar a un compañero y ver su perfil. */
export function generarCodigoJugador(azar = randomInt) {
  let codigo = "";
  for (let i = 0; i < LARGO; i += 1) codigo += LETRAS[azar(0, LETRAS.length)];
  return `MP-${codigo}`;
}

/** Acepta "mp-7k3qx", "7K3QX" o con espacios; devuelve "MP-7K3QX" o null si no es un código posible. */
export function normalizarCodigoJugador(valor) {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toUpperCase().replace(/\s+/g, "").replace(/^MP-?/, "");
  return new RegExp(`^[${LETRAS}]{${LARGO}}$`).test(limpio) ? `MP-${limpio}` : null;
}
