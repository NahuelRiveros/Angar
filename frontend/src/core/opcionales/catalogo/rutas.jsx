import { lazy } from "react";
import { protegida } from "../../app/routes/route_helpers.jsx";

const CatalogoPage = lazy(() => import("./web/catalogo_page.jsx"));
const ProductoPage = lazy(() => import("./web/producto_page.jsx"));
const ProductosPage = lazy(() => import("./admin/productos_page.jsx"));
const ProductoFormPage = lazy(() => import("./admin/producto_form_page.jsx"));
const CategoriasPage = lazy(() => import("./admin/categorias_page.jsx"));

const EDITAR = { permisos: ["catalogo.editar"] };

export const rutasTienda = [
  { path: "/catalogo", element: <CatalogoPage /> },
  { path: "/catalogo/:slug", element: <ProductoPage /> },
];

export const rutasPanel = [
  { path: "/admin/catalogo/productos", element: protegida(<ProductosPage />, EDITAR) },
  { path: "/admin/catalogo/productos/nuevo", element: protegida(<ProductoFormPage />, EDITAR) },
  { path: "/admin/catalogo/productos/:id", element: protegida(<ProductoFormPage />, EDITAR) },
  { path: "/admin/catalogo/categorias", element: protegida(<CategoriasPage />, EDITAR) },
];
