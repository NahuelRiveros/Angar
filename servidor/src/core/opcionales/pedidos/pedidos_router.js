import { Router } from "express";
import rateLimit from "express-rate-limit";
import { optionalAuth, requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { ipVisitante } from "../../middleware/ip_visitante.js";
import { validar } from "../../middleware/validar.js";
import * as pedidos from "./pedidos_controller.js";
import { TIENDA_POR_DEFECTO } from "../../../../../core/tienda_opciones.js";
import { esquemaCambioEstado, esquemaClave, esquemaEnviar, esquemaFiltros, esquemaId, esquemaPagina } from "./reglas.js";

/** MPE-11: cuenta solo los pedidos creados; corregir el carrito después de un aviso no gasta intentos. */
export const POR_HORA = 10;
const topePedidos = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: POR_HORA,
  skipFailedRequests: true,
  keyGenerator: (req) => ipVisitante(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, codigo: "DEMASIADOS_INTENTOS", mensaje: "Hiciste muchos pedidos seguidos. Esperá un rato o escribinos por WhatsApp." },
});

export function crearPedidosRouter(opciones = TIENDA_POR_DEFECTO) {
  const router = Router();
  // MPE-06: pedir no pide ingresar, salvo que el proyecto lo exija; si ingresó, el pedido queda a su nombre.
  router.post("/", topePedidos, opciones.exigirCuenta ? requireAuth : optionalAuth, validar({ body: esquemaEnviar(opciones.entregas) }), pedidos.enviar);
  router.get("/seguir/:clave", validar({ params: esquemaClave }), pedidos.seguir);
  router.get("/mios", requireAuth, validar({ query: esquemaPagina }), pedidos.mios);

  // MPE-10: ver pide "Ver pedidos" (o gestionarlos); cambiar de estado, "Gestionar pedidos".
  const panel = Router();
  panel.get("/", validar({ query: esquemaFiltros }), pedidos.listar);
  panel.get("/:id", validar({ params: esquemaId }), pedidos.obtener);
  panel.patch("/:id/estado", requirePermiso("pedidos.gestionar"), validar({ params: esquemaId, body: esquemaCambioEstado }), pedidos.cambiarEstado);
  router.use("/panel", requireAuth, requirePermiso("pedidos.ver", "pedidos.gestionar"), panel);
  return router;
}
