// Límites del lector de planillas del core (servidor/src/core/services/common/importacion):
// protegen la memoria y el tiempo del servidor sea cual sea el rubro que importa.
export const limitesImportacion = {
  maxBytes: 20 * 1024 * 1024, maxRows: 50000, maxColumns: 80, maxCells: 1500000, maxSheets: 30, maxCellLength: 5000,
  previewRows: 12, parseTimeoutMs: 60000,
};
