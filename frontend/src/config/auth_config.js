import { clientConfig } from "../../../client_config.js";
import { projectModules } from "./gate_config.js";
const tienda = projectModules.eccomerce_distribuidora || projectModules.eccomerce_indumentaria;
export const authConfig = {
  storageKey: "token", ...clientConfig.auth,
  defaultDestination: projectModules.eccomerce_distribuidora ? "/distribuidora/catalogo" : "/",
  logoutDestination: "/",
  // Vacío = sin botón "Continuar con Google". Es público (no es el client secret).
  googleClientId: import.meta.env?.VITE_GOOGLE_CLIENT_ID ?? "",
  endpoints: { login: "/auth/login", google: "/auth/google", me: "/auth/me", logout: "/auth/logout", register: "/auth/register", forgot: "/auth/forgot-password", reset: "/auth/reset-password" },
  loginCampos: { identificadorLabel: "Email o usuario", passwordLabel: "Contraseña", botonLabel: "Ingresar" },
  texts: { title: "Iniciar sesión", subtitle: tienda ? "Ingresá para enviar y consultar tus pedidos." : "Ingresá con tu cuenta para continuar.", registerTitle: "Crear cuenta", registerSubtitle: "Completá tus datos para continuar." },
};
export const registroConfig = { titulo: authConfig.texts.registerTitle, subtitulo: authConfig.texts.registerSubtitle, botonLabel: "Crear cuenta", redirigirA: authConfig.defaultDestination };
