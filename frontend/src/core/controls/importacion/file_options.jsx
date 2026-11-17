import InputField from "../ui/input_field.jsx";
import SelectField from "../ui/select_field.jsx";
import ActionButton from "../ui/action_button.jsx";
export default function FileOptions({ config, file, onFile, options, onOption, preview, busy, onRead, onTemplate }) {
  return <section aria-label="Archivo de origen" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">1. Archivo de origen</h2><ActionButton disabled={busy} onClick={onTemplate}>Descargar plantilla Excel</ActionButton></div>
    <p className="text-sm text-slate-600">Excel .xlsx o CSV · Hasta {config.maxBytes / 1024 / 1024} MB y {config.maxRows.toLocaleString("es-AR")} filas. Una fila por artículo o presentación.</p>
    <InputField name="catalog-file" label="Seleccionar archivo" type="file" accept=".xlsx,.csv" disabled={busy} onChange={(e) => onFile(e.target.files?.[0] || null)} />
    {file && <p className="break-all text-sm font-semibold">{file.name}</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {preview?.sheets?.length > 1 ? <SelectField name="sheet" label="Hoja" value={options.sheet} options={preview.sheets} showPlaceholderOption={false} disabled={busy} onChange={(e) => onOption("sheet", Number(e.target.value))} />
        : <InputField name="sheet" label="Número de hoja" type="number" min={1} max={config.maxSheets} value={options.sheet} disabled={busy} onChange={(e) => onOption("sheet", Number(e.target.value))} />}
      <InputField name="header-row" label="Fila de encabezados" type="number" min={1} max={50} value={options.headerRow} disabled={busy} onChange={(e) => onOption("headerRow", Number(e.target.value))} />
      <SelectField name="delimiter" label="Separador CSV" options={[{ value: "auto", label: "Detectar automáticamente" }, { value: ";", label: "Punto y coma (;)" }, { value: ",", label: "Coma (,)" }, { value: "\t", label: "Tabulación" }]} showPlaceholderOption={false} value={options.delimiter} onChange={(e) => onOption("delimiter", e.target.value)} disabled={busy} />
      <SelectField name="encoding" label="Codificación CSV" options={[{ value: "utf-8", label: "UTF-8" }, { value: "windows-1252", label: "Windows-1252 (Excel antiguo)" }]} showPlaceholderOption={false} value={options.encoding} onChange={(e) => onOption("encoding", e.target.value)} disabled={busy} />
    </div>
    <ActionButton disabled={!file || busy} onClick={onRead}>{busy ? "Procesando…" : "Leer archivo y columnas"}</ActionButton>
  </section>;
}
