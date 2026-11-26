import { Router } from "express";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { validar } from "../../middleware/validar.js";
import * as stock from "./stock_controller.js";
import { esquemaControlar, esquemaFiltros, esquemaMinimo, esquemaMovimiento, esquemaVariante } from "./reglas.js";

// MST-07: todo pide "Mover stock". La web nunca ve cantidades (MST-06).
export const stockRouter = Router();
stockRouter.use(requireAuth, requirePermiso("stock.mover"));
const conVariante = (extra = {}) => validar({ params: esquemaVariante, ...extra });
stockRouter.get("/", validar({ query: esquemaFiltros }), stock.listar);
stockRouter.get("/:variante_id/movimientos", conVariante({ query: esquemaFiltros.pick({ page: true }) }), stock.movimientos);
stockRouter.post("/:variante_id/movimientos", conVariante({ body: esquemaMovimiento }), stock.mover);
stockRouter.post("/:variante_id/control", conVariante({ body: esquemaControlar }), stock.controlar);
stockRouter.delete("/:variante_id/control", conVariante(), stock.dejarDeControlar);
stockRouter.put("/:variante_id/minimo", conVariante({ body: esquemaMinimo }), stock.cambiarMinimo);
