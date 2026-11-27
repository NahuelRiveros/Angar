import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import express from "express";

// Consultas y respuestas reutilizables del servidor (SRV). Sin base: lo que la usa lo prueban los
// *.integration.mjs de catálogo, pedidos y stock. Spec: docs/specs/core/servidor.md.
process.env.NODE_ENV = "test";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.JWT_SECRET = "clave-solo-para-tests";

const { buscarTexto, exigirVersion, patronBusqueda, patronSinAcentos, quienLoHizo, sinAcentosSql } = await import("../src/core/services/common/consultas.js");
const { datos, hecho } = await import("../src/core/controllers/common/responder.js");
const { ErrorApp } = await import("../src/core/services/common/errores.js");
const { manejarErrores } = await import("../src/core/app.js");

test("SRV-02: lo buscado no funciona como comodín y no distingue acentos ni mayúsculas", () => {
  assert.equal(patronBusqueda("100%_x"), "%100\\%\\_x%");
  assert.equal(patronSinAcentos("Ñandú CASCO"), "%nandu casco%");
  assert.equal(sinAcentosSql("p.nombre"), "lower(translate(p.nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))");
  assert.equal(buscarTexto(["nombre"], "   "), null, "sin texto, no hay filtro");
  assert.equal(buscarTexto([], "casco"), null, "sin columnas, no hay filtro");
  const condicion = buscarTexto(["nombre", "codigo"], "casco");
  assert.equal(Object.getOwnPropertySymbols(condicion).length, 1, "un OR");
  assert.equal(condicion[Object.getOwnPropertySymbols(condicion)[0]].length, 2, "una condición por columna");
});

test("SRV-03: si la versión cambió, avisa de cambio simultáneo con el mensaje de la pantalla", () => {
  assert.doesNotThrow(() => exigirVersion({ version: 3 }, 3));
  assert.throws(() => exigirVersion({ version: 4 }, 3, "Otra persona cambió este pedido."), (error) => {
    assert.ok(error instanceof ErrorApp);
    assert.deepEqual([error.codigo, error.estado, error.message], ["CAMBIO_SIMULTANEO", 409, "Otra persona cambió este pedido."]);
    return true;
  });
});

test("SRV-04: quién lo hizo se suma a cualquier consulta con alias propios (no chocan con p, u)", () => {
  const { columna, union } = quienLoHizo("h.usuario_id");
  assert.match(columna, /AS persona$/);
  assert.match(union, /ON quien_u\.id = h\.usuario_id/);
  assert.doesNotMatch(`${columna} ${union}`, /\bp\.|\bu\./);
});

let servidor;
let base;
before(async () => {
  const app = express().use(express.json());
  app.get("/datos", (req, _res, next) => { req.datos = { query: { n: 2 } }; req.user = { usuario_id: 9 }; next(); },
    datos(({ query }, usuario) => ({ doble: query.n * 2, quien: usuario.usuario_id })));
  app.post("/hecho", hecho("CREADO", "Listo.", () => ({ id: 1 }), 201));
  app.post("/sin-datos", hecho("BORRADO", "Borrado.", () => undefined));
  app.get("/falla", datos(() => { throw new ErrorApp("NO_EXISTE", "Ese no existe.", 404); }));
  app.use(manejarErrores);
  servidor = app.listen(0);
  await new Promise((listo) => servidor.once("listening", listo));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

test("SRV-01: los controllers responden igual en todo el sistema y sin try/catch", async () => {
  assert.deepEqual(await (await fetch(`${base}/datos`)).json(), { ok: true, data: { doble: 4, quien: 9 } });
  const creado = await fetch(`${base}/hecho`, { method: "POST" });
  assert.equal(creado.status, 201);
  assert.deepEqual(await creado.json(), { ok: true, codigo: "CREADO", mensaje: "Listo.", data: { id: 1 } });
  assert.deepEqual(await (await fetch(`${base}/sin-datos`, { method: "POST" })).json(), { ok: true, codigo: "BORRADO", mensaje: "Borrado." });
  const falla = await fetch(`${base}/falla`);
  assert.equal(falla.status, 404);
  assert.deepEqual(await falla.json(), { ok: false, codigo: "NO_EXISTE", mensaje: "Ese no existe." });
});
