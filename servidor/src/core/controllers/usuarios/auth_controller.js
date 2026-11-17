import { login, loginConGoogle, registrarCliente, obtenerPerfil } from "../../services/usuarios/auth_service.js";

// Entrada validada en req.datos (auth_esquemas.js); los errores los responde app.js.

export async function loginController(req, res) {
  const sesion = await login(req.datos.body);
  return res.json({ ok: true, codigo: "LOGIN_OK", mensaje: "Login correcto", ...sesion });
}

export async function registerController(req, res) {
  const { usuario_id } = await registrarCliente(req.datos.body);
  return res.status(201).json({ ok: true, codigo: "REGISTRO_OK", mensaje: "Cuenta creada correctamente", usuario_id });
}

export async function googleController(req, res) {
  const sesion = await loginConGoogle(req.datos.body);
  return res.json({ ok: true, codigo: "LOGIN_OK", mensaje: "Login correcto", ...sesion });
}

export async function meController(req, res) {
  const persona = await obtenerPerfil(req.user.persona_id);
  return res.json({ ok: true, usuario: { ...req.user, ...persona } });
}

// La sesión es un token en el navegador: salir es borrarlo allá. Acá solo se confirma.
export async function logoutController(_req, res) {
  return res.json({ ok: true, mensaje: "Logout OK" });
}
