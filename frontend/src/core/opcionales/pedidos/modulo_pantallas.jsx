import { lazy } from "react";
import { protegida } from "../../app/routes/route_helpers.jsx";
import { BotonCarrito, ComprarFicha } from "./web/compra.jsx";
import { useCompraTarjeta } from "./web/use_compra_tarjeta.js";

const CarritoPage = lazy(() => import("./web/carrito_page.jsx"));
const SeguimientoPage = lazy(() => import("./web/seguimiento_page.jsx"));
const MisPedidosPage = lazy(() => import("./web/mis_pedidos_page.jsx"));
const PedidosPage = lazy(() => import("./admin/pedidos_page.jsx"));
const PedidoPage = lazy(() => import("./admin/pedido_page.jsx"));

const VER = { permisos: ["pedidos.ver", "pedidos.gestionar"] };

export const pantallasPedidos = {
  codigo: "pedidos",
  rutasTienda: [
    { path: "/carrito", element: <CarritoPage /> },
    { path: "/pedido/:clave", element: <SeguimientoPage /> },
    { path: "/mis-pedidos", element: protegida(<MisPedidosPage />) },
  ],
  rutasPanel: [
    { path: "/admin/pedidos", element: protegida(<PedidosPage />, VER) },
    { path: "/admin/pedidos/:id", element: protegida(<PedidoPage />, VER) },
  ],
  extrasNavbar: [BotonCarrito],
  // Lo que usa el catálogo para vender sin conocer a este módulo (ver catalogo/compra.js).
  comprar: { Ficha: ComprarFicha, useTarjeta: useCompraTarjeta },
};
