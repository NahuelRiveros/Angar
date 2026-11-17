import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { spawnSync } from "node:child_process";
import { diagnosticarSuperAdmin } from "../src/services/common/diagnostico_super_admin.js";

// El super admin se configura con SUPERADMIN_USUARIO y SUPERADMIN_CONTRASENA (el email es fijo, en env.js).
const config = { SUPERADMIN_USUARIO: "dueno.admin", SUPERADMIN_CONTRASENA: "ClaveInicial123" };
const hash = await bcrypt.hash(config.SUPERADMIN_CONTRASENA, 4);
function contexto({ usuario = {}, roles = ["super_admin"], configuracion = config } = {}) {
  return {
    config: configuracion,
    Usuario: { async findOne({ where }) {
      if (usuario === null || where.nombre_usuario !== configuracion.SUPERADMIN_USUARIO.trim().toLowerCase()) return null;
      return { activo: true, contrasena: hash, eliminado_en: null, ...usuario, async getRoles() { return roles.map((codigo) => ({ codigo })); } };
    } },
  };
}

test("diagnóstico admin: detecta credenciales correctas y nunca devuelve contraseña ni hash", async () => {
  const resultado = await diagnosticarSuperAdmin(contexto());
  assert.equal(resultado.codigo, "CREDENCIALES_CORRECTAS");
  assert.equal(resultado.ok, true);
  assert(!JSON.stringify(resultado).includes(config.SUPERADMIN_CONTRASENA));
  assert(!JSON.stringify(resultado).includes(hash));
  // El usuario no distingue mayúsculas ni espacios a los costados.
  assert.equal((await diagnosticarSuperAdmin(contexto({ configuracion: { ...config, SUPERADMIN_USUARIO: " Dueno.Admin " } }))).codigo, "CREDENCIALES_CORRECTAS");
});

test("diagnóstico admin: detecta la contraseña anterior conservada (el seed no la pisa)", async () => {
  const resultado = await diagnosticarSuperAdmin(contexto({ configuracion: { ...config, SUPERADMIN_CONTRASENA: "OtraClave456" } }));
  assert.equal(resultado.codigo, "CONTRASENA_DIFERENTE");
  assert.equal(resultado.ok, false);
});

test("diagnóstico admin: informa variables faltantes, cuenta ausente y estados que impiden el acceso", async () => {
  const sinUsuario = await diagnosticarSuperAdmin(contexto({ configuracion: { SUPERADMIN_USUARIO: "", SUPERADMIN_CONTRASENA: "x" } }));
  assert.equal(sinUsuario.codigo, "CONFIGURACION_INCOMPLETA");
  assert.match(sinUsuario.mensaje, /SUPERADMIN_USUARIO/);
  assert.equal((await diagnosticarSuperAdmin(contexto({ configuracion: { SUPERADMIN_USUARIO: "dueno.admin", SUPERADMIN_CONTRASENA: "" } }))).codigo, "CONFIGURACION_INCOMPLETA");
  assert.equal((await diagnosticarSuperAdmin(contexto({ usuario: null }))).codigo, "CUENTA_NO_CREADA");
  assert.equal((await diagnosticarSuperAdmin(contexto({ usuario: { activo: false } }))).codigo, "USUARIO_INACTIVO");
  assert.equal((await diagnosticarSuperAdmin(contexto({ usuario: { eliminado_en: "2026-10-01" } }))).codigo, "USUARIO_ELIMINADO");
  assert.equal((await diagnosticarSuperAdmin(contexto({ roles: ["jugador"] }))).codigo, "SIN_ROL_ADMIN");
  assert.equal((await diagnosticarSuperAdmin(contexto({ roles: ["admin"] }))).codigo, "CREDENCIALES_CORRECTAS", "admin también vale");
});

// env.js en un proceso aparte: lee process.env al importarse.
function leerEnv(variables) {
  const envJs = new URL("../src/configuracion_servidor/env.js", import.meta.url).href;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", `const { env } = await import(${JSON.stringify(envJs)}); console.log(JSON.stringify(env));`], {
    encoding: "utf8",
    // Sin las variables de esta PC (ni su .env.local, que no pisa lo ya cargado): solo lo de la prueba.
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: "test", BD_URL_SUPABASE: "", BD_URL: "", BD_SSL: "", DB_SSL: "", CLAVE_SESIONES: "", JWT_SECRET: "", URL_API_RENDER: "", RENDER_APP_URL: "", GOOGLE_ID_CLIENTE: "", GOOGLE_CLIENT_ID: "", SUPERADMIN_USUARIO: "", SUPERADMIN_CONTRASENA: "", SUPERADMIN_PASSWORD: "", ...variables },
  });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test("env: lee los nombres nuevos en español y activa SSL solo con base remota", () => {
  const env = leerEnv({
    BD_URL_SUPABASE: "postgresql://u:clave@aws-0-ej.pooler.supabase.com:5432/postgres", CLAVE_SESIONES: "nueva",
    URL_FRONTEND_VERCEL: "https://web.example.test", URL_API_RENDER: "https://api.example.test",
    GOOGLE_ID_CLIENTE: "id-google", SUPERADMIN_USUARIO: "admin", SUPERADMIN_CONTRASENA: "clave-admin",
  });
  assert.equal(env.BD_URL, "postgresql://u:clave@aws-0-ej.pooler.supabase.com:5432/postgres");
  assert.equal(env.DB_SSL, true);
  assert.equal(env.JWT_SECRET, "nueva");
  assert.equal(env.VERCEL_FRONTEND_URL, "https://web.example.test");
  assert.equal(env.RENDER_APP_URL, "https://api.example.test");
  assert.equal(env.GOOGLE_CLIENT_ID, "id-google");
  assert.equal(env.SUPERADMIN_USUARIO, "admin");
  assert.equal(env.SUPERADMIN_CONTRASENA, "clave-admin");
  assert.equal(leerEnv({}).DB_SSL, false, "sin base remota (tu PC), sin SSL");
});

test("env: un Render con los nombres anteriores sigue andando; el nuevo gana si están los dos", () => {
  const env = leerEnv({ BD_URL: "postgresql://u:c@h:5432/p", JWT_SECRET: "vieja", RENDER_APP_URL: "https://api-vieja.example.test", GOOGLE_CLIENT_ID: "id-viejo", SUPERADMIN_PASSWORD: "clave-vieja" });
  assert.equal(env.BD_URL, "postgresql://u:c@h:5432/p");
  assert.equal(env.JWT_SECRET, "vieja");
  assert.equal(env.RENDER_APP_URL, "https://api-vieja.example.test");
  assert.equal(env.GOOGLE_CLIENT_ID, "id-viejo");
  assert.equal(env.SUPERADMIN_CONTRASENA, "clave-vieja");
  assert.equal(leerEnv({ CLAVE_SESIONES: "nueva", JWT_SECRET: "vieja" }).JWT_SECRET, "nueva");
  assert.equal(leerEnv({ BD_URL: "postgresql://u:c@h:5432/p", BD_SSL: "false" }).DB_SSL, false, "BD_SSL todavía fuerza el valor a mano");
});

test("env: en producción sin CLAVE_SESIONES (ni JWT_SECRET) el servidor no arranca", () => {
  const envJs = new URL("../src/configuracion_servidor/env.js", import.meta.url).href;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(envJs)})`], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: "production", CLAVE_SESIONES: "", JWT_SECRET: "", CLOUDINARY_NOMBRE_CUENTA: "x", CLOUDINARY_CLAVE_API: "x", CLOUDINARY_SECRETO_API: "x" },
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /CLAVE_SESIONES/);
});
