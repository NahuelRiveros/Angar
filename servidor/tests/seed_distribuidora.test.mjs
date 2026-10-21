import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { completarProductos } from "../src/database/seed/completar_productos_distribuidora.js";
import { PRODUCTOS_INICIALES } from "../src/database/seed/seed_productos_distribuidora.js";
import { PRODUCTOS_POR_FAMILIA } from "../src/database/seed/productos_distribuidora/index.js";
import { claveMarca } from "../src/services/common/formato_nombre.js";
import { completarFamilias, completarMarcas } from "../src/database/seed/completar_catalogo_distribuidora.js";

// Repositorios en memoria: las pruebas no conectan ni modifican la base del .env.
function catalogoInicial({ categorias = [], marcas = [], asociaciones = [], productos = [] } = {}) {
  const transaction = {};
  const datos = { categorias: structuredClone(categorias), marcas: structuredClone(marcas), asociaciones: structuredClone(asociaciones), productos: structuredClone(productos) };
  function modelo(tabla) {
    return {
      async findAll(options) {
        assert.equal(options.transaction, transaction);
        return structuredClone(datos[tabla].filter((fila) => !options.where
          || Object.entries(options.where).every(([campo, valor]) => Array.isArray(valor) ? valor.includes(fila[campo]) : (fila[campo] ?? null) === valor)));
      },
      async create(campos, options) {
        assert.equal(options.transaction, transaction);
        const fila = { id: Math.max(0, ...datos[tabla].map((f) => f.id)) + 1, ...campos };
        if (tabla === "categorias") {
          fila.fecha_baja ??= null;
          assert(!datos[tabla].some((f) => f.fecha_baja == null && f.slug === fila.slug), "Slug duplicado");
        }
        if (tabla === "marcas") assert(!datos[tabla].some((f) => f.clave === fila.clave), "Marca duplicada");
        if (tabla === "productos") {
          fila.fecha_baja ??= null;
          assert(!datos[tabla].some((f) => f.fecha_baja == null && f.nombre === fila.nombre && f.categoria_id === fila.categoria_id), "Producto duplicado");
        }
        datos[tabla].push(fila);
        return structuredClone(fila);
      },
      async bulkCreate(filas, options) {
        const creadas = [];
        for (const fila of filas) {
          const duplicada = tabla === "asociaciones" && datos[tabla].some((f) => f.marca_id === fila.marca_id && f.categoria_id === fila.categoria_id);
          if (duplicada && options.ignoreDuplicates) continue;
          assert(!duplicada, "Asociación duplicada");
          creadas.push(await this.create(fila, options));
        }
        return creadas;
      },
    };
  }
  const modelos = {
    CategoriaDistribuidora: modelo("categorias"), MarcaDistribuidora: modelo("marcas"),
    MarcaCategoriaDistribuidora: modelo("asociaciones"), ProductoDistribuidora: modelo("productos"),
  };
  return { transaction, datos, modelos };
}

test("seed: completa una base parcial conservando IDs, categorías antiguas y nombres del cliente", async () => {
  const ctx = catalogoInicial({ categorias: [
    { id: 10, nombre: "ALMACEN", slug: "despensa-cliente", padre_id: null, fecha_baja: null },
    { id: 20, nombre: "Galletitas", slug: "galletas-propias", padre_id: 10, fecha_baja: null },
    { id: 21, nombre: "Aderezos", slug: "almacen-aderezos", padre_id: 10, fecha_baja: null },
    { id: 30, nombre: "Pastas Frescas y Tapas", slug: "pastas-frescas-y-tapas", padre_id: null, fecha_baja: null },
    { id: 31, nombre: "Ravioles y Sorrentinos", slug: "pastas-frescas-y-tapas-ravioles-y-sorrentinos", padre_id: 30, fecha_baja: null },
  ] });
  const anteriores = structuredClone(ctx.datos.categorias);
  const familias = { "Almacén": ["Galletitas", "Mayonesas"], "Pastas Frescas y Tapas": ["Ravioles", "Sorrentinos"], "Bazar": ["Ollas"] };
  const resultado = await completarFamilias(ctx.modelos.CategoriaDistribuidora, familias, ctx.transaction);
  assert.deepEqual(resultado, { familias: 1, categorias: 4, omitidas: [] });
  assert.deepEqual(ctx.datos.categorias.slice(0, anteriores.length), anteriores);
  assert.equal(ctx.datos.categorias.find((c) => c.nombre === "Mayonesas").padre_id, 10);
  assert.equal(ctx.datos.categorias.find((c) => c.nombre === "Ravioles").padre_id, 30);
  assert.deepEqual(await completarFamilias(ctx.modelos.CategoriaDistribuidora, familias, ctx.transaction), { familias: 0, categorias: 0, omitidas: [] });
});

