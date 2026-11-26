// MOD-15: lo que cada proyecto puede cambiar de la tienda sin tocar los módulos, en
// proyecto/tienda_config.js (opcional). Lo leen el servidor y la web. Sin ese archivo, valen estos.
// Spec: docs/specs/core/pedidos.md.
export const ENTREGAS = ["retiro", "envio"];

export const TIENDA_POR_DEFECTO = {
  // MPE-06: true = para enviar un pedido hay que ingresar.
  exigirCuenta: false,
  // MPE-12: las formas de entrega que se ofrecen, en este orden.
  entregas: ["retiro", "envio"],
  textos: {
    retiro: "Retira en el local",
    envio: "Envío a coordinar",
    avisoEnvio: "Coordinamos el envío con vos por WhatsApp.",
    pieFormulario: "No pagás nada ahora: te contactamos para confirmar.",
  },
};

/** Las opciones del proyecto sobre las de siempre, y lo que esté mal escrito (el servidor no arranca). */
export function opcionesTienda(propias = {}) {
  const problemas = [];
  const conocidas = Object.keys(TIENDA_POR_DEFECTO);
  for (const clave of Object.keys(propias)) if (!conocidas.includes(clave)) problemas.push(`tienda_config.js: "${clave}" no es una opción. Las que hay: ${conocidas.join(", ")}.`);
  const opciones = { ...TIENDA_POR_DEFECTO, ...propias, textos: { ...TIENDA_POR_DEFECTO.textos, ...propias.textos } };
  if (typeof opciones.exigirCuenta !== "boolean") problemas.push("tienda_config.js: exigirCuenta va true o false.");
  const entregas = opciones.entregas;
  if (!Array.isArray(entregas) || !entregas.length || entregas.some((e) => !ENTREGAS.includes(e)) || new Set(entregas).size !== entregas.length) {
    problemas.push(`tienda_config.js: entregas es una lista con al menos una de ${ENTREGAS.map((e) => `"${e}"`).join(" y ")}, sin repetir.`);
  }
  for (const [clave, texto] of Object.entries(opciones.textos)) {
    if (!(clave in TIENDA_POR_DEFECTO.textos)) problemas.push(`tienda_config.js: textos.${clave} no es un texto que se use.`);
    else if (typeof texto !== "string") problemas.push(`tienda_config.js: textos.${clave} tiene que ser un texto (o "" para no mostrarlo).`);
  }
  return { opciones, problemas };
}
