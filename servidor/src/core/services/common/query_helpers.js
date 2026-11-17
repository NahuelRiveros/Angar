import { Op } from "sequelize";

/** Filtra `obj` dejando solo las claves listadas en `campos` (allowlist contra mass assignment). */
export function pick(obj = {}, campos = []) {
  const out = {};
  for (const campo of campos) {
    if (obj[campo] !== undefined) out[campo] = obj[campo];
  }
  return out;
}

/** Arma un WHERE de búsqueda tipo ILIKE sobre los campos permitidos. Devuelve null si no aplica. */
export function armarBusquedaTexto(campos = [], q) {
  const texto = String(q ?? "").trim();
  if (!texto || campos.length === 0) return null;

  return {
    [Op.or]: campos.map((campo) => ({ [campo]: { [Op.iLike]: `%${texto}%` } })),
  };
}

/** Primer carácter en mayúscula, el resto tal cual (no toca acentos/ñ). */
export function capitalizar(texto) {
  const limpio = String(texto ?? "").trim();
  if (!limpio) return limpio;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}
