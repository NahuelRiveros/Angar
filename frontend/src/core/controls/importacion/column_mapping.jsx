import InputField from "../ui/input_field.jsx";
import SelectField from "../ui/select_field.jsx";
import ActionButton from "../ui/action_button.jsx";
export default function ColumnMapping({ config, preview, mapping, onMapping, options, onOption, busy, onValidate, profiles, profileName, onProfileName, onSaveProfile, onProfile }) {
  return <section aria-label="Mapeo de columnas" className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div><h2 className="text-lg font-bold">2. Relacionar columnas y definir la carga</h2><p className="text-sm text-slate-600">{preview.total.toLocaleString("es-AR")} filas detectadas. Revisá las asociaciones sugeridas.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField name="import-profile" label="Mapeo guardado" value="" placeholder="Elegir un mapeo de este navegador" options={profiles.map((p) => ({ value: p.name, label: p.name }))} onChange={(e) => onProfile(e.target.value)} disabled={busy} />
      <div className="flex flex-wrap items-end gap-2"><InputField name="profile-name" label="Nombre para reutilizar este mapeo" maxLength={60} value={profileName} onChange={(e) => onProfileName(e.target.value)} disabled={busy} /><ActionButton disabled={busy || !profileName.trim()} onClick={onSaveProfile}>Guardar mapeo</ActionButton></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{config.fields.map((field) => <SelectField key={field.key} name={"map-" + field.key} label={field.label} helperText={field.help} value={mapping[field.key] || ""} options={preview.columns.map((c) => ({ value: c.key, label: c.label }))} placeholder="No importar esta columna" onChange={(e) => onMapping(field.key, e.target.value)} disabled={busy} />)}</div>
    <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
      <SelectField name="mode" label="Operación" value={options.mode} options={config.modes} showPlaceholderOption={false} onChange={(e) => onOption("mode", e.target.value)} disabled={busy} />
      <SelectField name="identity" label="Reconocer productos por" value={options.identity} options={[{ value: "sku", label: "Código / SKU (recomendado)" }, { value: "name", label: "Categoría + nombre + presentación" }]} showPlaceholderOption={false} onChange={(e) => onOption("identity", e.target.value)} disabled={busy} />
      <SelectField name="decimal" label="Formato de números escritos como texto" value={options.decimal} options={[{ value: "comma", label: "Coma decimal: 1.234,56" }, { value: "dot", label: "Punto decimal: 1,234.56" }]} showPlaceholderOption={false} onChange={(e) => onOption("decimal", e.target.value)} disabled={busy} />
      <SelectField name="price-type" label="El precio del archivo" value={options.priceType} options={[{ value: "net", label: "Es neto, sin IVA" }, { value: "gross", label: "Ya incluye IVA" }]} showPlaceholderOption={false} onChange={(e) => onOption("priceType", e.target.value)} disabled={busy} />
      <InputField name="default-vat" label="IVA para productos nuevos sin IVA informado (%)" type="number" min={0} max={100} step="0.01" value={options.defaultVat} onChange={(e) => onOption("defaultVat", e.target.value)} disabled={busy} />
      <InputField name="default-category" label="Categoría cuando el archivo no la informa" placeholder="Ej.: Almacén > Galletitas" value={options.category} onChange={(e) => onOption("category", e.target.value)} disabled={busy} />
    </div>
    {options.identity === "name" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Sin código estable, cambiar un nombre puede generar un artículo nuevo. La categoría es obligatoria y las coincidencias ambiguas se rechazan.</p>}
    <fieldset className="space-y-2 rounded-xl bg-slate-50 p-4" disabled={busy || options.mode === "create"}>
      <legend className="text-sm font-bold">Campos que se actualizan en artículos existentes</legend>
      <div className="flex flex-wrap gap-4">{[["precio", "Actualizar precio"], ["iva_porcentaje", "Actualizar IVA"], ["cantidad", "Actualizar stock"]].map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={options.updateFields.includes(key)} onChange={(e) => onOption("updateFields", e.target.checked ? [...options.updateFields, key] : options.updateFields.filter((v) => v !== key))} />{label}
      </label>)}</div>
      <p className="text-sm text-slate-600">Nombre, categoría, marca, descripción e imágenes existentes se conservan. Una celda vacía no borra IVA ni stock. Actualizar stock reemplaza la cantidad; no la suma.</p>
    </fieldset>
    <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} aria-label="Muestra del archivo">
      <table className="w-full text-left text-sm"><caption className="p-3 text-left font-semibold">Muestra original · primeras {preview.rows.length} filas</caption>
        <thead className="bg-slate-50"><tr><th className="p-2">Fila</th>{preview.columns.map((c) => <th key={c.key} className="whitespace-nowrap p-2">{c.label}</th>)}</tr></thead>
        <tbody>{preview.rows.map((r) => <tr key={r.number} className="border-t border-slate-100"><td className="p-2">{r.number}</td>{preview.columns.map((c, i) => <td key={c.key} className="max-w-64 truncate p-2" title={String(r.values[i] ?? "")}>{String(r.values[i] ?? "")}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <ActionButton disabled={busy || !preview.total} onClick={onValidate}>{busy ? "Validando todas las filas…" : "Validar catálogo sin cargar productos"}</ActionButton>
  </section>;
}
