import { lazy } from "react";
import { protegida } from "./route_helpers.jsx";
const RecoveryPage = lazy(() => import("../../modules/usuarios/recovery_page.jsx"));
const HomePage = lazy(() => import("../../modules/home/home_page.jsx"));
const LoginPage = lazy(() => import("../../modules/usuarios/login_page.jsx"));
const RegisterPage = lazy(() => import("../../modules/usuarios/register_page.jsx"));
const MiSuscripcionPage = lazy(() => import("../../modules/suscripcion/mi_suscripcion_page.jsx"));
const MisTorneosPage = lazy(() => import("../../modules/torneos/mis_torneos_page.jsx"));
const TorneoDetallePage = lazy(() => import("../../modules/torneos/torneo_detalle_page.jsx"));
const TorneosPublicosPage = lazy(() => import("../../modules/torneos/publico/torneos_publicos_page.jsx"));
const TorneoPublicoPage = lazy(() => import("../../modules/torneos/publico/torneo_publico_page.jsx"));
const MisInscripcionesPage = lazy(() => import("../../modules/torneos/publico/mis_inscripciones_page.jsx"));

export const generalRoutes = [
  { path: "/", element: <HomePage /> },
  { path: "*", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <RecoveryPage /> },
  { path: "/reset-password", element: <RecoveryPage reset /> },
  // Abierta a cualquier cuenta: ahí el jugador se hace organizador y el organizador paga.
  { path: "/mi-suscripcion", element: protegida(<MiSuscripcionPage />) },
  // Del organizador; el servidor además verifica que cada torneo sea suyo.
  { path: "/mis-torneos", element: protegida(<MisTorneosPage />, ["organizador", "super_admin"]) },
  { path: "/mis-torneos/:torneoId", element: protegida(<TorneoDetallePage />, ["organizador", "super_admin"]) },
  // Públicas: cualquiera ve los torneos publicados; anotarse pide cuenta.
  { path: "/torneos", element: <TorneosPublicosPage /> },
  { path: "/torneos/:torneoId", element: <TorneoPublicoPage /> },
  { path: "/mis-inscripciones", element: protegida(<MisInscripcionesPage />) },
];
