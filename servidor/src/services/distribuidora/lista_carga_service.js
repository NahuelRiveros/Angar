import { QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { separarBultos } from "../../../../unidades_config.js";

export const MAX_PEDIDOS_LISTA_CARGA = 200;

/** "12, 15,15,x" → [12, 15]. Lanza un error con status 400 si no queda ninguno válido. */
export function leerIdsPedidos(texto) {
  const ids = [...new Set(String(texto ?? "").split(",").map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0))];
  if (!ids.length) throw Object.assign(new Error("Elegí al menos un pedido."), { status: 400 });
  if (ids.length > MAX_PEDIDOS_LISTA_CARGA) throw Object.assign(new Error(`Podés armar la lista con hasta ${MAX_PEDIDOS_LISTA_CARGA} pedidos.`), { status: 400 });
  return ids;
}

/**
 * "Artículos a cargar" (la planilla del sistema del cliente): suma lo pedido en varios
 * comprobantes por presentación, agrupado por familia, y lo separa en bultos y sueltos
 * con la equivalencia ACTUAL de cada artículo. Los pedidos cancelados no suman.
 */
export async function armarListaCarga(ids) {
  const [comprobantes, filas] = await Promise.all([
    sequelize.query("SELECT id FROM nota_pedido WHERE id IN (:ids) AND estado <> 'cancelada' ORDER BY id", { replacements: { ids }, type: QueryTypes.SELECT }),
    sequelize.query(`
      SELECT i.producto_id, i.variedad_id,
        max(i.nombre_producto) AS nombre, max(i.variedad_nombre) AS presentacion,
        sum(i.cantidad)::int AS cantidad,
        v.cod_ref, coalesce(v.unidades_por_bulto, 1) AS unidades_por_bulto,
        coalesce(v.unidad_medida, 'UNIDAD') AS unidad_medida, coalesce(v.unidad_bulto, 'CAJA') AS unidad_bulto,
        c.id AS familia_id, c.nombre AS familia
      FROM nota_pedido_item i
      JOIN nota_pedido n ON n.id = i.nota_pedido_id AND n.estado <> 'cancelada'
      LEFT JOIN variedad_distribuidora v ON v.id = i.variedad_id
      LEFT JOIN producto_distribuidora p ON p.id = i.producto_id
      LEFT JOIN categoria_distribuidora c ON c.id = p.categoria_id
      WHERE i.nota_pedido_id IN (:ids)
      GROUP BY i.producto_id, i.variedad_id, v.cod_ref, v.unidades_por_bulto, v.unidad_medida, v.unidad_bulto, c.id, c.nombre
      ORDER BY c.nombre NULLS LAST, max(i.nombre_producto)`,
    { replacements: { ids }, type: QueryTypes.SELECT }),
  ]);

  const familias = new Map();
  for (const f of filas) {
    const clave = f.familia_id ?? "sin_familia";
    if (!familias.has(clave)) familias.set(clave, { id: f.familia_id, nombre: f.familia ?? "Sin familia", articulos: [] });
    familias.get(clave).articulos.push({
      producto_id: f.producto_id, variedad_id: f.variedad_id, codigo: f.cod_ref,
      descripcion: f.presentacion ? `${f.nombre} ${f.presentacion}` : f.nombre,
      cantidad: f.cantidad, ...separarBultos(f.cantidad, f.unidades_por_bulto),
      unidades_por_bulto: f.unidades_por_bulto, unidad_medida: f.unidad_medida, unidad_bulto: f.unidad_bulto,
    });
  }
  const articulos = filas.length;
  return {
    comprobantes: comprobantes.map((c) => c.id),
    familias: [...familias.values()],
    totales: {
      articulos,
      unidades: filas.reduce((suma, f) => suma + f.cantidad, 0),
      bultos: [...familias.values()].flatMap((f) => f.articulos).reduce((suma, a) => suma + a.bultos, 0),
    },
  };
}
