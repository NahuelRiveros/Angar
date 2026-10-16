import { catalogImportConfig as config } from "../../../../../catalog_import_config.js";
export const importError = (message, status = 400) => Object.assign(new Error(message), { status });
export const keyText = (v) => String(v ?? "").trim().toLocaleLowerCase("es-AR");
export function numberValue(raw, decimal, label) {
  if (typeof raw === "number") { if (!Number.isFinite(raw)) throw importError(label + " inválido."); return raw; }
  let text = String(raw ?? "").trim().replace(/^(ARS|\$)\s*/i, "").replace(/\s*%$/, "").trim();
  const comma = decimal === "comma";
  const pattern = comma ? /^\d+(?:,\d+)?$|^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/ : /^\d+(?:\.\d+)?$|^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
  if (!pattern.test(text)) throw importError(label + " inválido para el formato decimal elegido.");
  text = comma ? text.replaceAll(".", "").replace(",", ".") : text.replaceAll(",", "");
  const n = Number(text); if (!Number.isFinite(n)) throw importError(label + " inválido."); return n;
}
export function validateSettings(mapping, options, columns) {
  const s = { ...config.defaults, ...options };
  if (!["comma", "dot"].includes(s.decimal) || !["net", "gross"].includes(s.priceType) || !["sku", "name"].includes(s.identity) || !config.modes.some((m) => m.value === s.mode)) throw importError("Opciones inválidas.");
  if (!Array.isArray(s.updateFields) || s.updateFields.some((v) => !["precio", "iva_porcentaje", "cantidad"].includes(v))) throw importError("Campos de actualización inválidos.");
  s.defaultVat = Number(s.defaultVat);
  if (!Number.isFinite(s.defaultVat) || s.defaultVat < 0 || s.defaultVat > 100) throw importError("IVA predeterminado inválido.");
  if (typeof s.category !== "string" || s.category.length > 800) throw importError("Categoría predeterminada inválida.");
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) throw importError("Mapeo inválido.");
  const keys = new Set(columns.map((c) => c.key)), used = new Set();
  for (const [key, value] of Object.entries(mapping)) {
    if (!config.fields.some((f) => f.key === key) || value && !keys.has(value)) throw importError("El mapeo no corresponde a las columnas.");
    if (value && used.has(value)) throw importError("Cada columna puede asignarse a un solo campo.");
    if (value) used.add(value);
  }
  if (!mapping.precio) throw importError("Mapeá el precio.");
  if (s.identity === "sku" && !mapping.cod_ref) throw importError("Mapeá el código / SKU o elegí coincidencia por nombre.");
  if ((s.mode !== "update" || s.identity === "name") && !mapping.producto_nombre) throw importError("Mapeá el nombre del producto.");
  for (const key of s.updateFields) if (key !== "precio" && !mapping[key]) throw importError("Para actualizar " + key + " tenés que mapear su columna.");
  return s;
}
export function normalizeRows(parsed, mapping, settings) {
  const indices = Object.fromEntries(parsed.columns.map((c, i) => [c.key, i]));
  const field = (row, name) => mapping[name] ? row.values[indices[mapping[name]]] : undefined;
  const text = (row, name, max) => {
    const raw = field(row, name);
    if (typeof raw === "number" && name === "cod_ref" && !Number.isSafeInteger(raw)) throw importError("El código perdió precisión en Excel. Exportalo como texto.");
    const v = raw == null ? "" : String(raw).trim();
    if (v.startsWith("#ERROR") || v.startsWith("#FORMULA")) throw importError(name + " contiene una fórmula sin resultado válido.");
    if (v.length > max) throw importError(name + " supera " + max + " caracteres.");
    return v || null;
  };
  return parsed.rows.map((row) => {
    try {
      const v = { cod_ref: text(row, "cod_ref", 60), producto_nombre: text(row, "producto_nombre", 150), variedad_nombre: text(row, "variedad_nombre", 100), categoria: text(row, "categoria", 800) || settings.category || null, marca: text(row, "marca", 80), descripcion: text(row, "descripcion", 5000), importe: numberValue(field(row, "precio"), settings.decimal, "Precio") };
      if (v.importe < 0 || v.importe > 99999999.99) throw importError("Precio fuera del rango permitido.");
      if (settings.identity === "sku" && !v.cod_ref) throw importError("Falta código / SKU.");
      if ((settings.mode !== "update" || settings.identity === "name") && !v.producto_nombre) throw importError("Falta nombre del producto.");
      const parts = v.categoria?.split(">").map((s) => s.trim()).filter(Boolean) || [];
      if (parts.length > 10 || parts.some((s) => s.length > 80)) throw importError("La categoría admite hasta 10 niveles de 80 caracteres.");
      v.categoria = parts.join(" > ") || null;
      for (const [name, label] of [["iva_porcentaje", "IVA"], ["cantidad", "Stock"]]) {
        const raw = field(row, name); v[name] = raw == null || String(raw).trim() === "" ? null : numberValue(raw, settings.decimal, label);
      }
      if (v.iva_porcentaje != null && (v.iva_porcentaje < 0 || v.iva_porcentaje > 100 || Math.abs(v.iva_porcentaje * 100 - Math.round(v.iva_porcentaje * 100)) > 0.00001)) throw importError("IVA inválido (0 a 100, hasta 2 decimales).");
      if (v.cantidad != null && (!Number.isInteger(v.cantidad) || v.cantidad < 0 || v.cantidad > 2147483647)) throw importError("Stock inválido: usar un entero no negativo.");
      v.codigo_barras = text(row, "codigo_barras", 30)?.replace(/s/g, "") || null;
      if (v.codigo_barras && !/^d{6,14}$/.test(v.codigo_barras)) throw importError("Código de barras inválido: entre 6 y 14 números.");
      const porBulto = field(row, "unidades_por_bulto");
      v.unidades_por_bulto = porBulto == null || String(porBulto).trim() === "" ? null : numberValue(porBulto, settings.decimal, "Unidades por bulto");
      if (v.unidades_por_bulto != null && (!Number.isInteger(v.unidades_por_bulto) || v.unidades_por_bulto < 1 || v.unidades_por_bulto > 10000)) throw importError("Unidades por bulto inválidas: un entero entre 1 y 10000.");
      return { row: row.number, value: v };
    } catch (e) { return { row: row.number, action: "error", message: e.message }; }
  });
}
