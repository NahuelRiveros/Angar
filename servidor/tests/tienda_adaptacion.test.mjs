import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";

// Cómo un proyecto adapta la tienda sin tocar los módulos (MOD-15 y MOD-16). Sin base.
process.env.NODE_ENV = "test";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.JWT_SECRET = "clave-solo-para-tests";

const { TIENDA_POR_DEFECTO, opcionesTienda } = await import("../../core/tienda_opciones.js");
const { crearPedidosRouter } = await import("../src/core/opcionales/pedidos/pedidos_router.js");
const { unirRutas } = await import("../../frontend/src/core/app/unir_rutas.js");

test("MOD-15: sin tienda_config valen los de siempre; lo que se pone pisa solo eso", () => {
  assert.deepEqual(opcionesTienda().opciones, TIENDA_POR_DEFECTO);
  const { opciones, problemas } = opcionesTienda({ entregas: ["retiro"], textos: { pieFormulario: "" } });
  assert.deepEqual(problemas, []);
  assert.deepEqual(opciones.entregas, ["retiro"]);
  assert.equal(opciones.textos.pieFormulario, "");
  assert.equal(opciones.textos.retiro, TIENDA_POR_DEFECTO.textos.retiro, "los otros textos quedan");
  assert.equal(opciones.exigirCuenta, false);
});

test("MOD-15: lo mal escrito se avisa con un mensaje claro (y el servidor no arranca)", () => {
  const avisos = (propias) => opcionesTienda(propias).problemas.join(" | ");
  assert.match(avisos({ exigirCuenta: "si" }), /exigirCuenta va true o false/);
  assert.match(avisos({ entregas: [] }), /entregas es una lista/);
  assert.match(avisos({ entregas: ["retiro", "moto"] }), /entregas es una lista/);
  assert.match(avisos({ entregas: ["retiro", "retiro"] }), /sin repetir/);
  assert.match(avisos({ mostrarStock: true }), /"mostrarStock" no es una opción/);
  assert.match(avisos({ textos: { saludo: "Hola" } }), /textos.saludo no es un texto que se use/);
  assert.match(avisos({ textos: { retiro: 3 } }), /textos.retiro tiene que ser un texto/);
});

let servidores = [];
const levantar = async (opciones) => {
  const s = express().use(express.json()).use("/pedidos", crearPedidosRouter(opciones)).listen(0);
  await new Promise((listo) => s.once("listening", listo));
  servidores.push(s);
  return (cuerpo) => fetch(`http://127.0.0.1:${s.address().port}/pedidos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
};
const pedido = (extra) => ({ clave_envio: randomUUID(), nombre: "Ana", celular: "1123456789", entrega: "retiro", items: [{ variante_id: 1, cantidad: 1 }], ...extra });
before(() => { servidores = []; });
after(() => servidores.forEach((s) => s.close()));

test("MOD-15 y MPE-06: con exigirCuenta, pedir sin ingresar se rechaza antes de mirar nada", async () => {
  const enviar = await levantar({ ...TIENDA_POR_DEFECTO, exigirCuenta: true });
  const r = await enviar(pedido());
  assert.equal(r.status, 401);
});

test("MOD-15 y MPE-12: si el proyecto apaga el envío, un pedido con envío no pasa", async () => {
  const enviar = await levantar({ ...TIENDA_POR_DEFECTO, entregas: ["retiro"] });
  const r = await enviar(pedido({ entrega: "envio", direccion: "Calle 1", localidad: "Centro" }));
  assert.equal(r.status, 400);
  assert.equal((await r.json()).errores[0].campo, "entrega");
});

test("MOD-16: si un rubro declara la misma dirección que un módulo, queda la del rubro", () => {
  const modulo = { codigo: "catalogo", rutasTienda: [{ path: "/catalogo", element: "del módulo" }, { path: "/catalogo/:slug", element: "ficha" }] };
  const rubro = { codigo: "moto", rutasTienda: [{ path: "/catalogo", element: "del rubro" }, { path: "/turnos", element: "turnos" }] };
  assert.deepEqual(unirRutas([modulo, rubro], "rutasTienda").map((r) => [r.path, r.element]), [["/catalogo", "del rubro"], ["/catalogo/:slug", "ficha"], ["/turnos", "turnos"]]);
  assert.deepEqual(unirRutas([modulo, { codigo: "x" }], "rutasPanel"), []);
});
