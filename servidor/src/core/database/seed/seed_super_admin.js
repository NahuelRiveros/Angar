import bcrypt from "bcrypt";
import { sequelize } from "../sequelize.js";
import { env, SUPERADMIN_EMAIL_FIJO } from "../../configuracion_servidor/env.js";
import { Persona, Usuario, UsuarioRol, Rol } from "../../models/index.js";
import { esNombreUsuarioValido, normalizarNombreUsuario } from "../../services/common/nombre_usuario.js";

/**
 * Crea el super admin una sola vez, con SUPERADMIN_USUARIO y SUPERADMIN_CONTRASENA. El email es
 * siempre SUPERADMIN_EMAIL_FIJO (el mismo en todos los proyectos), para recuperar el acceso.
 * Si la cuenta ya existe, no se cambia la contraseña: un deploy nunca pisa una clave cambiada desde la app.
 * Depende de que el rol "admin"/"super_admin" ya exista (ver seed_rbac.js); lo llama ./index.js.
 */
export async function seed_super_admin({ config = env } = {}) {
  const nombre_usuario = normalizarNombreUsuario(config.SUPERADMIN_USUARIO);
  const contrasena = config.SUPERADMIN_CONTRASENA;
  if (!nombre_usuario || !contrasena) {
    console.log("⏭️ Super admin: faltan SUPERADMIN_USUARIO o SUPERADMIN_CONTRASENA — se omite su creación");
    return null;
  }
  if (!esNombreUsuarioValido(nombre_usuario)) {
    console.warn("⚠️ SUPERADMIN_USUARIO no es válido: 3 a 30 letras, números, punto, guion o guion bajo (sin @). Se omite.");
    return null;
  }

  return sequelize.transaction(async (transaction) => {
    let usuario = await Usuario.findOne({ where: { nombre_usuario }, transaction });
    let nuevo = false;
    if (!usuario) {
      // Si ya hay una persona con el email fijo (un admin de antes), se usa esa en vez de duplicarla.
      const persona = await Persona.findOne({ where: { email: SUPERADMIN_EMAIL_FIJO }, transaction })
        ?? await Persona.create({ nombre: "Super", apellido: "Admin", email: SUPERADMIN_EMAIL_FIJO }, { transaction });
      usuario = await Usuario.findOne({ where: { persona_id: persona.id }, transaction });
      if (usuario) {
        if (!usuario.nombre_usuario) await usuario.update({ nombre_usuario }, { transaction });
        else console.warn(`⚠️ El admin con el email fijo ya entra con otro usuario ("${usuario.nombre_usuario}"): no se cambia.`);
      } else {
        usuario = await Usuario.create({ persona_id: persona.id, nombre_usuario, contrasena: await bcrypt.hash(String(contrasena), 10), activo: true }, { transaction });
        nuevo = true;
      }
    }
    if (!usuario.activo) await usuario.update({ activo: true }, { transaction });

    for (const codigo of ["super_admin", "admin"]) {
      const rol = await Rol.findOne({ where: { codigo }, transaction });
      if (rol) await UsuarioRol.findOrCreate({ where: { usuario_id: usuario.id, rol_id: rol.id }, transaction });
    }
    console.log(`✅ Super admin listo: usuario "${usuario.nombre_usuario}" (contraseña ${nuevo ? "creada" : "conservada"})`);
    if (!nuevo) console.log("ℹ️ SUPERADMIN_CONTRASENA no reemplaza la contraseña existente. Diagnóstico: npm run admin:verificar");
    return usuario;
  });
}
