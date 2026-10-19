import bcrypt from "bcrypt";
import { sequelize } from "../sequelize.js";
import { env } from "../../configuracion_servidor/env.js";
import { Persona, Usuario, UsuarioRol, Rol, TipoDocumento } from "../../models/index.js";

// Depende de que el rol "admin"/"super_admin" ya exista (ver seed_rbac.js) —
// el orquestador (./index.js) lo llama después.
export async function seed_super_admin() {
  const { SUPERADMIN_NOMBRE, SUPERADMIN_APELLIDO, SUPERADMIN_DNI, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = env;

  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD || !SUPERADMIN_DNI) {
    const faltantes = ["SUPERADMIN_EMAIL", "SUPERADMIN_PASSWORD", "SUPERADMIN_DNI"].filter((clave) => !env[clave]);
    console.log(`⏭️ Super admin: faltan ${faltantes.join(", ")} — se omite su creación`);
    return;
  }

  const documento = String(SUPERADMIN_DNI).replace(/[.\s]/g, "").trim();
  const email = String(SUPERADMIN_EMAIL).trim().toLowerCase();

  await sequelize.transaction(async (t) => {
    const tipoDocumentoDni = await TipoDocumento.findOne({ where: { descripcion: "DNI" }, transaction: t });

    let persona = await Persona.findOne({ where: { documento }, transaction: t });
    if (!persona) {
      persona = await Persona.create({
        nombre: SUPERADMIN_NOMBRE,
        apellido: SUPERADMIN_APELLIDO,
        documento,
        email,
        tipo_documento_id: tipoDocumentoDni?.id ?? null,
      }, { transaction: t });
    }

    let usuario = await Usuario.findOne({ where: { persona_id: persona.id }, transaction: t });
    const nuevo = !usuario;
    if (!usuario) {
      const contrasena = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
      usuario = await Usuario.create(
        { persona_id: persona.id, contrasena, activo: true },
        { transaction: t }
      );
    } else if (!usuario.activo) {
      await usuario.update({ activo: true }, { transaction: t });
    }

    for (const codigo of ["super_admin", "admin"]) {
      const rol = await Rol.findOne({ where: { codigo }, transaction: t });
      if (rol) {
        await UsuarioRol.findOrCreate({
          where: { usuario_id: usuario.id, rol_id: rol.id },
          transaction: t,
        });
      }
    }

    console.log(`✅ Super admin listo: ${persona.email} (usuario_id=${usuario.id}, activo=true, contraseña ${nuevo ? "creada" : "conservada"})`);
    if (persona.email !== email) console.warn("⚠️ SUPERADMIN_EMAIL difiere del email guardado de la persona encontrada por DNI. El seed conserva el email existente.");
    if (!nuevo) console.log("ℹ️ SUPERADMIN_PASSWORD no reemplaza la contraseña existente. Diagnóstico: npm run admin:verificar");
  });
}
