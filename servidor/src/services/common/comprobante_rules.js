import { orderConfig } from "../../../../order_config.js";

// Se reconoce el archivo por sus primeros bytes, no por el nombre ni el tipo que
// declara el navegador: un .exe renombrado a .pdf no pasa.
const FIRMAS = [
  { formato: "pdf", es: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { formato: "jpg", es: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { formato: "png", es: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { formato: "webp", es: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

/** "pdf" | "jpg" | "png" | "webp", o null si no es un formato admitido. */
export function detectarFormatoComprobante(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  const firma = FIRMAS.find((f) => f.es(buffer));
  return firma && orderConfig.receipts.formats.includes(firma.formato) ? firma.formato : null;
}
