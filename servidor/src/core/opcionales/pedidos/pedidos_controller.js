import * as compra from "./services/enviar_service.js";
import * as panel from "./services/panel_service.js";

const datos = (obtener) => async (req, res) => res.json({ ok: true, data: await obtener(req.datos ?? {}, req.user) });

// ── Quien compra ────────────────────────────────────────────────────────────
export const enviar = async (req, res) => {
  const data = await compra.enviarPedido(req.datos.body, req.user?.usuario_id ?? null);
  res.status(201).json({ ok: true, codigo: "PEDIDO_ENVIADO", mensaje: "¡Recibimos tu pedido!", data });
};
export const seguir = datos(({ params }) => compra.seguirPedido(params.clave));
export const mios = datos(({ query }, usuario) => compra.misPedidos(usuario.usuario_id, query));

// ── Panel ───────────────────────────────────────────────────────────────────
export const listar = datos(({ query }) => panel.listarPedidos(query));
export const obtener = datos(({ params }) => panel.obtenerPedido(params.id));
export const cambiarEstado = async (req, res) => {
  const data = await panel.cambiarEstado(req.datos.params.id, req.datos.body, req.user.usuario_id);
  res.json({ ok: true, codigo: "ESTADO_CAMBIADO", mensaje: "Pedido actualizado.", data });
};
