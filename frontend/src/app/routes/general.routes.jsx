import { lazy } from "react";
import { protegida } from "./route_helpers.jsx";
const RecoveryPage = lazy(() => import("../../modules/usuarios/recovery_page.jsx"));
const HomePage = lazy(() => import("../../modules/home/home_page.jsx"));
const LoginPage = lazy(() => import("../../modules/usuarios/login_page.jsx"));
const RegisterPage = lazy(() => import("../../modules/usuarios/register_page.jsx"));
const MiSuscripcionPage = lazy(() => import("../../modules/suscripcion/mi_suscripcion_page.jsx"));

export const generalRoutes = [
  { path: "/", element: <HomePage /> },
  { path: "*", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <RecoveryPage /> },
  { path: "/reset-password", element: <RecoveryPage reset /> },
  // Abierta a cualquier cuenta: ahí el jugador se hace organizador y el organizador paga.
  { path: "/mi-suscripcion", element: protegida(<MiSuscripcionPage />) },
];
