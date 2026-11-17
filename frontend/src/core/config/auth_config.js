import { clientConfig } from "../../../../proyecto/client_config.js";
import { modulosActivos, tiendaActiva } from "../../proyecto/modulos_activos.js";

// USU-43: a dónde va quien se registra sin venir de otra página. Lo puede poner el rubro
// (`registro.destino` en su modulo.js, ej. su perfil de bienvenida); si no, el destino de siempre.
export const destinoTrasRegistro = modulosActivos.find((modulo) => modulo.registro?.destino)?.registro.destino ?? null;
export const authConfig = {
  storageKey: "token", ...clientConfig.auth,
  defaultDestination: tiendaActiva?.catalogo ?? "/",
  logoutDestination: "/",
  // Vacío = sin botón "Continuar con Google". Es público (no es el client secret).
  // VITE_GOOGLE_ID_CLIENTE (antes VITE_GOOGLE_CLIENT_ID): el mismo valor que GOOGLE_ID_CLIENTE del servidor.
  googleClientId: import.meta.env?.VITE_GOOGLE_ID_CLIENTE || import.meta.env?.VITE_GOOGLE_CLIENT_ID || "",
  endpoints: { login: "/auth/login", google: "/auth/google", me: "/auth/me", logout: "/auth/logout", register: "/auth/register", forgot: "/auth/forgot-password", reset: "/auth/reset-password" },
  loginCampos: { identificadorLabel: "Email o usuario", passwordLabel: "Contraseña", botonLabel: "Ingresar" },
  texts: { title: "Iniciar sesión", subtitle: tiendaActiva?.textoLogin ?? "Ingresá con tu cuenta para continuar.", registerTitle: "Crear cuenta", registerSubtitle: "Completá tus datos para continuar." },
};
export const registroConfig = { titulo: authConfig.texts.registerTitle, subtitulo: authConfig.texts.registerSubtitle, botonLabel: "Crear cuenta", redirigirA: authConfig.defaultDestination };
