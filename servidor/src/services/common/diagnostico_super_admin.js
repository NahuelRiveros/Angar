import bcrypt from "bcrypt";

// Solo consultas y comparación de hash. Nunca devuelve la contraseña ni el hash.
export async function diagnosticarSuperAdmin({ config, Persona, Usuario }) {
  const email = String(config.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
  const documento = String(config.SUPERADMIN_DNI ?? "").replace(/[.\s]/g, "").trim();
  const password = config.SUPERADMIN_PASSWORD;
  const faltantes = ["SUPERADMIN_EMAIL", "SUPERADMIN_PASSWORD", "SUPERADMIN_DNI"]
    .filter((nombre) => !config[nombre]);
  if (faltantes.length) return {
    ok: false, codigo: "CONFIGURACION_INCOMPLETA",
    mensaje: `Faltan variables: ${faltantes.join(", ")}. La contraseña se configura como SUPERADMIN_PASSWORD.`,
  };

  const porEmail = await Persona.findOne({ where: { email } });
  const porDni = await Persona.findOne({ where: { documento } });
  if (porEmail && porDni && porEmail.id !== porDni.id) return {
    ok: false, codigo: "CUENTAS_DISTINTAS",
    mensaje: "SUPERADMIN_EMAIL y SUPERADMIN_DNI corresponden a personas distintas. Revisá ambos datos antes de modificar una cuenta.",
  };
  const persona = porDni ?? porEmail;
  if (!persona) return {
    ok: false, codigo: "CUENTA_NO_CREADA",
    mensaje: "No existe una persona con el email o DNI configurados en esta base. Revisá los logs del seed y BD_ESQUEMA del servicio.",
  };
  if (persona.email !== email) return {
    ok: false, codigo: "EMAIL_DIFERENTE", emailGuardado: persona.email,
    mensaje: "La persona encontrada por DNI tiene otro email. El seed conserva el email guardado; el email nuevo de Render no permite entrar a esa cuenta.",
  };
  const usuario = await Usuario.findOne({ where: { persona_id: persona.id } });
  if (!usuario) return { ok: false, codigo: "SIN_USUARIO", mensaje: "La persona existe, pero no tiene una cuenta de usuario. Revisá si el seed completó la creación." };
  if (usuario.eliminado_en) return { ok: false, codigo: "USUARIO_ELIMINADO", mensaje: "La cuenta está marcada como eliminada. Cambiar las variables no la restaura." };
  if (!usuario.activo) return { ok: false, codigo: "USUARIO_INACTIVO", mensaje: "La cuenta está inactiva." };
  const coincide = await bcrypt.compare(String(password), usuario.contrasena ?? "").catch(() => false);
  if (!coincide) return {
    ok: false, codigo: "PASSWORD_DIFERENTE",
    mensaje: "SUPERADMIN_PASSWORD no coincide con la contraseña guardada. El seed no la cambia para cuentas existentes. Usá la contraseña original o la recuperación de acceso.",
  };
  const roles = (await usuario.getRoles({ attributes: ["codigo"], joinTableAttributes: [] })).map((r) => r.codigo);
  if (!roles.includes("super_admin") && !roles.includes("admin")) return {
    ok: false, codigo: "SIN_ROL_ADMIN", mensaje: "Las credenciales coinciden, pero la cuenta no tiene rol de administrador.",
  };
  return { ok: true, codigo: "CREDENCIALES_CORRECTAS", mensaje: "El email y SUPERADMIN_PASSWORD coinciden con una cuenta administradora activa en esta base." };
}
