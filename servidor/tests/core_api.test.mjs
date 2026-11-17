import test, { after, before } from "node:test";
import assert from "node:assert/strict";

// Sin base: cualquier consulta falla al instante. Estos tests cubren lo que se resuelve antes de
// llegar a la base (validación, sesión, permisos) y el formato de los errores.
process.env.NODE_ENV = "test";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.JWT_SECRET = "clave-solo-para-tests";

const { createApp } = await import("../src/core/app.js");
const { esquemaFiscal } = await import("../src/core/services/usuarios/perfil_fiscal_service.js");
const { esquemaRegistro } = await import("../src/core/services/usuarios/auth_esquemas.js");

let servidor;
let base;
before(async () => {
  servidor = createApp().listen(0);
  await new Promise((listo) => servidor.once("listening", listo));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(() => servidor.close());

const pedir = async (metodo, ruta, body) => {
  const r = await fetch(base + ruta, { method: metodo, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  return { estado: r.status, json: await r.json() };
};

test("COR-20: una entrada inválida responde 400 con el error en español y por campo", async () => {
  const { estado, json } = await pedir("POST", "/auth/register", { nombre: "Ana", apellido: "Paz", email: "no-es-email", password: "12345678" });
  assert.equal(estado, 400);
  assert.equal(json.ok, false);
  assert.equal(json.codigo, "DATOS_INVALIDOS");
  assert.equal(json.mensaje, "Ingresá un email válido");
  assert.deepEqual(json.errores.map((e) => e.campo), ["email"]);
});

test("USU-01: el login sin datos se rechaza antes de buscar la cuenta", async () => {
  const { estado, json } = await pedir("POST", "/auth/login", {});
  assert.equal(estado, 400);
  assert.equal(json.mensaje, "Ingresá tu email o usuario.");
});

test("SIS-37: gestionar banners pide ingresar", async () => {
  const { estado, json } = await pedir("POST", "/banners", { tipo: "cinta", titulo: "Promo" });
  assert.equal(estado, 401);
  assert.equal(json.codigo, "NO_AUTH");
});

test("USU-40: los datos fiscales propios piden ingresar", async () => {
  const { estado } = await pedir("PUT", "/perfil/fiscal", { condicion_iva: "monotributista", cuit: "20-12345678-6" });
  assert.equal(estado, 401);
});

test("USU-11 y USU-13: el registro normaliza email y usuario, y el usuario es opcional", () => {
  const { data } = esquemaRegistro.safeParse({ nombre: " Ana ", apellido: "Paz", email: " Ana@Mail.COM ", password: "12345678", nombre_usuario: "Ana.P" });
  assert.equal(data.email, "ana@mail.com");
  assert.equal(data.nombre_usuario, "ana.p");
  assert.equal(data.nombre, "Ana");
  assert.equal(esquemaRegistro.safeParse({ nombre: "A", apellido: "B", email: "a@b.co", password: "12345678", nombre_usuario: "" }).data.nombre_usuario, null);
  assert.equal(esquemaRegistro.safeParse({ nombre: "A", apellido: "B", email: "a@b.co", password: "corta" }).success, false);
});

test("USU-41: datos fiscales validados con fiscal_config y CUIT guardado con guiones", () => {
  const ok = esquemaFiscal.safeParse({ condicion_iva: "responsable_inscripto", cuit: "20123456786", razon_social: "  " });
  assert.equal(ok.success, true);
  assert.equal(ok.data.cuit, "20-12345678-6");
  assert.equal(ok.data.razon_social, null);

  const cuitMal = esquemaFiscal.safeParse({ condicion_iva: "monotributista", cuit: "20123456780" });
  assert.equal(cuitMal.success, false);
  assert.equal(cuitMal.error.issues[0].path[0], "cuit");

  // Consumidor final puede usar DNI.
  assert.equal(esquemaFiscal.safeParse({ condicion_iva: "consumidor_final", cuit: "30123456" }).data.cuit, "30123456");
});
