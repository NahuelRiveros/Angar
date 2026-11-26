import * as stock from "./services/stock_service.js";

const hecho = (mensaje, hacer) => async (req, res) => {
  const data = await hacer(req.datos, req.user.usuario_id);
  res.json({ ok: true, mensaje, ...(data !== undefined && { data }) });
};

export const listar = async (req, res) => res.json({ ok: true, data: await stock.listar(req.datos.query) });
export const movimientos = async (req, res) => res.json({ ok: true, data: await stock.movimientos(req.datos.params.variante_id, req.datos.query) });
export const controlar = hecho("Ahora controla stock.", ({ params, body }, usuario) => stock.controlar(params.variante_id, body, usuario));
export const dejarDeControlar = hecho("Dejó de controlar stock.", ({ params }) => stock.dejarDeControlar(params.variante_id));
export const cambiarMinimo = hecho("Mínimo guardado.", ({ params, body }) => stock.cambiarMinimo(params.variante_id, body));
export const mover = hecho("Movimiento guardado.", ({ params, body }, usuario) => stock.mover(params.variante_id, body, usuario));
