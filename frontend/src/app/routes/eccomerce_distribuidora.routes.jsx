import { orderConfig } from "../../config/order_config.js";
import { lazy } from "react";
import { projectModules } from "../../config/gate_config.js";
import { storefrontConfig } from "../../config/storefront_config.js";
const ProductosDistribuidoraPage = lazy(() => import("../../modules/eccomerce_distribuidora/productos/productos_page.jsx"));
const ProductoDetalleDistribuidoraPage = lazy(() => import("../../modules/eccomerce_distribuidora/productos/producto_detalle_page.jsx"));
const NotaPedidoPage = lazy(() => import("../../modules/eccomerce_distribuidora/carrito/nota_pedido_page.jsx"));
const MisPedidosPage = lazy(() => import("../../modules/eccomerce_distribuidora/carrito/mis_pedidos_page.jsx"));
const PerfilPage = lazy(() => import("../../modules/eccomerce_distribuidora/perfil/perfil_page.jsx"));
// Aliaseado para no chocar con ProductosDistribuidoraPage (arriba) — son dos
// componentes con el mismo nombre por default export en archivos distintos
// (catálogo del cliente vs. árbol de categorías/productos del admin), nada
// raro, solo hace falta un alias acá donde conviven en el mismo import.
const AdminProductosPage = lazy(() => import("../../modules/eccomerce_distribuidora/admin/productos_page.jsx"));
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
  { path: "/distribuidora/admin/categorias", element: protegida(<AdminProductosPage />, ROLES_ADMIN) },
  { path: "/distribuidora/admin/lista-carga", element: protegida(<ListaCargaPage />, ROLES_VENTAS) },
  { path: "/distribuidora/admin/importar", element: protegida(<ImportacionDistribuidoraPage />, ROLES_ADMIN) },
  { path: "/distribuidora/admin/notas-pedido", element: protegida(<NotasPedidoDistribuidoraPage />, ROLES_VENTAS) },
];