test("seed: respeta bajas de familias y categorías sin reactivarlas", async () => {
  const ctx = catalogoInicial({ categorias: [
    { id: 1, nombre: "Bazar", slug: "bazar", padre_id: null, fecha_baja: null },
    { id: 2, nombre: "Ollas", slug: "bazar-ollas", padre_id: 1, fecha_baja: "2026-10-01" },
    { id: 3, nombre: "Bebidas", slug: "bebidas", padre_id: null, fecha_baja: "2026-10-01" },
  ] });
  assert.deepEqual(await completarFamilias(ctx.modelos.CategoriaDistribuidora, { Bazar: ["Ollas", "Sartenes"], Bebidas: ["Aguas"] }, ctx.transaction), {
    familias: 0, categorias: 1, omitidas: ["Bazar › Ollas", "Bebidas"],
  });
  assert.equal(ctx.datos.categorias.length, 4);
  assert.equal(ctx.datos.categorias[1].fecha_baja, "2026-10-01");
});

test("seed: conserva renombres con el mismo slug y resuelve colisiones de slug sin tocar otras filas", async () => {
  const ctx = catalogoInicial({ categorias: [
    { id: 1, nombre: "Despensa", slug: "almacen", padre_id: null, fecha_baja: null },
    { id: 2, nombre: "Mayonesa para Gastronomía", slug: "almacen-mayonesas", padre_id: 1, fecha_baja: null },
    { id: 3, nombre: "Otra Familia", slug: "otra", padre_id: null, fecha_baja: null },
    { id: 4, nombre: "Categoría Ajena", slug: "almacen-mostazas", padre_id: 3, fecha_baja: null },
  ] });
  const familias = { "Almacén": ["Mayonesas", "Mostazas"] };
  assert.deepEqual(await completarFamilias(ctx.modelos.CategoriaDistribuidora, familias, ctx.transaction), { familias: 0, categorias: 1, omitidas: [] });
  assert.equal(ctx.datos.categorias[4].slug, "almacen-mostazas-2");
  assert.equal(ctx.datos.categorias[4].padre_id, 1);
  assert.equal(ctx.datos.categorias[0].nombre, "Despensa");
  const resultado = await completarMarcas(ctx.modelos, { Natura: ["Almacén › Mayonesas", "Almacén › Mostazas"] }, ctx.transaction);
  assert.deepEqual(resultado, { marcas: 1, asociaciones: 2, faltantes: [] });
  assert.deepEqual(ctx.datos.asociaciones.map((a) => a.categoria_id), [2, 5]);
});

test("seed: reutiliza marcas por clave, agrega asociaciones y preserva las personalizadas", async () => {
  const ctx = catalogoInicial({
    categorias: [
      { id: 1, nombre: "Almacén", slug: "almacen", padre_id: null, fecha_baja: null },
      { id: 2, nombre: "Mayonesas", slug: "almacen-mayonesas", padre_id: 1, fecha_baja: null },
      { id: 3, nombre: "Mostazas", slug: "almacen-mostazas", padre_id: 1, fecha_baja: null },
      { id: 4, nombre: "Aderezos", slug: "almacen-aderezos", padre_id: 1, fecha_baja: null },
    ],
    marcas: [{ id: 80, nombre: "NATURA", clave: "natura" }, { id: 90, nombre: "Marca propia", clave: "marcapropia" }],
    asociaciones: [{ id: 1, marca_id: 80, categoria_id: 4 }, { id: 2, marca_id: 80, categoria_id: 2 }, { id: 3, marca_id: 90, categoria_id: 1 }],
  });
  const anteriores = structuredClone(ctx.datos.asociaciones);
  const marcas = { Natura: ["Almacén › Mayonesas", "Almacén › Mostazas"], Savora: ["Almacén › Mostazas"] };
  assert.deepEqual(await completarMarcas(ctx.modelos, marcas, ctx.transaction), { marcas: 1, asociaciones: 2, faltantes: [] });
  assert.deepEqual(ctx.datos.asociaciones.slice(0, 3), anteriores);
  assert.equal(ctx.datos.marcas[0].nombre, "NATURA");
  assert.equal(ctx.datos.asociaciones.find((a) => a.marca_id === 80 && a.categoria_id === 3).marca_id, 80);
  assert.deepEqual(await completarMarcas(ctx.modelos, marcas, ctx.transaction), { marcas: 0, asociaciones: 0, faltantes: [] });
});

