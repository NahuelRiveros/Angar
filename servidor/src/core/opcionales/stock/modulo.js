import { StkExistencia, StkMovimiento } from "./modelos.js";
import { stockRouter } from "./stock_router.js";
import { alCambiarPedido, disponibilidad } from "./services/stock_service.js";

// Spec: docs/specs/core/stock.md. Se engancha al catálogo y a pedidos sin que lo conozcan (MOD-17).
export const moduloStock = {
  codigo: "stock",
  modelos: [StkExistencia, StkMovimiento],
  migraciones: new URL("./migraciones/", import.meta.url),
  rutas: [["/stock", stockRouter]],
  enganches: { disponibilidad, cambioDePedido: alCambiarPedido },
};
