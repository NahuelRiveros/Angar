import { lazy } from "react";
import { accesoPanel } from "../../config/navbar_config/panel_gestion.js";
import { adminRoutes } from "./admin.routes.jsx";
import { superAdminRoutes } from "./super_admin.routes.jsx";
import { rutasActivas } from "../pantallas_activas.js";
import { protegida } from "./route_helpers.jsx";
const PanelInicioPage = lazy(() => import("../../modules/panel/panel_inicio_page.jsx"));
const AyudaPage = lazy(() => import("../../modules/ayuda/ayuda_page.jsx"));

// Todo lo que va dentro del panel de gestión (PanelLayout, ver router.jsx).
// Cada pantalla conserva su propia protección por rol.
export const panelRoutes = [
  { path: "/panel", element: protegida(<PanelInicioPage />, accesoPanel) },
  // AYU-01 y AYU-06: quien entra al panel; adentro cada tema se filtra por sus permisos (AYU-04).
  { path: "/panel/ayuda", element: protegida(<AyudaPage />, accesoPanel) },
  { path: "/panel/ayuda/:tema", element: protegida(<AyudaPage />, accesoPanel) },
  ...rutasActivas("rutasPanel"),
  ...adminRoutes,
  ...superAdminRoutes,
];
