import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { diagnosticarSuperAdmin } from "../src/services/common/diagnostico_super_admin.js";

const config = { SUPERADMIN_EMAIL: "admin@example.test", SUPERADMIN_DNI: "12345678", SUPERADMIN_PASSWORD: "ClaveInicial123" };
const hash = await bcrypt.hash(config.SUPERADMIN_PASSWORD, 4);
function contexto({ email = config.SUPERADMIN_EMAIL, usuario = {}, roles = ["super_admin"], personaExiste = true } = {}) {
  const persona = { id: 1, email, documento: config.SUPERADMIN_DNI };
  return {
    config,
    Persona: { async findOne({ where }) {
      if (!personaExiste) return null;
      return where.email === persona.email || where.documento === persona.documento ? persona : null;
    } },
    Usuario: { async findOne() {
      return usuario === null ? null : { activo: true, contrasena: hash, ...usuario, async getRoles() { return roles.map((codigo) => ({ codigo })); } };
    } },
  };
}

test("diagnóstico admin: detecta credenciales correctas y nunca devuelve contraseña ni hash", async () => {
  const resultado = await diagnosticarSuperAdmin(contexto());
  assert.equal(resultado.codigo, "CREDENCIALES_CORRECTAS");
  assert.equal(resultado.ok, true);
  assert(!JSON.stringify(resultado).includes(config.SUPERADMIN_PASSWORD));
  assert(!JSON.stringify(resultado).includes(hash));
});

test("diagnóstico admin: detecta contraseña anterior conservada y email distinto al configurado", async () => {
  const anterior = contexto();
  anterior.config = { ...config, SUPERADMIN_PASSWORD: "OtraClave456" };
  assert.equal((await diagnosticarSuperAdmin(anterior)).codigo, "PASSWORD_DIFERENTE");
  const emailDiferente = await diagnosticarSuperAdmin(contexto({ email: "anterior@example.test" }));
  assert.equal(emailDiferente.codigo, "EMAIL_DIFERENTE");
  assert.equal(emailDiferente.emailGuardado, "anterior@example.test");
});

test("diagnóstico admin: informa variables incorrectas, cuentas ausentes y estados que impiden el acceso", async () => {
  const incompleto = contexto();
  incompleto.config = { ...config, SUPERADMIN_PASSWORD: "", SUPERADMIN_CONTRASENA: "OtraClave456" };
  assert.equal((await diagnosticarSuperAdmin(incompleto)).codigo, "CONFIGURACION_INCOMPLETA");
  assert.equal((await diagnosticarSuperAdmin(contexto({ personaExiste: false }))).codigo, "CUENTA_NO_CREADA");
  assert.equal((await diagnosticarSuperAdmin(contexto({ usuario: null }))).codigo, "SIN_USUARIO");
  assert.equal((await diagnosticarSuperAdmin(contexto({ usuario: { activo: false } }))).codigo, "USUARIO_INACTIVO");
  assert.equal((await diagnosticarSuperAdmin(contexto({ usuario: { eliminado_en: "2026-10-01" } }))).codigo, "USUARIO_ELIMINADO");
  assert.equal((await diagnosticarSuperAdmin(contexto({ roles: ["jugador"] }))).codigo, "SIN_ROL_ADMIN");
});

test("diagnóstico admin: detecta que email y DNI pertenecen a personas distintas", async () => {
  const ctx = contexto();
  ctx.Persona.findOne = async ({ where }) => where.email ? { id: 2, email: config.SUPERADMIN_EMAIL } : { id: 1, email: "anterior@example.test" };
  assert.equal((await diagnosticarSuperAdmin(ctx)).codigo, "CUENTAS_DISTINTAS");
});
