import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";

// Sin base: cualquier consulta falla al instante. Spec: docs/specs/core/pedidos.md.
process.env.NODE_ENV = "test";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.JWT_SECRET = "clave-solo-para-tests";

const { aCentavos, armarLineas, deCentavos, esquemaCambioEstado, esquemaEnviar, siguientes, transicion } = await import("../src/core/opcionales/pedidos/reglas.js");
const { crearPedidosRouter } = await import("../src/core/opcionales/pedidos/pedidos_router.js");
const { MODULOS_OPCIONALES, permisosOpcionales } = await import("../../core/modulos_opcionales.js");

const pedido = (extra) => ({ clave_envio: randomUUID(), nombre: "Ana Gómez", celular: "11 2345-6789", entrega: "retiro", items: [{ variante_id: 1, cantidad: 2 }], ...extra });
const errores = (esquema, datos) => {
  const r = esquema.safeParse(datos);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};
const variante = (extra) => ({ producto: "Casco", nombre: null, codigo: null, precio: "100.10", vendible: true, ...extra });

test("MPE-02: la plata se cuenta en centavos enteros, sin errores de redondeo", () => {
  assert.equal(aCentavos("95000.5"), 9500050);
  assert.equal(aCentavos("0.10"), 10);
  assert.equal(aCentavos(0.1 + 0.2), 30);
  assert.equal(deCentavos(7), "0.07");
  assert.equal(deCentavos(1234500), "12345.00");
  assert.throws(() => aCentavos("-1"));
  assert.throws(() => aCentavos("1.234"));
  // 0.1 x 3 en decimales da 0.30000000000000004; en centavos, 30.
  const { total, lineas } = armarLineas([{ variante_id: 1, cantidad: 3 }, { variante_id: 2, cantidad: 1 }], new Map([[1, variante({ precio: "0.10" })], [2, variante({ precio: "99999.99" })]]));
  assert.equal(total, "100000.29");
  assert.deepEqual(lineas.map((l) => [l.precio, l.subtotal]), [["0.10", "0.30"], ["99999.99", "99999.99"]]);
});

test("MPE-02 y MPE-05: el precio sale de la base, no de lo que manda el navegador; la línea copia nombre y opción", () => {
  const { lineas, cambios } = armarLineas([{ variante_id: 1, cantidad: 2, precio_visto: "100.10" }], new Map([[1, variante({ nombre: "Talle M", codigo: "C-M" })]]));
  assert.deepEqual(cambios, []);
  assert.deepEqual(lineas[0], { variante_id: 1, producto_nombre: "Casco", variante_nombre: "Talle M", codigo: "C-M", cantidad: 2, orden: 0, precio: "100.10", subtotal: "200.20" });
  const datos = esquemaEnviar().parse(pedido({ items: [{ variante_id: 1, cantidad: 1, precio: 1, subtotal: 1, total: 1 }], total: 1 }));
  assert.deepEqual(datos.items, [{ variante_id: 1, cantidad: 1 }], "lo que no es variante y cantidad se descarta");
  assert.equal(datos.total, undefined);
});

test("MPE-03: si cambió un precio o algo ya no se vende, no hay líneas y se dice qué cambió", () => {
  const variantes = new Map([[1, variante({ precio: "120.00" })], [2, variante({ producto: "Guantes", nombre: "L", vendible: false })], [4, variante()]]);
  const r = armarLineas([{ variante_id: 1, cantidad: 1, precio_visto: "100" }, { variante_id: 2, cantidad: 1 }, { variante_id: 3, cantidad: 1 }, { variante_id: 4, cantidad: 1, precio_visto: null }], variantes);
  assert.deepEqual(r.lineas, []);
  assert.equal(r.total, null);
  assert.deepEqual(r.cambios, [
    { variante_id: 1, tipo: "precio", nombre: "Casco", precio: "120.00" },
    { variante_id: 2, tipo: "no_disponible", nombre: "Guantes (L)" },
    { variante_id: 3, tipo: "no_disponible", nombre: null },
    { variante_id: 4, tipo: "precio", nombre: "Casco", precio: "100.10" },
  ]);
});

test("MPE-06 y MPE-12: nombre y celular obligatorios; el envío pide dirección y localidad, el retiro las descarta", () => {
  assert.deepEqual(errores(esquemaEnviar(), pedido({ nombre: " ", celular: "1234" })).map((e) => e.split(":")[0]), ["nombre", "celular"]);
  assert.equal(esquemaEnviar().parse(pedido({ celular: "+54 9 11 2345-6789" })).celular, "5491123456789");
  assert.deepEqual(errores(esquemaEnviar(), pedido({ entrega: "envio" })).map((e) => e.split(":")[0]), ["direccion", "localidad"]);
  const retiro = esquemaEnviar().parse(pedido({ direccion: "Calle 1", localidad: "Centro" }));
  assert.deepEqual([retiro.direccion, retiro.localidad], [null, null]);
  assert.deepEqual(errores(esquemaEnviar(), pedido({ entrega: "moto" })).map((e) => e.split(":")[0]), ["entrega"]);
  assert.deepEqual(errores(esquemaEnviar(["retiro"]), pedido({ entrega: "envio", direccion: "Calle 1", localidad: "Centro" })).map((e) => e.split(":")[0]), ["entrega"], "un proyecto puede apagar el envío");
});

