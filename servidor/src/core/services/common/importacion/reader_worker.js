import { parentPort, workerData } from "node:worker_threads";
import { readSpreadsheet } from "./spreadsheet_reader.js";
try { parentPort.postMessage({ data: await readSpreadsheet(Buffer.from(workerData.buffer), workerData.filename, workerData.options) }); }
catch (error) { parentPort.postMessage({ error: error.status ? error.message : "No se pudo leer el archivo. Revisá que sea un Excel o CSV válido." }); }
