import { requestPasswordReset, resetPassword } from "../../services/usuarios/password_recovery_service.js";
export async function forgotPasswordController(req, res) {
  try { return res.json(await requestPasswordReset(req.body?.email)); }
  catch (e) {
    if (e.status === 503) return res.status(503).json({ ok: false, mensaje: e.message });
    console.error("No se pudo procesar la recuperación");
    // Mismo resultado para cuentas desconocidas y fallos de entrega.
    return res.json({ ok: true, mensaje: "Si existe una cuenta con ese email, recibirás un enlace para recuperar el acceso." });
  }
}
export async function secureResetPasswordController(req, res) {
  try { return res.json(await resetPassword(req.body?.token, req.body?.newPassword)); }
  catch (e) { return res.status(e.status ?? 500).json({ ok: false, mensaje: e.status ? e.message : "No pudimos cambiar la contraseña." }); }
}
