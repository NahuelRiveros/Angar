import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/auth_context.jsx";
import { authLink } from "./return_to.js";
import { cumpleAcceso } from "./acceso.js";
import { accesoPanel } from "../../config/navbar_config/panel_gestion.js";

/**
 * Protege rutas según autenticación, roles y permisos (ver acceso.js).
 *
 * Uso:
 *   <ProtectedRoute>                                   → solo requiere estar logueado
 *   <ProtectedRoute roles={["super_admin"]}>           → solo ese rol
 *   <ProtectedRoute permisos={["pedidos.ver"]}>        → quien tenga el permiso
 *
 * Comportamiento:
 *   - Cargando auth  → muestra spinner
 *   - Sin sesión     → redirige a /login
 *   - Sin permiso    → al inicio del panel con un aviso si tiene panel; si no, a / (PAN-04)
 *   - OK             → renderiza children
 */
export default function ProtectedRoute({ children, roles = [], permisos = [], todos = false }) {
  const { usuario, cargando, isAuth } = useAuth();
  const location = useLocation();

  // El contexto todavía está verificando el token → esperar
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  // No hay sesión → ir a login
  if (!isAuth) {
    return <Navigate to={authLink("/login", location.pathname + location.search + location.hash)} replace />;
  }

  // Autenticado pero sin el rol o permiso pedido: quien tiene panel va a su inicio con el aviso
  // (un enlace viejo o un permiso quitado); el cliente, a la portada de la tienda.
  if (!cumpleAcceso(usuario, { roles, permisos, todos })) {
    const tienePanel = cumpleAcceso(usuario, accesoPanel) && location.pathname !== "/panel";
    return <Navigate to={tienePanel ? "/panel" : "/"} state={tienePanel ? { sinPermiso: true } : undefined} replace />;
  }

  return children;
}