test("seed: informa rutas ausentes sin crear marcas huérfanas ni asociar a hijas de familias inactivas", async () => {
  const ctx = catalogoInicial({ categorias: [
    { id: 1, nombre: "Limpieza", slug: "limpieza", padre_id: null, fecha_baja: "2026-10-01" },
    { id: 2, nombre: "Detergentes", slug: "limpieza-detergentes", padre_id: 1, fecha_baja: null },
  ] });
  const resultado = await completarMarcas(ctx.modelos, { Magistral: ["Limpieza › Detergentes"], Otra: ["Ausente"] }, ctx.transaction);
  assert.deepEqual(resultado, { marcas: 0, asociaciones: 0, faltantes: ["Limpieza › Detergentes", "Ausente"] });
  assert.equal(ctx.datos.marcas.length, 0);
  assert.equal(ctx.datos.asociaciones.length, 0);
});

const articulo = (campos = {}) => ({
  nombre: "9 de Oro Agridulces 200 g", marca: "9 de Oro", imagen_url: "https://imagenes.example/agridulces.jpg", ...campos,
});
function catalogoProductos(cambios = {}) {
  const ctx = catalogoInicial({
    categorias: [
      { id: 1, nombre: "Almacén", slug: "almacen", padre_id: null, fecha_baja: null },
      { id: 2, nombre: "Galletitas", slug: "almacen-galletitas", padre_id: 1, fecha_baja: null },
      { id: 3, nombre: "Panificados", slug: "panificados", padre_id: null, fecha_baja: null },
      { id: 4, nombre: "Bizcochitos", slug: "panificados-bizcochitos", padre_id: 3, fecha_baja: null },
    ],
    marcas: [{ id: 10, clave: claveMarca("9 de Oro"), nombre: "9 DE ORO" }],
    asociaciones: [{ marca_id: 10, categoria_id: 1 }, { marca_id: 10, categoria_id: 4 }],
    ...cambios,
  });
  ctx.resueltas = [];
  ctx.resolverMarca = async ({ marca_id, categoria_id }, transaction) => {
    assert.equal(transaction, ctx.transaction);
    ctx.resueltas.push({ marca_id, categoria_id });
    const marca = ctx.datos.marcas.find((m) => m.id === marca_id);
    assert(marca);
    return { marca_id: marca.id, marca: marca.nombre };
  };
  ctx.completar = (catalogo) => completarProductos(ctx.modelos, catalogo, ctx.transaction, ctx.resolverMarca);
  return ctx;
}

test("productos: crea inactivos con marca resuelta, herencia de familia y sin presentaciones", async () => {
  const ctx = catalogoProductos();
  const lista = { "Almacén › Galletitas": [articulo({ fuente_url: "https://fuente.example/producto", activo: true })] };
  assert.deepEqual(await ctx.completar(lista), { productos: 1, existentes: 0, omitidos: [] });
  const fila = ctx.datos.productos[0];
  assert.equal(fila.activo, false);
  assert.equal(fila.marca_id, 10);
  assert.equal(fila.marca, "9 DE ORO");
  assert.equal(fila.categoria_id, 2);
  assert.equal(fila.imagen_url, lista["Almacén › Galletitas"][0].imagen_url);
  assert.deepEqual(Object.keys(fila).sort(), ["id", "nombre", "categoria_id", "descripcion", "marca_id", "marca", "imagen_url", "activo", "fecha_baja"].sort());
  const antes = structuredClone(ctx.datos);
  assert.deepEqual(await ctx.completar(lista), { productos: 0, existentes: 1, omitidos: [] });
  assert.deepEqual(ctx.datos, antes);
  assert.equal(ctx.resueltas.length, 1);
});

