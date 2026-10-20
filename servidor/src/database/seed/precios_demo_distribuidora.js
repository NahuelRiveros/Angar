// Precios de DEMOSTRACIÓN para ver el catálogo armado mientras no llegan los precios reales.
// Son inventados: nunca se aplican en producción (esquema gc_dist).

export const ESQUEMA_PRODUCCION = "gc_dist";
export const PROPORCION_OFERTAS = 0.2;

// Rango de precio por familia (en pesos), para que golosinas no cuesten como herramientas.
export const RANGOS_FAMILIA = {
  "Golosinas": [300, 4500], "Snacks": [800, 5000], "Almacén": [700, 7000], "Bebidas": [1200, 18000],
  "Lácteos": [900, 8000], "Fiambres": [2000, 15000], "Congelados": [2500, 16000], "Panificados": [900, 7000],
  "Desayuno y Merienda": [1200, 12000], "Pastas Frescas y Tapas": [1200, 6000], "Alimentos Naturales": [1500, 9000],
  "Repostería": [600, 6000], "Limpieza": [900, 9000], "Perfumería": [1500, 15000], "Higiene Personal": [900, 12000],
  "Papelera": [800, 9000], "Bebés": [2500, 30000], "Mascotas": [2000, 35000], "Bazar": [1500, 20000],
  "Ferretería": [1500, 25000], "Librería": [400, 9000],
};
const RANGO_GENERAL = [800, 9000];

// Generador fijo por número (mulberry32): el mismo producto recibe siempre el mismo precio.
function aleatorio(semilla) {
  let t = (semilla + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const redondear10 = (n) => Math.round(n / 10) * 10;

export function precioDemo(productoId, familia) {
  const [min, max] = RANGOS_FAMILIA[familia] ?? RANGO_GENERAL;
  const precio = redondear10(min + aleatorio(productoId) * (max - min));
  const enOferta = aleatorio(productoId * 7919) < PROPORCION_OFERTAS;
  // Oferta: precio anterior entre 15 % y 35 % más alto, que el catálogo muestra tachado.
  const precio_anterior = enOferta ? redondear10(precio * (1.15 + aleatorio(productoId * 104729) * 0.2)) : null;
  return { precio, precio_anterior };
}

export function esquemaPermiteDemo(esquema) {
  return esquema !== ESQUEMA_PRODUCCION;
}

// Stock de demostración para presentaciones que controlan stock y están en 0.
export function stockDemo(variedadId) {
  return 20 + Math.floor(aleatorio(variedadId * 31337) * 181); // entre 20 y 200
}

/**
 * Deja todo el catálogo vigente (sin contar bajas) visible y pedible para una demo,
 * sobre los artículos que YA están en la base:
 *  1. Artículo sin presentación → se le crea una con precio de demostración, sin control de stock.
 *  2. Artículo con precio pero no disponible → se marca disponible (no se cambia su precio).
 *  3. Presentación que controla stock y está en 0 → se le carga stock de demostración.
 * Repetirlo no cambia nada.
 */
export async function aplicarPreciosDemo({ modelos, transaction, esquema }) {
  if (!esquemaPermiteDemo(esquema)) throw new Error(`Los precios de demostración no se aplican en el esquema de producción "${ESQUEMA_PRODUCCION}".`);
  const { ProductoDistribuidora, VariedadDistribuidora, CategoriaDistribuidora } = modelos;
  const [productos, variedades, categorias] = await Promise.all([
    ProductoDistribuidora.findAll({ where: { fecha_baja: null }, attributes: ["id", "categoria_id", "activo"], raw: true, transaction }),
    VariedadDistribuidora.findAll({ where: { fecha_baja: null }, attributes: ["id", "producto_id", "controla_stock", "cantidad"], raw: true, transaction }),
    CategoriaDistribuidora.findAll({ attributes: ["id", "nombre", "padre_id"], raw: true, transaction }),
  ]);
  const conPrecio = new Set(variedades.map((v) => v.producto_id));
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const familiaDe = (categoriaId) => {
    let categoria = porId.get(categoriaId);
    while (categoria?.padre_id != null) categoria = porId.get(categoria.padre_id);
    return categoria?.nombre;
  };
  const vigentes = new Set(productos.map((p) => p.id));
  const sinPrecio = productos.filter((p) => !conPrecio.has(p.id));
  const inactivosConPrecio = productos.filter((p) => conPrecio.has(p.id) && !p.activo);
  const sinStock = variedades.filter((v) => vigentes.has(v.producto_id) && v.controla_stock && Number(v.cantidad) <= 0);

  const ahora = new Date();
  const nuevas = sinPrecio.map((p) => ({
    producto_id: p.id, nombre: null, ...precioDemo(p.id, familiaDe(p.categoria_id)),
    iva_porcentaje: 21, controla_stock: false, cantidad: 0, fecha_alta: ahora, fecha_cambio_precio: ahora,
  }));
  if (nuevas.length) await VariedadDistribuidora.bulkCreate(nuevas, { transaction, validate: true });
  const activar = [...sinPrecio, ...inactivosConPrecio].map((p) => p.id);
  if (activar.length) await ProductoDistribuidora.update({ activo: true }, { where: { id: activar }, transaction });
  for (const v of sinStock) await VariedadDistribuidora.update({ cantidad: stockDemo(v.id) }, { where: { id: v.id }, transaction });

  return {
    productos: nuevas.length,
    ofertas: nuevas.filter((v) => v.precio_anterior != null).length,
    activados: inactivosConPrecio.length,
    con_stock: sinStock.length,
  };
}
