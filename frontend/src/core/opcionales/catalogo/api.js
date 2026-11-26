import { http } from "../../api/http.js";

// API del módulo catálogo (servidor/src/core/opcionales/catalogo).
const datos = (promesa) => promesa.then((r) => r.data.data);
const respuesta = (promesa) => promesa.then((r) => r.data);
const publico = { publicAccess: true };

// ── Web ─────────────────────────────────────────────────────────────────────
export const getCategorias = () => datos(http.get("/catalogo/categorias", publico));
export const getDestacados = () => datos(http.get("/catalogo/destacados", publico));
export const getProductos = (params, signal) => datos(http.get("/catalogo/productos", { ...publico, params, signal }));
export const getProducto = (slug) => datos(http.get(`/catalogo/productos/${encodeURIComponent(slug)}`, publico));

// ── Panel ───────────────────────────────────────────────────────────────────
export const getProductosPanel = (params, signal) => datos(http.get("/catalogo/panel/productos", { params, signal }));
export const getProductoPanel = (id) => datos(http.get(`/catalogo/panel/productos/${id}`));
export const guardarProducto = ({ id, ...producto }) => respuesta(id ? http.put(`/catalogo/panel/productos/${id}`, producto) : http.post("/catalogo/panel/productos", producto));
export const eliminarProducto = (id) => respuesta(http.delete(`/catalogo/panel/productos/${id}`));
export const getCategoriasPanel = () => datos(http.get("/catalogo/panel/categorias"));
export const guardarCategoria = ({ id, ...categoria }) => respuesta(id ? http.put(`/catalogo/panel/categorias/${id}`, categoria) : http.post("/catalogo/panel/categorias", categoria));
export const eliminarCategoria = (id) => respuesta(http.delete(`/catalogo/panel/categorias/${id}`));