test("productos: conserva ediciones, inactivos y bajas sin duplicar nombres normalizados", async () => {
  const ctx = catalogoProductos({ productos: [
    { id: 20, categoria_id: 2, nombre: "  9 DE ORO  AGRIDULCES 200 G ", marca_id: 99, marca: "Propia", activo: false, imagen_url: "https://propia.example/foto.jpg", fecha_baja: null },
    { id: 21, categoria_id: 2, nombre: "Retirado", activo: false, fecha_baja: "2026-10-01" },
  ] });
  const anteriores = structuredClone(ctx.datos.productos);
  const resultado = await ctx.completar({ "Almacén › Galletitas": [articulo(), articulo({ nombre: "Retirado" })] });
  assert.equal(resultado.productos, 0);
  assert.equal(resultado.existentes, 1);
  assert.equal(resultado.omitidos[0].motivo, "Artículo dado de baja");
  assert.deepEqual(ctx.datos.productos, anteriores);
  assert.equal(ctx.resueltas.length, 0);
});

test("productos: deduplica dentro de la lista y permite el mismo nombre en otra categoría", async () => {
  const ctx = catalogoProductos();
  const resultado = await ctx.completar({
    "Almacén › Galletitas": [articulo(), articulo(), articulo({ nombre: "Otro" })],
    "Panificados › Bizcochitos": [articulo()],
  });
  assert.deepEqual(resultado, { productos: 3, existentes: 1, omitidos: [] });
  assert.deepEqual(ctx.datos.productos.map((p) => p.categoria_id), [2, 2, 4]);
  assert.equal(ctx.resueltas.length, 2, "Reutiliza la resolución de cada par marca/categoría");
});

test("productos: omite rutas y marcas faltantes o ajenas, continuando con los válidos", async () => {
  const ctx = catalogoProductos();
  ctx.datos.marcas.push({ id: 11, nombre: "Otra", clave: claveMarca("Otra") });
  const resultado = await ctx.completar({
    "No Existe › Galletitas": [articulo()],
    "Almacén": [articulo()],
    "Almacén › Galletitas": [articulo({ marca: "Ausente" }), articulo({ marca: "Otra" }), articulo()],
  });
  assert.equal(resultado.productos, 1);
  assert.deepEqual(resultado.omitidos.map((p) => p.motivo), [
    "Familia o categoría no disponible", "Familia o categoría no disponible", "Marca no disponible", "Marca no asociada a la familia o categoría",
  ]);
  assert.equal(ctx.datos.marcas.length, 2);
  assert.equal(ctx.datos.asociaciones.length, 2);
});

test("productos: respeta bajas de categorías y familias y rechaza slugs de otro padre", async () => {
  const ctx = catalogoProductos();
  ctx.datos.categorias[0].fecha_baja = "2026-10-01";
  ctx.datos.categorias[3].fecha_baja = "2026-10-01";
  const resultado = await ctx.completar({ "Almacén › Galletitas": [articulo()], "Panificados › Bizcochitos": [articulo()] });
  assert.equal(resultado.productos, 0);
  assert.equal(resultado.omitidos.length, 2);
  ctx.datos.categorias[0].fecha_baja = null;
  ctx.datos.categorias[1].padre_id = 3;
  assert.equal((await ctx.completar({ "Almacén › Galletitas": [articulo()] })).productos, 0);
});

test("productos: reconoce categorías renombradas por el slug, conservando nombres e IDs", async () => {
  const ctx = catalogoProductos();
  ctx.datos.categorias[0].nombre = "Despensa";
  ctx.datos.categorias[1].nombre = "Galletas del Cliente";
  const anteriores = structuredClone(ctx.datos.categorias);
  assert.equal((await ctx.completar({ "Almacén › Galletitas": [articulo()] })).productos, 1);
  assert.equal(ctx.datos.productos[0].categoria_id, 2);
  assert.deepEqual(ctx.datos.categorias, anteriores);
});

test("productos: rechaza imágenes inseguras y datos inválidos sin detener la carga", async () => {
  const ctx = catalogoProductos();
  const imagenes = ["http://imagenes.example/foto.jpg", "/foto.jpg", "javascript:alert(1)", "https://", "https://user:pass@imagenes.example/a.jpg", `https://imagenes.example/${"a".repeat(500)}`, 123];
  const entradas = imagenes.map((imagen_url, i) => articulo({ nombre: `Inválido ${i}`, imagen_url }));
  entradas.push(articulo({ nombre: "" }), articulo({ nombre: "a".repeat(151) }), articulo({ nombre: "Descripción Inválida", descripcion: 42 }));
  entradas.push(articulo(), articulo({ nombre: "Sin Imagen", imagen_url: null }));
  const resultado = await ctx.completar({ "Almacén › Galletitas": entradas });
  assert.equal(resultado.productos, 2);
  assert.equal(resultado.omitidos.length, 10);
  assert.equal(ctx.datos.productos[1].imagen_url, null);
});

