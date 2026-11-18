import { lazy } from "react";
const RecoveryPage = lazy(() => import("../../modules/usuarios/recovery_page.jsx"));
const LoginPage = lazy(() => import("../../modules/usuarios/login_page.jsx"));
const RegisterPage = lazy(() => import("../../modules/usuarios/register_page.jsx"));

// SIS-53: el home es de cada proyecto (frontend/src/proyecto/inicio.jsx); el core no trae uno.
const HomePage = lazy(() => import("../../../proyecto/inicio.jsx"));

export const generalRoutes = [
  { path: "/", element: <HomePage /> },
  { path: "*", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <RecoveryPage /> },
  { path: "/reset-password", element: <RecoveryPage reset /> },
];
