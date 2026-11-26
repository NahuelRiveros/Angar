// Módulos que viajan con el core y cada proyecto prende o apaga en proyecto/gate_config.js, y los
// tipos de proyecto que ofrece scripts/nuevo_proyecto.mjs. Lo usan el servidor, la web y los scripts.
// Spec: docs/specs/core/modulos.md.
//
// `prefijo`: el de sus tablas (MOD-07). `requiere`: módulos sin los que no funciona. `disponible`:
// false hasta que el módulo exista en el core. `permisos`: { grupos, permisos }, con la misma forma
// que los de un rubro (ver proyecto/permisos_rubros.js); `subeImagenes` habilita además subir fotos.
const PERMISOS_CATALOGO = {
  grupos: [{ codigo: "mod_catalogo", nombre: "Catálogo" }],
  permisos: [{ codigo: "catalogo.editar", grupo: "mod_catalogo", nombre: "Editar catálogo", descripcion: "Productos, opciones, precios, fotos y categorías.", porDefecto: ["supervisor"], subeImagenes: true }],
};

const PERMISOS_STOCK = {
  grupos: [{ codigo: "mod_stock", nombre: "Stock" }],
  permisos: [{ codigo: "stock.mover", grupo: "mod_stock", nombre: "Mover stock", descripcion: "Ver cantidades, cargar entradas, salidas y ajustes, y elegir qué se controla.", porDefecto: ["supervisor"] }],
};

const PERMISOS_PEDIDOS = {
  grupos: [{ codigo: "mod_pedidos", nombre: "Pedidos" }],
  permisos: [
    { codigo: "pedidos.ver", grupo: "mod_pedidos", nombre: "Ver pedidos", descripcion: "Lista y detalle de los pedidos, con los datos de contacto.", porDefecto: ["supervisor", "vendedor"] },
    { codigo: "pedidos.gestionar", grupo: "mod_pedidos", nombre: "Gestionar pedidos", descripcion: "Confirmar, preparar, entregar, cancelar y reabrir pedidos.", porDefecto: ["supervisor"], requiere: ["pedidos.ver"] },
  ],
};

export const MODULOS_OPCIONALES = [
  { codigo: "catalogo", nombre: "Catálogo", descripcion: "Categorías, marcas, productos, variantes y fotos.", prefijo: "cat_", requiere: [], permisos: PERMISOS_CATALOGO },
  { codigo: "stock", nombre: "Stock", descripcion: "Cantidades, mínimos y movimientos.", prefijo: "stk_", requiere: ["catalogo"], permisos: PERMISOS_STOCK },
  { codigo: "pedidos", nombre: "Pedidos", descripcion: "Carrito, pedidos, estados y seguimiento.", prefijo: "ped_", requiere: ["catalogo"], permisos: PERMISOS_PEDIDOS },
  { codigo: "cobros", nombre: "Cobros", descripcion: "Pagos parciales, transferencias y comprobantes.", prefijo: "cob_", requiere: ["pedidos"], disponible: false },
  { codigo: "turnos", nombre: "Turnos", descripcion: "Horarios, cupos, agenda y seguimiento.", prefijo: "tur_", requiere: [], disponible: false },
  { codigo: "suscripciones", nombre: "Suscripciones", descripcion: "Planes, vencimientos y pagos de socios.", prefijo: "sus_", requiere: [], disponible: false },
];

// Punto de partida de un proyecto nuevo: después se prende o apaga cualquiera en gate_config.js.
export const TIPOS_PROYECTO = {
  base: { nombre: "Solo usuarios, permisos y panel", modulos: [] },
  catalogo: { nombre: "Catálogo con consulta", modulos: ["catalogo"] },
  ecommerce: { nombre: "Tienda con carrito y pedidos", modulos: ["catalogo", "pedidos", "cobros"] },
  distribuidora: { nombre: "Venta mayorista con stock", modulos: ["catalogo", "stock", "pedidos", "cobros"] },
  turnos: { nombre: "Agenda de turnos", modulos: ["turnos"] },
  turnos_y_catalogo: { nombre: "Agenda de turnos y catálogo", modulos: ["catalogo", "turnos"] },
  gimnasio: { nombre: "Socios con plan y venta en el local", modulos: ["catalogo", "stock", "suscripciones"] },
};

