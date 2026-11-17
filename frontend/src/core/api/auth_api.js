import { http } from "./http";
import { authConfig } from "../config/auth_config";

export async function authLogin(data) {
  const r = await http.post("/auth/login", data);
  const token = r.data?.token;
  if (token) localStorage.setItem(authConfig.storageKey, token);
  return r.data;
}

export async function authMe() {
  const r = await http.get("/auth/me");
  return r.data;
}

export async function authLogout() {
  try {
    await http.post("/auth/logout");
  } finally {
    localStorage.removeItem(authConfig.storageKey);
  }
}

export async function authRegister(data) {
  const r = await http.post(authConfig.endpoints.register, data);
  return r.data;
}
