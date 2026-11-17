import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { limitesImportacion as config } from "../../../../../../core/importacion_config.js";
const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
export function parseCsv(text, delimiter = "auto") {
  text = text.replace(/^\uFEFF/, "");
  if (delimiter === "auto") {
    const counts = { ";": 0, ",": 0, "\t": 0 }; let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') { if (quoted && text[i + 1] === '"') i++; else quoted = !quoted; }
      if (!quoted && (c === "\r" || c === "\n")) break;
      if (!quoted && c in counts) counts[c]++;
    }
    delimiter = Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0];
  }
  if (![";", ",", "\t"].includes(delimiter)) fail("Separador CSV inválido.");
  const rows = []; let row = [], value = "", quoted = false, closed = false;
  const cell = () => { row.push(value); value = ""; closed = false; if (row.length > config.maxColumns) fail("Demasiadas columnas."); };
  const record = () => { cell(); rows.push(row); row = []; if (rows.length > config.maxRows + 50) fail("El archivo supera el límite de filas."); };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } } else value += c;
    } else if (c === '"') { if (value || closed) fail("CSV inválido: comillas sin escapar."); quoted = true; }
    else if (c === delimiter) cell();
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; record(); }
    else if (closed) { if (c !== " ") fail("CSV inválido: texto después del cierre de comillas."); }
    else value += c;
    if (value.length > config.maxCellLength) fail("Una celda supera el largo permitido.");
  }
  if (quoted) fail("CSV inválido: faltan cerrar comillas.");
  if (value || row.length || closed) record();
  return { rows, delimiter };
}
function cellValue(cell) {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "number") {
    if (Number.isInteger(v) && /^0{2,}$/.test(cell.numFmt || "")) return String(v).padStart(cell.numFmt.length, "0");
    return v;
  }
  if (typeof v === "object") {
    if (v.error) return "#ERROR:" + v.error;
    if ("formula" in v || "sharedFormula" in v) return v.result ?? "#FORMULA_SIN_RESULTADO";
    if (v.richText) return v.richText.map((p) => p.text).join("");
    if (v.text != null) return String(v.text);
    if (v instanceof Date) return v.toISOString();
  }
  return String(v);
}
export async function readSpreadsheet(buffer, filename, options = {}) {
  const headerRow = Number(options.headerRow ?? 1), selected = Number(options.sheet ?? 1);
  if (!Number.isInteger(headerRow) || headerRow < 1 || headerRow > 50) fail("La fila de encabezados debe estar entre 1 y 50.");
  if (!Number.isInteger(selected) || selected < 1 || selected > config.maxSheets) fail("Hoja inválida.");
  if (buffer.length > config.maxBytes) fail("El archivo supera 20 MB.");
  const sheets = []; let headers = null, rows = [], cells = 0, delimiter = options.delimiter || "auto";
  function consume(values, number) {
    cells += values.length;
    if (cells > config.maxCells) fail("Demasiadas celdas. Dividí el catálogo en archivos más pequeños.");
    if (values.length > config.maxColumns) fail("Demasiadas columnas.");
    if (values.some((v) => String(v ?? "").length > config.maxCellLength)) fail("Una celda supera el largo permitido.");
    if (number === headerRow) { headers = values.map((v) => String(v ?? "").trim()); return; }
    if (number < headerRow || !values.some((v) => v !== "" && v != null)) return;
    if (rows.length >= config.maxRows) fail("El archivo supera " + config.maxRows + " filas.");
    rows.push({ number, values });
  }
  if (/\.csv$/i.test(filename)) {
    if (!["utf-8", "windows-1252"].includes(options.encoding || "utf-8")) fail("Codificación no admitida.");
    let text;
    try { text = new TextDecoder(options.encoding || "utf-8", { fatal: true }).decode(buffer); }
    catch { fail("El CSV no es UTF-8. Probá la codificación Windows-1252."); }
    const result = parseCsv(text, delimiter); delimiter = result.delimiter;
    sheets.push({ value: 1, label: "CSV" });
    if (selected !== 1) fail("Un CSV tiene una sola hoja.");
    result.rows.forEach((r, i) => consume(r, i + 1));
  } else if (/\.xlsx$/i.test(filename)) {
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from([buffer]), { sharedStrings: "cache", styles: "cache", hyperlinks: "ignore", worksheets: "emit" });
    let sheetNumber = 0, scannedCells = 0;
    for await (const sheet of reader) {
      sheetNumber++;
      if (sheetNumber > config.maxSheets) fail("Demasiadas hojas.");
      sheets.push({ value: sheetNumber, label: sheet.name || "Hoja " + sheetNumber });
      for await (const row of sheet) {
        scannedCells += row.cellCount;
        if (scannedCells > config.maxCells) fail("El libro supera el límite de celdas. Exportá solo la hoja del catálogo.");
        if (sheetNumber === selected) consume(Array.from({ length: row.cellCount }, (_, i) => cellValue(row.getCell(i + 1))), row.number);
      }
    }
    if (!sheets.some((s) => s.value === selected)) fail("La hoja seleccionada no existe.");
  } else fail("Usá .xlsx o CSV. Exportá los .xls como .xlsx.");
  if (!headers?.some(Boolean)) fail("No hay encabezados en esa fila. Elegí la fila que contiene los títulos.");
  const width = Math.max(headers.length, ...rows.slice(0, config.previewRows).map((r) => r.values.length));
  if (rows.some((r) => r.values.length > width)) fail("Hay filas con más columnas que el encabezado. Revisá el separador o la fila elegida.");
  const columns = Array.from({ length: width }, (_, i) => ({ key: "c" + (i + 1), name: headers[i] || "", label: (headers[i] || "Sin título") + " · columna " + (i + 1) }));
  return { columns, rows, sheets, sheet: selected, delimiter, headerRow };
}
