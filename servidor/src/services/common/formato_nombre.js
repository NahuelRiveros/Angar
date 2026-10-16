// Formato único para nombres del catálogo (familias, categorías, artículos y marcas):
// "pan dulce" → "Pan Dulce", sin romper lo que se escribió a propósito
// ("X5", "UHT", "20x200g") ni las palabras cortas o unidades ("9 de Oro", "12x1 lts").
// Las comparaciones (duplicados, importación) ya se hacen en minúscula, así que
// el formato solo cambia cómo se ve, no cómo se encuentra.

const PALABRAS_MENORES = new Set(["a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "lo", "los", "o", "para", "por", "sin", "u", "x", "y"]);
const UNIDADES = new Set(["cc", "cm", "g", "gr", "grs", "kg", "kgs", "l", "lt", "lts", "m", "mg", "ml", "mm", "oz", "uds", "un", "unid"]);

const tieneMinuscula = (texto) => /\p{Ll}/u.test(texto);
const tieneMayuscula = (texto) => /\p{Lu}/u.test(texto);
const tieneDigito = (texto) => /\d/.test(texto);
const nucleo = (palabra) => palabra.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, "");

export function formatearNombre(texto) {
  const limpio = String(texto ?? "").trim().replace(/\s+/g, " ");
  if (!limpio) return limpio;
  // Un texto entero en MAYÚSCULAS (típico de sistemas de gestión) no dice qué
  // mayúsculas son a propósito: se trata como minúscula, salvo códigos tipo "X5".
  const todoMayusculas = tieneMayuscula(limpio) && !tieneMinuscula(limpio);

  return limpio.split(" ").map((original, i) => {
    let palabra = original;
    if (todoMayusculas && !(tieneDigito(palabra) && /^\p{L}/u.test(nucleo(palabra)))) palabra = palabra.toLocaleLowerCase("es");
    if (tieneMayuscula(palabra) || tieneDigito(palabra)) return palabra;
    const base = nucleo(palabra);
    if (UNIDADES.has(base) || (i > 0 && PALABRAS_MENORES.has(base))) return palabra;
    return palabra.replace(/\p{L}/u, (letra) => letra.toLocaleUpperCase("es"));
  }).join(" ");
}

// Clave para comparar marcas: "BAGLEY", "Bagley" y "Bag-ley" son la misma.
// Igual que frontend/src/modules/eccomerce_distribuidora/utils/marcas.js.
export const claveMarca = (marca) => String(marca ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
