import test from "node:test";
import assert from "node:assert/strict";
import { completarFamilias, completarMarcas } from "../src/database/seed/completar_catalogo_distribuidora.js";

// Repositorios en memoria: las pruebas no conectan ni modifican la base del .env.
function catalogoInicial({ categorias = [], marcas = [], asociaciones = [] } = {}) {
  const transaction = {};
  const datos = { categorias: structuredClone(categorias), marcas: structuredClone(marcas), asociaciones: structuredClone(asociaciones) };
  function modelo(tabla) {
    return {
      async findAll(options) {
        assert.equal(options.transaction, transaction);
        return structuredClone(datos[tabla].filter((fila) => !options.where
          || Object.entries(options.where).every(([campo, valor]) => (fila[campo] ?? null) === valor)));
      },
      async create(campos, options) {
        assert.equal(options.transaction, transaction);
        const fila = { id: Math.max(0, ...datos[tabla].map((f) => f.id)) + 1, ...campos };
        if (tabla === "categorias") {
          fila.fecha_baja ??= null;
          assert(!datos[tabla].some((f) => f.fecha_baja == null && f.slug === fila.slug), "Slug duplicado");
        }
        if (tabla === "marcas") assert(!datos[tabla].some((f) => f.clave === fila.clave), "Marca duplicada");
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
    MarcaCategoriaDistribuidora: modelo("asociaciones"),
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
