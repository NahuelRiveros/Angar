import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import express from "express";

// Sin base: cualquier consulta falla al instante. Spec: docs/specs/core/catalogo.md.
process.env.NODE_ENV = "test";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "1";
process.env.JWT_SECRET = "clave-solo-para-tests";

const { MAX_FOTOS, esquemaCategoria, esquemaEditarProducto, esquemaFiltrosPanel, esquemaFiltrosWeb, esquemaProducto, resumenVariantes, slug, slugLibre } = await import("../src/core/opcionales/catalogo/reglas.js");
const { catalogoRouter } = await import("../src/core/opcionales/catalogo/catalogo_router.js");
const { crearCache } = await import("../src/core/services/common/cache_memoria.js");
const { patronBusqueda } = await import("../src/core/services/common/listados.js");
const { permisosOpcionales } = await import("../../core/modulos_opcionales.js");

const producto = (extra) => ({ nombre: "Casco", categoria_id: 1, variantes: [{ precio: 100 }], ...extra });
const errores = (esquema, datos) => {
  const r = esquema.safeParse(datos);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

test("MCA-01: un producto necesita nombre y categoría; los espacios y lo vacío se limpian", () => {
  assert.deepEqual(errores(esquemaProducto, { variantes: [{}] }).map((e) => e.split(":")[0]), ["nombre", "categoria_id"]);
  const datos = esquemaProducto.parse(producto({ nombre: "  Casco  ", descripcion: "   " }));
  assert.equal(datos.nombre, "Casco");
  assert.equal(datos.descripcion, null);
  assert.deepEqual([datos.activo, datos.destacado, datos.fotos], [true, false, []]);
});

test("MCA-02: todo producto tiene al menos una opción; si son varias, cada una con su nombre", () => {
  assert.match(errores(esquemaProducto, producto({ variantes: [] }))[0], /al menos una opción/);
  assert.equal(esquemaProducto.parse(producto()).variantes[0].nombre, null, "una sola no necesita nombre");
  assert.match(errores(esquemaProducto, producto({ variantes: [{ nombre: "M" }, {}] }))[0], /^variantes\.1\.nombre: .*necesita un nombre/);
  assert.match(errores(esquemaProducto, producto({ variantes: [{ nombre: "M" }, { nombre: "m" }] }))[0], /otra opción con ese nombre/);
  assert.match(errores(esquemaProducto, producto({ variantes: [{ id: 3, nombre: "M" }, { id: 3, nombre: "L" }] }))[0], /repetida/);
});

test("MCA-03: el precio es opcional, nunca negativo ni con más de dos decimales; el anterior es mayor", () => {
  const conPrecio = (precio, precio_anterior) => errores(esquemaProducto, producto({ variantes: [{ precio, precio_anterior }] }));
  for (const valido of [["", ""], [0, null], ["1500.50", "2000"]]) assert.deepEqual(conPrecio(...valido), []);
  for (const invalido of [[-1], ["1.005"], ["abc"], [100, 100], ["", 50]]) assert.equal(conPrecio(...invalido).length, 1, invalido.join());
});

const v = (precio, extra) => ({ precio, precio_anterior: null, disponible: true, ...extra });
test("MCA-03: la tarjeta muestra el precio más bajo de lo que se puede comprar", () => {
  assert.deepEqual(resumenVariantes([v("100.00", { precio_anterior: "150.00" })]), { precio: "100.00", precio_anterior: "150.00", desde: false, disponible: true, con_opciones: false });
  assert.deepEqual(resumenVariantes([v(null)]).precio, null);
  const varias = resumenVariantes([v("300.00"), v("90.00", { disponible: false }), v("200.00")]);
  assert.deepEqual([varias.precio, varias.desde, varias.con_opciones], ["200.00", true, true]);
  assert.equal(resumenVariantes([v("9.00"), v("10.00")]).precio, "9.00", "compara números, no textos");
  assert.equal(resumenVariantes([v("10.00"), v("10.00")]).desde, false);
  assert.deepEqual([resumenVariantes([v("10.00", { disponible: false })])].map((r) => [r.precio, r.disponible]), [["10.00", false]]);
});

test("MCA-04: hasta 5 fotos y solo con https", () => {
  const foto = "https://res.cloudinary.com/x.jpg";
  assert.equal(MAX_FOTOS, 5);
  assert.deepEqual(errores(esquemaProducto, producto({ fotos: Array(5).fill(foto) })), []);
  assert.match(errores(esquemaProducto, producto({ fotos: Array(6).fill(foto) }))[0], /Hasta 5 fotos/);
  for (const mala of ["http://x.com/a.jpg", "javascript:alert(1)"]) assert.equal(errores(esquemaProducto, producto({ fotos: [mala] })).length, 1, mala);
});

test("MCA-05: una categoría necesita nombre; la de arriba es opcional", () => {
  assert.match(errores(esquemaCategoria, { nombre: " " })[0], /Escribí el nombre/);
  assert.deepEqual(esquemaCategoria.parse({ nombre: "Cascos", padre_id: "" }), { nombre: "Cascos", padre_id: null, orden: 0, activo: true });
});

test("MCA-06: un filtro mal escrito se ignora en vez de romper la página", () => {
  assert.deepEqual(esquemaFiltrosWeb.parse({ categoria: "../x", page: "-4" }), { categoria: undefined, q: "", page: 1 });
  assert.deepEqual(esquemaFiltrosPanel.parse({ categoria_id: "x", estado: "otro", q: " casco " }), { categoria_id: undefined, estado: undefined, q: "casco", page: 1 });
  assert.equal(patronBusqueda("50%_\\"), "%50\\%\\_\\\\%");
});

test("MCA-07: la dirección sale del nombre y no se repite", () => {
  assert.equal(slug("  Casco Ñandú & Cía. "), "casco-nandu-cia");
  assert.equal(slug("¿¡!?"), "producto");
  assert.equal(slugLibre("Casco", ["casco", "casco-2", "casco-rojo"]), "casco-3");
  assert.equal(slugLibre("Casco", []), "casco");
});

test("MCA-09: editar exige saber qué versión se estaba viendo", () => {
  assert.match(errores(esquemaEditarProducto, producto())[0], /Recargá la página/);
  assert.equal(esquemaEditarProducto.parse(producto({ version: "3" })).version, 3);
});

test("MCA-09: el permiso también alcanza para subir fotos y solo existe con el módulo prendido", () => {
  assert.deepEqual(permisosOpcionales({ catalogo: true }).permisos.filter((p) => p.subeImagenes).map((p) => p.codigo), ["catalogo.editar"]);
  assert.deepEqual(permisosOpcionales({}).permisos, []);
});

test("Caché: guarda, vence, se vacía y no guarda lo que quedó viejo mientras se consultaba", async () => {
  const cache = crearCache({ maximo: 2 });
  let consultas = 0;
  const contar = async () => ++consultas;
  assert.deepEqual([await cache.obtener("a", contar), await cache.obtener("a", contar)], [1, 1]);
  cache.vaciar();
  assert.equal(await cache.obtener("a", contar), 2);
  await cache.obtener("b", contar);
  await cache.obtener("c", contar); // no entra un tercero: sale "a"
  assert.equal(await cache.obtener("a", contar), 5);
  let soltar;
  const lenta = cache.obtener("d", () => new Promise((r) => { soltar = r; }));
  cache.vaciar();
  soltar("viejo");
  assert.equal(await lenta, "viejo");
  assert.equal(await cache.obtener("d", async () => "nuevo"), "nuevo");
});

let servidor;
let base;
before(async () => {
  servidor = express().use(express.json()).use("/catalogo", catalogoRouter).listen(0);
  await new Promise((listo) => servidor.once("listening", listo));
  base = `http://127.0.0.1:${servidor.address().port}/catalogo`;
});
after(() => servidor.close());

test("MCA-09: sin ingresar no se puede ver ni cambiar nada del panel", async () => {
  for (const [metodo, ruta] of [["GET", "/panel/productos"], ["POST", "/panel/productos"], ["PUT", "/panel/productos/1"], ["DELETE", "/panel/productos/1"], ["GET", "/panel/categorias"], ["POST", "/panel/categorias"], ["PUT", "/panel/categorias/1"], ["DELETE", "/panel/categorias/1"]]) {
    assert.equal((await fetch(base + ruta, { method: metodo })).status, 401, `${metodo} ${ruta}`);
  }
});

test("MCA-06: una dirección inválida se rechaza antes de llegar a la base", async () => {
  const r = await fetch(`${base}/productos/${encodeURIComponent("Casco' OR 1=1")}`);
  assert.equal(r.status, 400);
  assert.equal((await r.json()).codigo, "DATOS_INVALIDOS");
});
