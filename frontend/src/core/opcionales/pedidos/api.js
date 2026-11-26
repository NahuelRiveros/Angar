import { http } from "../../api/http.js";

// API del módulo pedidos (servidor/src/core/opcionales/pedidos).
const datos = (promesa) => promesa.then((r) => r.data.data);
const publico = { publicAccess: true };

// ── Quien compra ────────────────────────────────────────────────────────────
// Sin publicAccess: si la persona ingresó, va su sesión y el pedido queda en "Mis pedidos" (MPE-06).
// Si la sesión venció justo, se manda como invitado: con la misma clave_envio no se duplica (MPE-04).
export const enviarPedido = (pedido) => datos(http.post("/pedidos", pedido).catch((error) => {
  if (error.response?.status === 401) return http.post("/pedidos", pedido, publico);
  throw error;
}));
export const getSeguimiento = (clave) => datos(http.get(`/pedidos/seguir/${encodeURIComponent(clave)}`, publico));
export const getMisPedidos = (params) => datos(http.get("/pedidos/mios", { params }));

// ── Panel ───────────────────────────────────────────────────────────────────
export const getPedidosPanel = (params, signal) => datos(http.get("/pedidos/panel", { params, signal }));
export const getPedidoPanel = (id) => datos(http.get(`/pedidos/panel/${id}`));
export const cambiarEstado = ({ id, ...cambio }) => http.patch(`/pedidos/panel/${id}/estado`, cambio).then((r) => r.data);
