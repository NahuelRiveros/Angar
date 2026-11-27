import { datos, hecho } from "../../controllers/common/responder.js";
import * as stock from "./services/stock_service.js";

export const listar = datos(({ query }) => stock.listar(query));
export const movimientos = datos(({ params, query }) => stock.movimientos(params.variante_id, query));
export const controlar = hecho("STOCK_CONTROLADO", "Ahora controla stock.", ({ params, body }, usuario) => stock.controlar(params.variante_id, body, usuario.usuario_id));
export const dejarDeControlar = hecho("STOCK_SIN_CONTROL", "Dejó de controlar stock.", ({ params }) => stock.dejarDeControlar(params.variante_id));
export const cambiarMinimo = hecho("MINIMO_GUARDADO", "Mínimo guardado.", ({ params, body }) => stock.cambiarMinimo(params.variante_id, body));
export const mover = hecho("MOVIMIENTO_GUARDADO", "Movimiento guardado.", ({ params, body }, usuario) => stock.mover(params.variante_id, body, usuario.usuario_id));