test("productos: propaga errores de persistencia para que el llamador revierta la transacción", async () => {
  const ctx = catalogoProductos();
  ctx.modelos.ProductoDistribuidora.bulkCreate = async () => { throw new Error("Fallo de persistencia"); };
  await assert.rejects(ctx.completar({ "Almacén › Galletitas": [articulo()] }), /Fallo de persistencia/);
});

test("productos: toda la selección usa rutas y marcas del catálogo real y se puede repetir", async () => {
  // Lee solo las constantes de los seeds antiguos, sin importar su conexión/.env.
  async function leerLista(archivo, constante) {
    const contenido = await readFile(new URL(`../src/database/seed/${archivo}`, import.meta.url), "utf8");
    const literal = contenido.match(new RegExp(`export const ${constante} = (\\{[\\s\\S]*?\\n\\});`))?.[1];
    assert(literal, `Falta ${constante}`);
    return runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
  }
  const familias = await leerLista("seed_familias_distribuidora.js", "FAMILIAS_INICIALES");
  const marcas = await leerLista("seed_marcas_distribuidora.js", "MARCAS_INICIALES");
  const ctx = catalogoProductos({ categorias: [], marcas: [], asociaciones: [] });
  await completarFamilias(ctx.modelos.CategoriaDistribuidora, familias, ctx.transaction);
  await completarMarcas(ctx.modelos, marcas, ctx.transaction);
  let total = 0;
  for (const [ruta, productos] of Object.entries(PRODUCTOS_INICIALES)) {
    const [familia, categoria] = ruta.split(" › ");
    assert(familias[familia]?.includes(categoria), ruta);
    for (const producto of productos) {
      assert(marcas[producto.marca]?.some((r) => r === familia || r === ruta), `${producto.nombre}: marca fuera de categoría`);
      assert(producto.nombre.length <= 150);
      assert(producto.imagen_url.length <= 500);
      assert.equal(new URL(producto.imagen_url).protocol, "https:");
      assert.equal(new URL(producto.fuente_url).protocol, "https:");
      total++;
    }
  }
  assert(total >= 400, "El catálogo inicial debe tener al menos 400 productos");
  assert.deepEqual(await ctx.completar(PRODUCTOS_INICIALES), { productos: total, existentes: 0, omitidos: [] });
  const anteriores = structuredClone(ctx.datos);
  assert.deepEqual(await ctx.completar(PRODUCTOS_INICIALES), { productos: 0, existentes: total, omitidos: [] });
  assert.deepEqual(ctx.datos, anteriores);
});

test("productos: todos los archivos por familia están incluidos una sola vez en el índice", async () => {
  const carpeta = new URL("../src/database/seed/productos_distribuidora/", import.meta.url);
  const archivos = (await readdir(carpeta)).filter((nombre) => nombre.endsWith(".js") && nombre !== "index.js");
  const catalogos = Object.values(PRODUCTOS_POR_FAMILIA);
  assert.equal(archivos.length, catalogos.length);
  const incluidos = new Set();
  for (const archivo of archivos) {
    const modulo = await import(new URL(archivo, carpeta).href);
    const listas = Object.entries(modulo).filter(([nombre]) => nombre.startsWith("PRODUCTOS_"));
    assert.equal(listas.length, 1, archivo);
    const lista = listas[0][1];
    assert(catalogos.includes(lista), `Falta incluir ${archivo} en el índice`);
    assert(!incluidos.has(lista), `Catálogo repetido: ${archivo}`);
    incluidos.add(lista);
  }
  const rutas = new Set();
  let cantidad = 0;
  for (const [familia, catalogo] of Object.entries(PRODUCTOS_POR_FAMILIA)) {
    assert(Object.keys(catalogo).length > 0, familia);
    for (const [ruta, productos] of Object.entries(catalogo)) {
      assert(ruta.startsWith(`${familia} › `), ruta);
      assert(!rutas.has(ruta), `Categoría repetida: ${ruta}`);
      assert(productos.length > 0, ruta);
      rutas.add(ruta);
      cantidad += productos.length;
    }
  }
  assert.deepEqual([...rutas].sort(), Object.keys(PRODUCTOS_INICIALES).sort());
  assert.equal(cantidad, Object.values(PRODUCTOS_INICIALES).flat().length);
});
