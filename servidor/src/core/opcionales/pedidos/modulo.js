import { PedHistorial, PedItem, PedPedido } from "./modelos.js";
import { opcionesPedidos } from "./opciones.js";
import { crearPedidosRouter } from "./pedidos_router.js";

// Spec: docs/specs/core/pedidos.md.
export const moduloPedidos = {
  codigo: "pedidos",
  modelos: [PedPedido, PedItem, PedHistorial],
  migraciones: new URL("./migraciones/", import.meta.url),
  rutas: [["/pedidos", crearPedidosRouter(opcionesPedidos)]],
};
