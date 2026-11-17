import { lazy } from "react";
import { inicioDelProyecto } from "../inicio.js";
import { pantallasActivas } from "../../../proyecto/pantallas_modulos.jsx";
const RecoveryPage = lazy(() => import("../../modules/usuarios/recovery_page.jsx"));
const LoginPage = lazy(() => import("../../modules/usuarios/login_page.jsx"));
const RegisterPage = lazy(() => import("../../modules/usuarios/register_page.jsx"));

// El home es de cada proyecto: si un rubro trae `inicio` en sus pantallas, ese; si no, el de tienda del core.
const HomePage = inicioDelProyecto(pantallasActivas, lazy(() => import("../../modules/home/home_page.jsx")));

export const generalRoutes = [
  { path: "/", element: <HomePage /> },
  { path: "*", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <RecoveryPage /> },
  { path: "/reset-password", element: <RecoveryPage reset /> },
];
