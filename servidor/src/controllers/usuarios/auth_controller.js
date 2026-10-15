import { login, registrarCliente, obtenerPerfil } from "../../services/usuarios/auth_service.js";

export async function loginController(req, res) {
  try {
    // `email` se sigue aceptando mientras Vercel publica la web nueva (manda `identificador`).
    const { identificador, email, password } = req.body ?? {};
    const result = await login({ identificador: identificador ?? email, password });
    return result.ok ? res.json(result) : res.status(401).json(result);
  } catch (error) {
    console.error("loginController:", error);
    return res.status(500).json({ ok: false, codigo: "ERROR_LOGIN", mensaje: "No se pudo hacer login" });
  }
}

export async function registerController(req, res) {
  try {
    const { nombre, apellido, email, password } = req.body ?? {};
    const result = await registrarCliente({ nombre, apellido, email, password });
    return result.ok ? res.status(201).json(result) : res.status(400).json(result);
  } catch (error) {
    console.error("registerController:", error);
    return res.status(500).json({ ok: false, codigo: "ERROR_REGISTRO", mensaje: "No se pudo completar el registro" });
  }
}

export async function meController(req, res, next) {
  try {
    const r = await obtenerPerfil(req.user.persona_id);
    return res.json({
      ok: true,
      usuario: { ...req.user, ...r.persona },
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutController(_req, res) {
  return res.json({ ok: true, mensaje: "Logout OK" });
}

