import multer from "multer";
import { cobroConfig } from "../../../cobro_config.js";

// Comprobante (campo "comprobante") en memoria y con tope de peso. El formato real lo valida
// el servicio por el contenido del archivo. Lo usan la suscripción y el pago de inscripciones.
export const recibirComprobante = (req, res, next) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: cobroConfig.comprobante.maxBytes, files: 1, fields: 5 },
}).single("comprobante")(req, res, (err) => {
  if (!err) return next();
  const mensaje = err.code === "LIMIT_FILE_SIZE"
    ? `El comprobante puede pesar hasta ${Math.round(cobroConfig.comprobante.maxBytes / 1024 / 1024)} MB.`
    : "No pudimos leer el archivo. Probá con otro.";
  return res.status(400).json({ ok: false, codigo: "COMPROBANTE_INVALIDO", mensaje });
});
