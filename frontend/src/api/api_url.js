import { deploymentConfig } from "../../../deployment_config.js";

export function resolverApiUrl(valor, desarrollo = false) {
  const configurada = String(valor ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").replace(/\/+$/, "");
  const direccion = configurada || (desarrollo ? "http://localhost:3001/api" : `${deploymentConfig.backendUrl}/api`);
  let url;
  try { url = new URL(direccion); } catch { throw new Error("VITE_API_URL debe ser la URL completa del backend, terminada en /api."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || !url.pathname.endsWith("/api")) {
    throw new Error("VITE_API_URL debe ser una URL http(s) del backend terminada en /api, sin credenciales ni parámetros.");
  }
  if (url.hostname === "dynamic-gym.onrender.com") {
    throw new Error(`VITE_API_URL apunta al backend anterior. Configurá ${deploymentConfig.backendUrl}/api y volvé a desplegar.`);
  }
  return direccion;
}
