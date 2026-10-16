import { lazy } from "react";
import { rolesPanel } from "../../config/navbar_config/panel_gestion.js";
import { adminRoutes } from "./admin.routes.jsx";
import { superAdminRoutes } from "./super_admin.routes.jsx";
import { eccomerceDistribuidoraAdminRoutes } from "./eccomerce_distribuidora.routes.jsx";
import { protegida } from "./route_helpers.jsx";
const PanelInicioPage = lazy(() => import("../../modules/panel/panel_inicio_page.jsx"));

// Todo lo que va dentro del panel de gestión (PanelLayout, ver router.jsx).
// Cada pantalla conserva su propia protección por rol.
export const panelRoutes = [
  { path: "/panel", element: protegida(<PanelInicioPage />, rolesPanel) },
  ...eccomerceDistribuidoraAdminRoutes,
  ...adminRoutes,
  ...superAdminRoutes,
];
