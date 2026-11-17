import bcrypt from "bcrypt";
import { normalizarNombreUsuario } from "./nombre_usuario.js";

// Solo consultas y comparación de hash. Nunca devuelve la contraseña ni el hash.
export async function diagnosticarSuperAdmin({ config, Usuario }) {
  const nombre_usuario = normalizarNombreUsuario(config.SUPERADMIN_USUARIO);
  const contrasena = config.SUPERADMIN_CONTRASENA;
  const faltantes = [["SUPERADMIN_USUARIO", nombre_usuario], ["SUPERADMIN_CONTRASENA", contrasena]].filter(([, valor]) => !valor).map(([nombre]) => nombre);
  if (faltantes.length) return {
    ok: false, codigo: "CONFIGURACION_INCOMPLETA",
    mensaje: `Faltan variables: ${faltantes.join(", ")}.`,
  };

  const usuario = await Usuario.findOne({ where: { nombre_usuario } });
  if (!usuario) return {
    ok: false, codigo: "CUENTA_NO_CREADA",
    mensaje: "No existe un usuario con SUPERADMIN_USUARIO en esta base. Revisá los logs del seed y BD_ESQUEMA del servicio.",
  };
  if (usuario.eliminado_en) return { ok: false, codigo: "USUARIO_ELIMINADO", mensaje: "La cuenta está marcada como eliminada. Cambiar las variables no la restaura." };
  if (!usuario.activo) return { ok: false, codigo: "USUARIO_INACTIVO", mensaje: "La cuenta está inactiva." };
  const coincide = await bcrypt.compare(String(contrasena), usuario.contrasena ?? "").catch(() => false);
  if (!coincide) return {
    ok: false, codigo: "CONTRASENA_DIFERENTE",
    mensaje: "SUPERADMIN_CONTRASENA no coincide con la guardada. El seed no la cambia para cuentas existentes: usá la contraseña original o \"Olvidé mi contraseña\" (llega al email fijo del admin).",
  };
  const roles = (await usuario.getRoles({ attributes: ["codigo"], joinTableAttributes: [] })).map((r) => r.codigo);
  if (!roles.includes("super_admin") && !roles.includes("admin")) return {
    ok: false, codigo: "SIN_ROL_ADMIN", mensaje: "Las credenciales coinciden, pero la cuenta no tiene rol de administrador.",
  };
  return { ok: true, codigo: "CREDENCIALES_CORRECTAS", mensaje: "SUPERADMIN_USUARIO y SUPERADMIN_CONTRASENA coinciden con una cuenta administradora activa en esta base." };
}
