import ProtectedRoute from "../../controls/acceso/protected_route.jsx";

// acceso: lista de roles, o { roles, permisos, todos } (ver controls/acceso/acceso.js).
export function protegida(element, acceso) {
  const requisitos = Array.isArray(acceso) ? { roles: acceso } : acceso ?? {};
  return <ProtectedRoute {...requisitos}>{element}</ProtectedRoute>;
}
