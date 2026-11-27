import { datos, hecho } from "../../controllers/common/responder.js";
import * as compra from "./services/enviar_service.js";
import * as panel from "./services/panel_service.js";

// ── Quien compra ────────────────────────────────────────────────────────────
export const enviar = hecho("PEDIDO_ENVIADO", "¡Recibimos tu pedido!", ({ body }, usuario) => compra.enviarPedido(body, usuario?.usuario_id ?? null), 201);
export const seguir = datos(({ params }) => compra.seguirPedido(params.clave));
export const mios = datos(({ query }, usuario) => compra.misPedidos(usuario.usuario_id, query));

// ── Panel ───────────────────────────────────────────────────────────────────
export const listar = datos(({ query }) => panel.listarPedidos(query));
export const obtener = datos(({ params }) => panel.obtenerPedido(params.id));
export const cambiarEstado = hecho("ESTADO_CAMBIADO", "Pedido actualizado.", ({ params, body }, usuario) => panel.cambiarEstado(params.id, body, usuario.usuario_id));
