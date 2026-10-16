import { http } from "../../../api/http.js";

export async function enviarNotaPedido(notas = null, expectedItems, key) {
  const { data } = await http.post("/distribuidora/notas-pedido", { notas, expectedItems, key });
  return data;
}

export async function getMisNotasPedido() {
  const { data } = await http.get("/distribuidora/notas-pedido");
  return data.data;
}

// Gestión: permisos definidos en order_config.js
export async function getTodasLasNotasPedido(params) {
  const { data } = await http.get("/distribuidora/notas-pedido/todas", { params });
  return data;
}

export async function cambiarEstadoNotaPedido(id, estado, { motivo, expectedState } = {}) {
  const { data } = await http.put(`/distribuidora/notas-pedido/${id}/estado`, { estado, motivo, expectedState });
  return data;
}

export async function registrarPagoNotaPedido(id, { monto, nota, metodo, key } = {}) {
  const { data } = await http.post(`/distribuidora/notas-pedido/${id}/pagos`, { monto, nota, metodo, key });
  return data;
}

export async function anularPagoNotaPedido(id, pagoId, motivo) {
  const { data } = await http.post(`/distribuidora/notas-pedido/${id}/pagos/${pagoId}/anular`, { motivo });
  return data;
}

// Descarga directa del .xlsx — no hay precedente de descarga de archivos en
// el frontend todavía, se arma acá con el patrón estándar de axios (blob +
// <a download> temporal).
export async function exportarNotaPedido(id) {
  const res = await http.get(`/distribuidora/notas-pedido/${id}/export`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedido-${id}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// "Artículos a cargar" de varios pedidos juntos (lista de carga).
export async function getListaCarga(ids) {
  const { data } = await http.get("/distribuidora/notas-pedido/lista-carga", { params: { ids: ids.join(",") } });
  return data.data;
}
