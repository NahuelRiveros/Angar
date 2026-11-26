import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import express from "express";

// Sin base: cualquier consulta falla al instante. Spec: docs/specs/core/stock.md.
process.env.NODE_ENV = "test";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.JWT_SECRET = "clave-solo-para-tests";

const { efectoDelPedido, esquemaControlar, esquemaMovimiento, estadoStock, variacion } = await import("../src/core/opcionales/stock/reglas.js");
const { stockRouter } = await import("../src/core/opcionales/stock/stock_router.js");
const enganches = await import("../src/core/opcionales/enganches.js");
const { MODULOS_OPCIONALES, permisosOpcionales, resolverModulos } = await import("../../core/modulos_opcionales.js");

const errores = (esquema, datos) => {
  const r = esquema.safeParse(datos);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

test("MST-03: entrada suma, salida resta, ajuste deja lo contado; nunca queda negativo", () => {
  assert.deepEqual(variacion("entrada", 5, 2), { delta: 5, saldo: 7 });
  assert.deepEqual(variacion("salida", 2, 2), { delta: -2, saldo: 0 });
  assert.deepEqual(variacion("ajuste", 3, 10), { delta: -7, saldo: 3 });
  assert.deepEqual(variacion("ajuste", 0, 4), { delta: -4, saldo: 0 });
  assert.match(variacion("salida", 3, 2).error, /hay 2 y querés sacar 3/);
  assert.match(variacion("entrada", 1, 1000000).error, /no puede pasar/);
});

test("MST-03: salidas y ajustes piden motivo; cantidades enteras", () => {
  assert.deepEqual(errores(esquemaMovimiento, { tipo: "entrada", cantidad: 3 }), []);
  assert.deepEqual(errores(esquemaMovimiento, { tipo: "salida", cantidad: 3, motivo: "  " }).map((e) => e.split(":")[0]), ["motivo"]);
  assert.deepEqual(errores(esquemaMovimiento, { tipo: "ajuste", cantidad: 0, motivo: "Conteo" }), [], "un ajuste puede dejar 0");
  assert.deepEqual(errores(esquemaMovimiento, { tipo: "entrada", cantidad: 0 }).map((e) => e.split(":")[0]), ["cantidad"]);
  for (const cantidad of [-1, 1.5, "x"]) assert.ok(errores(esquemaMovimiento, { tipo: "entrada", cantidad }).length > 0, String(cantidad));
  assert.deepEqual(errores(esquemaMovimiento, { tipo: "pedido", cantidad: 1 }).map((e) => e.split(":")[0]), ["tipo"], "los de pedido los hace solo el sistema");
  assert.deepEqual(esquemaControlar.parse({ cantidad: "4" }), { cantidad: 4, minimo: 0 });
});

test("MST-04: descuenta al llegar a Confirmado y devuelve al cancelar o volver a Recibido", () => {
  assert.equal(efectoDelPedido("recibido", "confirmado"), "descontar");
  assert.equal(efectoDelPedido("confirmado", "listo"), null);
  assert.equal(efectoDelPedido("listo", "entregado"), null);
  assert.equal(efectoDelPedido("entregado", "listo"), null);
  assert.equal(efectoDelPedido("confirmado", "recibido"), "devolver");
  assert.equal(efectoDelPedido("listo", "cancelado"), "devolver");
  assert.equal(efectoDelPedido("recibido", "cancelado"), null);
  assert.equal(efectoDelPedido("cancelado", "recibido"), null);
});

test("MST-06: agotado sin unidades, bajo en el mínimo o por debajo", () => {
  assert.equal(estadoStock({ cantidad: 0, minimo: 0 }), "agotado");
  assert.equal(estadoStock({ cantidad: 3, minimo: 3 }), "bajo");
  assert.equal(estadoStock({ cantidad: 4, minimo: 3 }), "ok");
  assert.equal(estadoStock({ cantidad: 1, minimo: 0 }), "ok");
});

test("MOD-17: sin nadie enganchado no pasa nada; un enganche desconocido frena el arranque", async () => {
  enganches.registrarEnganches([]);
  assert.deepEqual(await enganches.disponibilidad([1, 2]), new Map());
  await enganches.cambioDePedido({ pedido_id: 1, de: "recibido", a: "confirmado", items: [] });
  assert.throws(() => enganches.registrarEnganches([{ codigo: "x", enganches: { precioMagico: () => {} } }]), /no existe: precioMagico/);
  const vistos = [];
  enganches.registrarEnganches([{ codigo: "a", enganches: { cambioDePedido: (c) => vistos.push(c.a) } }, { codigo: "b", enganches: { cambioDePedido: (c) => vistos.push(c.a) } }]);
  await enganches.cambioDePedido({ a: "listo" });
  assert.deepEqual(vistos, ["listo", "listo"]);
  enganches.registrarEnganches([]);
});

test("MST-07: stock necesita catálogo y trae el permiso «Mover stock»", () => {
  assert.deepEqual(resolverModulos({ stock: true, catalogo: true }).activos, ["catalogo", "stock"]);
  assert.match(resolverModulos({ stock: true }).problemas.join(), /catalogo/);
  const { permisos } = permisosOpcionales({ catalogo: true, stock: true }, MODULOS_OPCIONALES);
  assert.ok(permisos.some((p) => p.codigo === "stock.mover"));
});

let servidor;
before(async () => {
  servidor = express().use(express.json()).use("/stock", stockRouter).listen(0);
  await new Promise((listo) => servidor.once("listening", listo));
});
after(() => servidor.close());

test("MST-07: todo lo de stock pide ingresar", async () => {
  const base = `http://127.0.0.1:${servidor.address().port}/stock`;
  for (const [metodo, ruta] of [["GET", ""], ["GET", "/1/movimientos"], ["POST", "/1/movimientos"], ["POST", "/1/control"], ["DELETE", "/1/control"], ["PUT", "/1/minimo"]]) {
    assert.equal((await fetch(base + ruta, { method: metodo })).status, 401, `${metodo} ${ruta}`);
  }
});
