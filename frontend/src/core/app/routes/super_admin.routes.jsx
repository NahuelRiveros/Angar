import { lazy } from "react";
import { suscripcionDelSoftwareActiva } from "../../../../../core/suscripcion_software_config.js";
const GestionSuscripcionPage = lazy(() => import("../../modules/usuarios/super_admin/gestion_suscripcion_page.jsx"));
import { protegida } from "./route_helpers.jsx";

export const superAdminRoutes = suscripcionDelSoftwareActiva ? [
  {
    path: "/super-admin/suscripcion",
    element: protegida(<GestionSuscripcionPage />, ["super_admin"]),
  },
] : [];
