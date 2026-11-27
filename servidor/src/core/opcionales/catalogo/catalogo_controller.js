import { datos, hecho } from "../../controllers/common/responder.js";
import * as web from "./services/web_service.js";
import * as productos from "./services/productos_service.js";
import * as categorias from "./services/categorias_service.js";

// ── Web ─────────────────────────────────────────────────────────────────────
export const categoriasWeb = datos(() => categorias.categoriasVisibles());
export const destacados = datos(() => web.listarDestacados());
export const productosWeb = datos(({ query }) => web.listarProductosWeb(query));
export const productoWeb = datos(({ params }) => web.detalleProducto(params.slug));

// ── Panel ───────────────────────────────────────────────────────────────────
export const listar = datos(({ query }) => productos.listarProductos(query));
export const obtener = datos(({ params }) => productos.obtenerProducto(params.id));
export const crear = hecho("PRODUCTO_CREADO", "Producto creado.", ({ body }) => productos.crearProducto(body), 201);
export const actualizar = hecho("PRODUCTO_ACTUALIZADO", "Producto actualizado.", ({ params, body }) => productos.actualizarProducto(params.id, body));
export const eliminar = hecho("PRODUCTO_ELIMINADO", "Producto dado de baja.", ({ params }) => productos.eliminarProducto(params.id));

export const listarCategorias = datos(() => categorias.listarCategorias());
export const crearCategoria = hecho("CATEGORIA_CREADA", "Categoría creada.", ({ body }) => categorias.crearCategoria(body), 201);
export const actualizarCategoria = hecho("CATEGORIA_ACTUALIZADA", "Categoría actualizada.", ({ params, body }) => categorias.actualizarCategoria(params.id, body));
export const eliminarCategoria = hecho("CATEGORIA_ELIMINADA", "Categoría borrada.", ({ params }) => categorias.eliminarCategoria(params.id));
