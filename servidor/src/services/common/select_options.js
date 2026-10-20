/**
 * Lista un catálogo como opciones {value, label} para selects del frontend.
 * Uso: listarOpciones(TipoDocumento) o listarOpciones(CategoriaProducto, { where: { activo: true } }).
 */
export async function listarOpciones(Model, {
  value = "id",
  label = "descripcion",
  where = {},
  order,
  extra = [],
} = {}) {
  const attributes = [...new Set([value, label, ...extra])];

  const rows = await Model.findAll({
    attributes,
    where,
    order: order ?? [[label, "ASC"]],
  });

  return rows.map((row) => ({
    value: row[value],
    label: row[label],
    ...Object.fromEntries(extra.map((campo) => [campo, row[campo]])),
  }));
}