test("MPE-02: el carrito tiene entre 1 y 50 líneas, sin repetidas, con cantidades enteras de 1 a 99", () => {
  assert.match(errores(esquemaEnviar(), pedido({ items: [] }))[0], /carrito está vacío/);
  assert.match(errores(esquemaEnviar(), pedido({ items: Array.from({ length: 51 }, (_, i) => ({ variante_id: i + 1, cantidad: 1 })) }))[0], /Hasta 50/);
  assert.match(errores(esquemaEnviar(), pedido({ items: [{ variante_id: 1, cantidad: 1 }, { variante_id: 1, cantidad: 2 }] }))[0], /repetido/);
  for (const cantidad of [0, 1.5, 100, "x"]) assert.equal(errores(esquemaEnviar(), pedido({ items: [{ variante_id: 1, cantidad }] })).length, 1, String(cantidad));
  assert.match(errores(esquemaEnviar(), pedido({ clave_envio: "otra" }))[0], /Recargá/);
});

test("MPE-07: se avanza de a un paso; volver, cancelar y reabrir piden motivo", () => {
  assert.deepEqual(transicion("recibido", "confirmado"), { tipo: "avanzar", pideMotivo: false });
  assert.deepEqual(transicion("listo", "entregado"), { tipo: "avanzar", pideMotivo: false });
  assert.deepEqual(transicion("confirmado", "recibido"), { tipo: "volver", pideMotivo: true });
  assert.deepEqual(transicion("listo", "cancelado"), { tipo: "cancelar", pideMotivo: true });
  assert.deepEqual(transicion("cancelado", "recibido"), { tipo: "reabrir", pideMotivo: true });
  for (const [de, a] of [["recibido", "listo"], ["entregado", "cancelado"], ["cancelado", "confirmado"], ["recibido", "recibido"], ["entregado", "recibido"]]) assert.equal(transicion(de, a), null, `${de} → ${a}`);
  assert.deepEqual(siguientes("recibido").map((s) => s.estado), ["confirmado", "cancelado"]);
  assert.deepEqual(siguientes("entregado").map((s) => s.estado), ["listo"]);
  assert.deepEqual(siguientes("cancelado").map((s) => s.estado), ["recibido"]);
  assert.deepEqual(errores(esquemaCambioEstado, { estado: "perdido" }).map((e) => e.split(":")[0]), ["estado", "version"]);
});

test("MPE-10: los permisos del módulo existen, gestionar incluye ver, y el panel los pide", () => {
  const { permisos } = permisosOpcionales({ catalogo: true, pedidos: true }, MODULOS_OPCIONALES);
  const porCodigo = Object.fromEntries(permisos.map((p) => [p.codigo, p]));
  assert.deepEqual(porCodigo["pedidos.gestionar"].requiere, ["pedidos.ver"]);
  assert.ok(porCodigo["pedidos.ver"].porDefecto.includes("vendedor"));
});

let servidor;
let base;
before(async () => {
  servidor = express().use(express.json()).use("/pedidos", crearPedidosRouter()).listen(0);
  await new Promise((listo) => servidor.once("listening", listo));
  base = `http://127.0.0.1:${servidor.address().port}/pedidos`;
});
after(() => servidor.close());

test("MPE-10: el panel y «Mis pedidos» piden ingresar", async () => {
  for (const [metodo, ruta] of [["GET", "/panel"], ["GET", "/panel/1"], ["PATCH", "/panel/1/estado"], ["GET", "/mios"]]) {
    assert.equal((await fetch(base + ruta, { method: metodo })).status, 401, `${metodo} ${ruta}`);
  }
});

test("MPE-09: un link mal formado no llega a la base", async () => {
  const r = await fetch(`${base}/seguir/${encodeURIComponent("x' OR 1=1 --")}`);
  assert.equal(r.status, 400);
  assert.equal((await r.json()).mensaje, "Ese link no es válido.");
});

test("MPE-11: pedir no pide ingresar, y los pedidos rechazados no gastan el tope de 10 por hora", async () => {
  for (let i = 0; i < 12; i++) {
    const r = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pedido({ celular: "1" })) });
    assert.equal(r.status, 400, `intento ${i + 1}`);
  }
});
