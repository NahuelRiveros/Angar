import axios from "axios";
import { authConfig } from "../config/auth_config";
import { resolverApiUrl } from "./api_url.js";

const API_URL = resolverApiUrl(import.meta.env.VITE_API_URL, import.meta.env.DEV);

export const http = axios.create({ baseURL: API_URL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(authConfig.storageKey);
  if (token && !config.publicAccess) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Cuando el servidor responde 401 (token vencido o ausente), limpia la sesión
// y redirige al login automáticamente desde cualquier página protegida.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(authConfig.storageKey);
      if (!error.config?.url?.startsWith("/auth/login")) window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  }
);
