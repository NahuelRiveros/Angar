import { orderConfig } from "../../config/order_config.js";
import { lazy } from "react";
import { projectModules } from "../../config/gate_config.js";
import { storefrontConfig } from "../../config/storefront_config.js";
const ProductosDistribuidoraPage = lazy(() => import("../../modules/eccomerce_distribuidora/productos/productos_page.jsx"));
const ProductoDetalleDistribuidoraPage = lazy(() => import("../../modules/eccomerce_distribuidora/productos/producto_detalle_page.jsx"));
const NotaPedidoPage = lazy(() => import("../../modules/eccomerce_distribuidora/carrito/nota_pedido_page.jsx"));
const MisPedidosPage = lazy(() => import("../../modules/eccomerce_distribuidora/carrito/mis_pedidos_page.jsx"));
const PerfilPage = lazy(() => import("../../modules/eccomerce_distribuidora/perfil/perfil_page.jsx"));
const CategoriasDistribuidoraPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/categorias_page.jsx"));
const ArticuloFormPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/articulo_form_page.jsx"));
const ListasPrecioPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/listas_precio_page.jsx"));
const ListaPrecioFormPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/lista_precio_form_page.jsx"));
const ListaPrecioPreciosPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/lista_precio_precios_page.jsx"));
const MarcaFormPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/marca_form_page.jsx"));
const MarcasDistribuidoraPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/marcas_page.jsx"));
const NotasPedidoDistribuidoraPage = lazy(() => import("../../modules/eccomerce_distribuidora/pedidos/notas_pedido_page.jsx"));
const ImportacionDistribuidoraPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/importacion_page.jsx"));
const ArticulosPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/articulos_page.jsx"));
const ListaCargaPage = lazy(() => import("../../modules/eccomerce_distribuidora/pedidos/lista_carga_page.jsx"));
import { protegida } from "./route_helpers.jsx";

// Catálogo público y carrito invitado configurables por instalación.
// Las acciones de gestión también se autorizan en el servidor.
const ROLES_CLIENTE = ["cliente", "admin", "staff"];
const ROLES_ADMIN = ["admin", "staff"];
// Personal autorizado a gestionar notas; fuente compartida con la API.
const ROLES_VENTAS = orderConfig.managementRoles;

export const eccomerceDistribuidoraRoutes = !projectModules.eccomerce_distribuidora ? [] : [
  { path: "/distribuidora/catalogo", element: storefrontConfig.publicCatalog ? <ProductosDistribuidoraPage /> : protegida(<ProductosDistribuidoraPage />, ROLES_CLIENTE) },
  { path: "/distribuidora/catalogo/:id", element: storefrontConfig.publicCatalog ? <ProductoDetalleDistribuidoraPage /> : protegida(<ProductoDetalleDistribuidoraPage />, ROLES_CLIENTE) },
  { path: "/distribuidora/carrito", element: storefrontConfig.guestCart && storefrontConfig.publicCatalog ? <NotaPedidoPage /> : protegida(<NotaPedidoPage />, ROLES_CLIENTE) },
  { path: "/distribuidora/mis-pedidos", element: protegida(<MisPedidosPage />, ROLES_CLIENTE) },

  // Sin restricción de rol — el backend (perfil_cliente_router.js) tampoco
  // la tiene, es siempre "mi propio perfil" (req.user.usuario_id). El link
  // "Mi perfil" del navbar (navbar_userbox.jsx) apunta acá para CUALQUIER
  // usuario logueado, no solo clientes — un admin/staff que hace su propio
  // pedido también necesita completar estos datos.
  { path: "/perfil", element: protegida(<PerfilPage />) },
];

// Pantallas de gestión: se muestran dentro del panel (ver panel.routes.jsx), con las mismas direcciones.
export const eccomerceDistribuidoraAdminRoutes = !projectModules.eccomerce_distribuidora ? [] : [
  // "Artículos" (tabla con filtros) y "Familias y categorías" (árbol con sus artículos).
  { path: "/distribuidora/admin/productos", element: protegida(<ArticulosPage />, ROLES_ADMIN) },
  // Ficha del artículo en página propia, bajo "productos" para que el menú siga marcando Artículos.
  { path: "/distribuidora/admin/productos/nuevo", element: protegida(<ArticuloFormPage />, ROLES_ADMIN) },
  { path: "/distribuidora/admin/productos/:id", element: protegida(<ArticuloFormPage />, ROLES_ADMIN) },
  { path: "/distribuidora/admin/categorias", element: protegida(<CategoriasDistribuidoraPage />, ROLES_ADMIN) },
  { path: "/distribuidora/admin/marcas", element: protegida(<MarcasDistribuidoraPage />, ROLES_ADMIN) },
  { path: "/distribuidora/admin/marcas/nueva", element: protegida(<MarcaFormPage />, ROLES_ADMIN) },
  { path: "/distribuidora/admin/marcas/:id", element: protegida(<MarcaFormPage />, ROLES_ADMIN) },
  // Listas de precios regionales: solo admin, igual que en el servidor.
  { path: "/distribuidora/admin/listas-precio", element: protegida(<ListasPrecioPage />, ["admin"]) },
  { path: "/distribuidora/admin/listas-precio/nueva", element: protegida(<ListaPrecioFormPage />, ["admin"]) },
  { path: "/distribuidora/admin/listas-precio/:id", element: protegida(<ListaPrecioFormPage />, ["admin"]) },
  { path: "/distribuidora/admin/listas-precio/:id/precios", element: protegida(<ListaPrecioPreciosPage />, ["admin"]) },
  { path: "/distribuidora/admin/lista-carga", element: protegida(<ListaCargaPage />, ROLES_VENTAS) },
  { path: "/distribuidora/admin/importar", element: protegida(<ImportacionDistribuidoraPage />, ROLES_ADMIN) },
  { path: "/distribuidora/admin/notas-pedido", element: protegida(<NotasPedidoDistribuidoraPage />, ROLES_VENTAS) },
];
