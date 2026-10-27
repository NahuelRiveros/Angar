import { crearUsuarioConRol } from "../../services/usuarios/auth_seed_service.js";

export async function seedAdmin(req, res) {
  try {
    const { email, password, nombre, apellido, documento } = req.body ?? {};
    const result = await crearUsuarioConRol({ email, password, nombre, apellido, documento, rolCodigo: "admin" });
    return result.ok ? res.json(result) : res.status(400).json(result);
  } catch (e) {
    console.error("seedAdmin:", e);
    return res.status(500).json({ ok: false, codigo: "ERROR_SEED_ADMIN", mensaje: "No se pudo crear admin" });
  }
}

export async function seedStaff(req, res) {
  try {
    const { email, password, nombre, apellido, documento } = req.body ?? {};
    const result = await crearUsuarioConRol({ email, password, nombre, apellido, documento, rolCodigo: "soporte" });
    return result.ok ? res.json(result) : res.status(400).json(result);
  } catch (e) {
    console.error("seedStaff:", e);
    return res.status(500).json({ ok: false, codigo: "ERROR_SEED_STAFF", mensaje: "No se pudo crear staff" });
  }
}
