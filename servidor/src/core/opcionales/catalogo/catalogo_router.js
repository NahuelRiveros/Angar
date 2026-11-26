import { Router } from "express";
import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";
import { validar } from "../../middleware/validar.js";
import * as catalogo from "./catalogo_controller.js";
import { esquemaCategoria, esquemaEditarProducto, esquemaFiltrosPanel, esquemaFiltrosWeb, esquemaId, esquemaProducto, esquemaSlug } from "./reglas.js";

export const catalogoRouter = Router();

// MCA-06: ver el catálogo no pide ingresar.
catalogoRouter.get("/categorias", catalogo.categoriasWeb);
catalogoRouter.get("/destacados", catalogo.destacados);
catalogoRouter.get("/productos", validar({ query: esquemaFiltrosWeb }), catalogo.productosWeb);
catalogoRouter.get("/productos/:slug", validar({ params: esquemaSlug }), catalogo.productoWeb);

// MCA-09: todo lo del panel pide "Editar catálogo".
const panel = Router();
const conId = (body) => validar({ params: esquemaId, ...(body && { body }) });
panel.get("/categorias", catalogo.listarCategorias);
panel.post("/categorias", validar({ body: esquemaCategoria }), catalogo.crearCategoria);
panel.put("/categorias/:id", conId(esquemaCategoria), catalogo.actualizarCategoria);
panel.delete("/categorias/:id", conId(), catalogo.eliminarCategoria);
panel.get("/productos", validar({ query: esquemaFiltrosPanel }), catalogo.listar);
panel.post("/productos", validar({ body: esquemaProducto }), catalogo.crear);
panel.get("/productos/:id", conId(), catalogo.obtener);
panel.put("/productos/:id", conId(esquemaEditarProducto), catalogo.actualizar);
panel.delete("/productos/:id", conId(), catalogo.eliminar);

catalogoRouter.use("/panel", requireAuth, requirePermiso("catalogo.editar"), panel);
