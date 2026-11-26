import { http } from "../../api/http.js";

// API del módulo stock (servidor/src/core/opcionales/stock). Todo es del panel.
const datos = (promesa) => promesa.then((r) => r.data.data);
const respuesta = (promesa) => promesa.then((r) => r.data);

export const getStock = (params, signal) => datos(http.get("/stock", { params, signal }));
export const getMovimientos = (variante_id, params) => datos(http.get(`/stock/${variante_id}/movimientos`, { params }));
export const mover = ({ variante_id, ...movimiento }) => respuesta(http.post(`/stock/${variante_id}/movimientos`, movimiento));
export const controlar = ({ variante_id, ...inicio }) => respuesta(http.post(`/stock/${variante_id}/control`, inicio));
export const dejarDeControlar = (variante_id) => respuesta(http.delete(`/stock/${variante_id}/control`));
export const cambiarMinimo = ({ variante_id, minimo }) => respuesta(http.put(`/stock/${variante_id}/minimo`, { minimo }));
