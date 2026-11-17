import { lazy } from "react";
const StaffPage = lazy(() => import("../../modules/usuarios/admin/staff_page.jsx"));
const SuscripcionPage = lazy(() => import("../../modules/usuarios/admin/suscripcion_page.jsx"));
const BannersPage = lazy(() => import("../../modules/usuarios/admin/banners_page.jsx"));
const PermisosPage = lazy(() => import("../../modules/usuarios/admin/permisos_page.jsx"));
import { protegida } from "./route_helpers.jsx";
import { suscripcionDelSoftwareActiva } from "../../../../../core/suscripcion_software_config.js";

export const adminRoutes = [
  { path: "/admin/staffManager", element: protegida(<StaffPage />, { permisos: ["usuarios.gestionar"] }) },
  { path: "/admin/permisos", element: protegida(<PermisosPage />, { permisos: ["permisos.gestionar"] }) },
  ...(suscripcionDelSoftwareActiva ? [{ path: "/admin/suscripcion", element: protegida(<SuscripcionPage />, ["admin"]) }] : []),
  { path: "/admin/banners", element: protegida(<BannersPage />, { permisos: ["contenido.editar"] }) },
];
