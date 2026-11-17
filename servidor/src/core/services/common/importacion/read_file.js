import { Worker } from "node:worker_threads";
import { limitesImportacion as config } from "../../../../../../core/importacion_config.js";
export function readImportFile(buffer, filename, options) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./reader_worker.js", import.meta.url), { workerData: { buffer, filename, options }, resourceLimits: { maxOldGenerationSizeMb: 256 } });
    const error = (message) => Object.assign(new Error(message), { status: 400 });
    const timer = setTimeout(() => { worker.terminate(); reject(error("El archivo tardó demasiado. Exportá un archivo más pequeño.")); }, config.parseTimeoutMs);
    worker.once("message", (r) => { clearTimeout(timer); worker.terminate(); if (r.error) reject(error(r.error)); else resolve(r.data); });
    worker.once("error", () => { clearTimeout(timer); reject(error("No se pudo procesar el tamaño o contenido del archivo. Dividilo y reintentá.")); });
    worker.once("exit", (code) => { clearTimeout(timer); if (code !== 0) reject(error("La lectura se interrumpió.")); });
  });
}