/** Los códigos pedidos y todo lo que necesitan, cada uno después de lo que necesita (MOD-06). */
export function conLoQueNecesitan(codigos, modulos = MODULOS_OPCIONALES) {
  const porCodigo = new Map(modulos.map((m) => [m.codigo, m]));
  const orden = new Set();
  const sumar = (codigo, camino = []) => {
    if (camino.includes(codigo)) throw new Error(`Módulos que se necesitan en círculo: ${[...camino, codigo].join(" → ")}.`);
    for (const requerido of porCodigo.get(codigo)?.requiere ?? []) sumar(requerido, [...camino, codigo]);
    orden.add(codigo);
  };
  // Se recorre en el orden de la lista para que el resultado no dependa de cómo se escribió.
  for (const { codigo } of modulos) if (codigos.includes(codigo)) sumar(codigo);
  return [...orden];
}

/**
 * Qué módulos opcionales prende un gate_config: `activos` (códigos, en orden de carga) y `problemas`
 * (textos). Un módulo con problemas queda afuera de `activos`, igual que los que dependen de él.
 */
export function resolverModulos(projectModules = {}, modulos = MODULOS_OPCIONALES) {
  const porCodigo = new Map(modulos.map((m) => [m.codigo, m]));
  const prendidos = modulos.filter((m) => projectModules[m.codigo]).map((m) => m.codigo);
  const activos = [];
  const problemas = [];
  for (const codigo of conLoQueNecesitan(prendidos, modulos)) {
    if (!prendidos.includes(codigo)) continue;
    const { nombre, requiere, disponible } = porCodigo.get(codigo);
    const faltan = requiere.filter((r) => !prendidos.includes(r));
    if (disponible === false) problemas.push(`El módulo "${codigo}" (${nombre}) todavía no está en esta versión del core: dejalo en false en proyecto/gate_config.js.`);
    if (faltan.length) problemas.push(`El módulo "${codigo}" (${nombre}) necesita: ${faltan.join(", ")}. Prendé lo que falta en proyecto/gate_config.js.`);
    if (disponible !== false && requiere.every((r) => activos.includes(r))) activos.push(codigo);
  }
  return { activos, problemas };
}

/**
 * Permisos de los módulos opcionales: los de los prendidos se suman a la lista del panel; los códigos
 * de los apagados se devuelven aparte para no borrar lo que ya se haya tildado (MOD-03).
 */
export function permisosOpcionales(projectModules = {}, modulos = MODULOS_OPCIONALES) {
  const { activos } = resolverModulos(projectModules, modulos);
  const prendidos = modulos.filter((m) => activos.includes(m.codigo));
  const apagados = modulos.filter((m) => !activos.includes(m.codigo));
  return {
    grupos: prendidos.flatMap((m) => m.permisos?.grupos ?? []),
    permisos: prendidos.flatMap((m) => m.permisos?.permisos ?? []),
    codigosApagados: apagados.flatMap((m) => (m.permisos?.permisos ?? []).map((p) => p.codigo)),
  };
}

/** El contenido de proyecto/gate_config.js con todos los módulos a la vista (MOD-10, MOD-11). */
export function textoGateConfig(prendidos = [], modulos = MODULOS_OPCIONALES) {
  const ancho = Math.max(...modulos.map((m) => m.codigo.length)) + 1;
  const lineas = modulos.map((m) => {
    const notas = [m.descripcion, m.requiere.length && `Necesita: ${m.requiere.join(", ")}.`, m.disponible === false && "Todavía no disponible."];
    return `  ${`${m.codigo}:`.padEnd(ancho)} ${`${prendidos.includes(m.codigo)},`.padEnd(6)} // ${notas.filter(Boolean).join(" ")}`;
  });
  return [
    "// Qué tiene este proyecto. true prende el módulo entero (tablas, rutas, menús y permisos); false lo",
    "// oculta sin borrar datos. Los módulos opcionales vienen con el core (core/modulos_opcionales.js).",
    "// Los rubros propios se suman al final con el código de su carpeta. Ejemplo: mi_rubro: true.",
    "export const projectModules = {",
    ...lineas,
    "};",
    "",
  ].join("\n");
}
