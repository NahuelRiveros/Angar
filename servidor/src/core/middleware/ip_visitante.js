import { ipKeyGenerator } from "express-rate-limit";
import { env } from "../configuracion_servidor/env.js";

/**
 * COR-21: de quién es el pedido, para los topes de intentos. En Render la conexión llega desde su
 * proxy (req.ip sería el mismo para todos y el tope lo compartirían): se usa la dirección que informa
 * Cloudflare, que está delante de Render. En otro lado ese encabezado lo puede inventar cualquiera.
 */
export function ipVisitante(req, enRender = env.EN_RENDER) {
  return ipKeyGenerator((enRender && req.get("cf-connecting-ip")) || req.ip);
}
