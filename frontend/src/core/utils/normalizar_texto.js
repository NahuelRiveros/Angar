const REEMPLAZOS_MOJIBAKE = [
  [/acompa�ar/g, "acompañar"],
  [/Acompa�ar/g, "Acompañar"],
  [/recuperaci�n/g, "recuperación"],
  [/Recuperaci�n/g, "Recuperación"],
  [/Kinesiolog�a/g, "Kinesiología"],
  [/kinesiolog�a/g, "kinesiología"],
  [/^ntrenamiento/g, "Entrenamiento"],
  [/Kinesiolog(?:�a|Ã­a|ía|ia)/g, "Kinesiología"],
  [/kinesiolog(?:�a|Ã­a|ía|ia)/g, "kinesiología"],
  [/Gimnasio & Kinesiologia/g, "Gimnasio & Kinesiología"],
  [/Gimnasio y Kinesiologia/g, "Gimnasio y Kinesiología"],
  [/Â·/g, "·"],
  [/â€”/g, "-"],
  [/â€“/g, "-"],
  [/Ã¡/g, "á"],
  [/Ã©/g, "é"],
  [/Ã­/g, "í"],
  [/Ã³/g, "ó"],
  [/Ãº/g, "ú"],
  [/Ã±/g, "ñ"],
  [/Ã/g, "Á"],
  [/Ã‰/g, "É"],
  [/Ã/g, "Í"],
  [/Ã“/g, "Ó"],
  [/Ãš/g, "Ú"],
  [/Ã‘/g, "Ñ"],
];

export function normalizarTexto(valor) {
  if (typeof valor !== "string") return valor;
  return REEMPLAZOS_MOJIBAKE.reduce(
    (texto, [patron, reemplazo]) => texto.replace(patron, reemplazo),
    valor,
  );
}

export function normalizarTextosProfundo(valor) {
  if (typeof valor === "string") return normalizarTexto(valor);
  if (Array.isArray(valor)) return valor.map(normalizarTextosProfundo);
  if (!valor || typeof valor !== "object") return valor;

  return Object.fromEntries(
    Object.entries(valor).map(([clave, contenido]) => [clave, normalizarTextosProfundo(contenido)]),
  );
}
