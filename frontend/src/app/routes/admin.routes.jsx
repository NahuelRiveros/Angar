import { lazy } from "react";
const StaffPage = lazy(() => import("../../modules/usuarios/admin/staff_page.jsx"));
const SuscripcionPage = lazy(() => import("../../modules/usuarios/admin/suscripcion_page.jsx"));
const HomeConfigPage = lazy(() => import("../../modules/home/admin/home_config_page.jsx"));
const GestionAnunciosPage = lazy(() => import("../../modules/usuarios/admin/gestion_anuncios_page.jsx"));
const PermisosPage = lazy(() => import("../../modules/usuarios/admin/permisos_page.jsx"));
import { protegida } from "./route_helpers.jsx";

export const adminRoutes = [
  { path: "/admin/staffManager", element: protegida(<StaffPage />, { permisos: ["usuarios.gestionar"] }) },
  { path: "/admin/permisos", element: protegida(<PermisosPage />, { permisos: ["permisos.gestionar"] }) },
  { path: "/admin/suscripcion", element: protegida(<SuscripcionPage />, ["admin"]) },
  { path: "/admin/home-config", element: protegida(<HomeConfigPage />, { permisos: ["contenido.editar"] }) },
  { path: "/admin/anuncios", element: protegida(<GestionAnunciosPage />, { permisos: ["contenido.editar"] }) },
];
