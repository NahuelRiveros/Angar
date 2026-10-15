/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useCallback, useState } from "react";
import { http } from "../api/http.js";
import { authConfig } from "../config/auth_config.js";
import { getEstadoModulos } from "../api/modulos_api.js";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(!!localStorage.getItem(authConfig.storageKey));
  const [modulosHabilitados, setModulosHabilitados] = useState(null);
  const cargarMe = useCallback(async () => {
    const r = await http.get(authConfig.endpoints.me);
    if (!r.data?.usuario) throw new Error("No pudimos verificar tu sesión. Intentá ingresar nuevamente.");
    setUsuario(r.data.usuario);
    return r.data.usuario;
  }, []);
  const cargarModulos = useCallback(async () => {
    try { const r = await getEstadoModulos(); setModulosHabilitados(r?.modulos ?? null); } catch { setModulosHabilitados(null); }
  }, []);
  useEffect(() => {
    let active = true;
    const expired = () => { setUsuario(null); setModulosHabilitados(null); };
    window.addEventListener("auth:expired", expired);
    if (localStorage.getItem(authConfig.storageKey)) {
      http.get(authConfig.endpoints.me).then((r) => { if (active) setUsuario(r.data?.usuario ?? null); })
        .catch(() => { if (active) setUsuario(null); }).finally(() => { if (active) setCargando(false); });
      cargarModulos();
    }
    return () => { active = false; window.removeEventListener("auth:expired", expired); };
  }, [cargarModulos]);
  // Login con contraseña y con Google terminan igual: token guardado, perfil y módulos cargados.
  const iniciarSesion = useCallback(async (endpoint, payload) => {
    const r = await http.post(endpoint, payload);
    if (!r.data?.token) throw new Error("No pudimos iniciar la sesión.");
    localStorage.setItem(authConfig.storageKey, r.data.token);
    try { await cargarMe(); await cargarModulos(); }
    catch (e) { localStorage.removeItem(authConfig.storageKey); setUsuario(null); throw e; }
    return r.data;
  }, [cargarMe, cargarModulos]);
  const login = useCallback((payload) => iniciarSesion(authConfig.endpoints.login, payload), [iniciarSesion]);
  const loginConGoogle = useCallback((credencial) => iniciarSesion(authConfig.endpoints.google, { credencial }), [iniciarSesion]);
  const logout = useCallback(async () => {
    try { await http.post(authConfig.endpoints.logout); } catch { /* La sesión local se cierra aunque no haya conexión. */ }
    finally { localStorage.removeItem(authConfig.storageKey); setUsuario(null); setModulosHabilitados(null); }
  }, []);
  const value = useMemo(() => ({ usuario, cargando, isAuth: !!usuario, modulosHabilitados, login, loginConGoogle, logout, recargarUsuario: cargarMe }), [usuario, cargando, modulosHabilitados, login, loginConGoogle, logout, cargarMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("Falta AuthProvider"); return context; }
