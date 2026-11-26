import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Contra el PostgreSQL LOCAL, en un schema nuevo que se borra al terminar (ver core_modulos.integration.mjs).
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true });
process.env.NODE_ENV = "test";
process.env.BD_URL = "";
process.env.BD_URL_SUPABASE = "";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_SSL = "false";
const schema = "core_test_" + randomUUID().replaceAll("-", "");
process.env.DB_SCHEMA = schema;
process.env.BD_ESQUEMA = schema;

const { sequelize } = await import("../src/core/database/sequelize.js");
const { bootstrap_database } = await import("../src/core/database/bootstrap.js");
const { deshacerMigracion, subirMigraciones } = await import("../src/core/database/migraciones.js");
const { moduloCatalogo } = await import("../src/core/opcionales/catalogo/modulo.js");
const categorias = await import("../src/core/opcionales/catalogo/services/categorias_service.js");
const productos = await import("../src/core/opcionales/catalogo/services/productos_service.js");
const web = await import("../src/core/opcionales/catalogo/services/web_service.js");
const { esquemaCategoria, esquemaEditarProducto, esquemaFiltrosPanel, esquemaFiltrosWeb, esquemaProducto } = await import("../src/core/opcionales/catalogo/reglas.js");

const base = { sequelize, schema };
const conCodigo = (codigo) => (error) => { assert.equal(error.codigo, codigo, error.message); return true; };
const categoria = (nombre, extra) => categorias.crearCategoria(esquemaCategoria.parse({ nombre, ...extra }));
const crear = (nombre, categoria_id, extra) => productos.crearProducto(esquemaProducto.parse({ nombre, categoria_id, variantes: [{ precio: 100 }], ...extra }));
const editar = async (id, cambio) => {
  const actual = await productos.obtenerProducto(id);
  return productos.actualizarProducto(id, esquemaEditarProducto.parse({ ...actual, ...cambio }));
};
const enWeb = async (filtros = {}) => (await web.listarProductosWeb(esquemaFiltrosWeb.parse(filtros))).items.map((p) => p.nombre);
const enPanel = async (filtros = {}) => (await productos.listarProductos(esquemaFiltrosPanel.parse(filtros))).items.map((p) => p.nombre);

test("PostgreSQL: catálogo", async (t) => {
  let creado = false;
  try {
    await sequelize.authenticate();
    await bootstrap_database();
    creado = true;
    await subirMigraciones([moduloCatalogo], base);
    let accesorios;
    let cascos;
    let casco;

    await t.test("MOD-08: la base y los modelos tienen las mismas columnas", async () => {
      for (const modelo of moduloCatalogo.modelos) {
        const [columnas] = await sequelize.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = :schema AND table_name = :tabla", { replacements: { schema, tabla: modelo.tableName } });
        const enBase = Object.fromEntries(columnas.map((c) => [c.column_name, c.is_nullable === "YES"]));
        const enModelo = Object.fromEntries(Object.entries(modelo.rawAttributes).map(([n, a]) => [n, a.allowNull !== false && !a.primaryKey]));
        assert.deepEqual(enBase, enModelo, modelo.tableName);
      }
    });

    await t.test("MCA-05: dos niveles, sin repetir nombre en el mismo nivel", async () => {
      accesorios = await categoria("Accesorios");
      cascos = await categoria("Cascos", { padre_id: accesorios.id });
      await assert.rejects(categoria("Integrales", { padre_id: cascos.id }), conCodigo("NIVELES"));
      await assert.rejects(categoria("CASCOS", { padre_id: accesorios.id }), conCodigo("DUPLICADO"));
      const otra = await categoria("Cascos");
      assert.equal(otra.slug, "cascos-2", "en otro nivel sí, con otra dirección");
      const editarCat = (c, extra) => categorias.actualizarCategoria(c.id, esquemaCategoria.parse({ nombre: c.nombre, padre_id: c.padre_id, ...extra }));
      await assert.rejects(editarCat(accesorios, { padre_id: otra.id }), conCodigo("NIVELES"));
      await assert.rejects(editarCat(otra, { padre_id: otra.id }), conCodigo("NIVELES"));
      await assert.rejects(categoria("X", { padre_id: 9999 }), conCodigo("NO_EXISTE"));
      await categorias.eliminarCategoria(otra.id);
      await assert.rejects(categorias.eliminarCategoria(accesorios.id), conCodigo("EN_USO"));
    });

    await t.test("MCA-01, MCA-02 y MCA-04: se crea con sus opciones y fotos en orden", async () => {
      casco = await crear("Casco Ñandú", cascos.id, {
        variantes: [{ nombre: "M", codigo: "CN-M", precio: "95000.50" }, { nombre: "L", precio: 90000, disponible: false }], fotos: ["https://x.test/1.jpg", "https://x.test/2.jpg"],
      });
      const ficha = await web.detalleProducto("casco-nandu");
      assert.deepEqual(ficha.fotos, ["https://x.test/1.jpg", "https://x.test/2.jpg"]);
      assert.deepEqual(ficha.variantes.map((v) => [v.nombre, v.precio, v.disponible]), [["M", "95000.50", true], ["L", "90000.00", false]]);
      assert.deepEqual([ficha.precio, ficha.desde], ["95000.50", true]);
      assert.deepEqual(ficha.categorias.map((c) => c.nombre), ["Accesorios", "Cascos"]);
      await assert.rejects(crear("X", 9999), conCodigo("DATOS_INVALIDOS"));
    });

    await t.test("MCA-07: dos con el mismo nombre no chocan, ni creados a la vez; renombrar no cambia la dirección", async () => {
      const [a, b] = await Promise.all([crear("Cadena", accesorios.id), crear("Cadena", accesorios.id)]);
      assert.deepEqual([a.slug, b.slug].sort(), ["cadena", "cadena-2"]);
      const renombrada = await editar(a.id, { nombre: "Cadena 428" });
      assert.equal(renombrada.slug, a.slug);
      await productos.eliminarProducto(b.id);
      assert.equal((await crear("Cadena", accesorios.id, { activo: false })).slug, "cadena-3", "la dirección de uno dado de baja no se reutiliza");
    });

    await t.test("MCA-06: la web busca sin acentos, por nombre o código, y lo disponible va primero", async () => {
      await crear("Aceite agotado", accesorios.id, { variantes: [{ precio: 1, disponible: false }] });
      assert.deepEqual(await enWeb(), ["Cadena 428", "Casco Ñandú", "Aceite agotado"]);
      assert.deepEqual(await enWeb({ q: "nandu" }), ["Casco Ñandú"]);
      assert.deepEqual(await enWeb({ q: "ÑANDÚ" }), ["Casco Ñandú"]);
      assert.deepEqual(await enWeb({ q: "cn-m" }), ["Casco Ñandú"]);
      assert.deepEqual(await enWeb({ q: "%" }), [], "el comodín se busca como texto");
      assert.deepEqual(await enWeb({ categoria: "cascos" }), ["Casco Ñandú"]);
      assert.equal((await enWeb({ categoria: "accesorios" })).length, 3, "incluye sus subcategorías");
      assert.deepEqual(await enWeb({ categoria: "no-existe" }), []);
    });

    await t.test("MCA-06: lo oculto no se ve, tampoco si se oculta su categoría o la de arriba", async () => {
      const ocultar = (activo) => categorias.actualizarCategoria(accesorios.id, esquemaCategoria.parse({ nombre: "Accesorios", activo }));
      await ocultar(false);
      assert.deepEqual(await enWeb(), [], "la caché se entera del cambio");
      assert.deepEqual(await categorias.categoriasVisibles(), []);
      await assert.rejects(web.detalleProducto("casco-nandu"), conCodigo("NO_EXISTE"));
      await ocultar(true);
      await editar(casco.id, { activo: false });
      assert.equal((await enWeb()).includes("Casco Ñandú"), false);
      await editar(casco.id, { activo: true });
      assert.equal((await enWeb()).includes("Casco Ñandú"), true);
    });

    await t.test("MCA-02: quitar una opción la saca de la web y conserva su fila; las otras no cambian de id", async () => {
      const antes = await productos.obtenerProducto(casco.id);
      const [m, l] = antes.variantes;
      const despues = await editar(casco.id, { variantes: [{ ...l, precio: 91000, disponible: true }, { nombre: "XL", precio: 99000 }] });
      assert.deepEqual(despues.variantes.map((x) => x.nombre), ["L", "XL"]);
      assert.equal(despues.variantes[0].id, l.id);
      const [[fila]] = await sequelize.query(`SELECT eliminado_en FROM "${schema}".cat_variante WHERE id = :id`, { replacements: { id: m.id } });
      assert.ok(fila.eliminado_en);
      await assert.rejects(editar(casco.id, { variantes: [{ ...m, nombre: "M" }] }), conCodigo("CAMBIO_SIMULTANEO"));
      const ajena = (await crear("Otro", accesorios.id)).variantes[0];
      await assert.rejects(editar(casco.id, { variantes: [ajena] }), conCodigo("CAMBIO_SIMULTANEO"), "no se puede tocar la opción de otro producto");
    });

    await t.test("MCA-09: dos personas guardando a la vez no se pisan", async () => {
      const actual = await productos.obtenerProducto(casco.id);
      const guardar = (nombre) => productos.actualizarProducto(casco.id, esquemaEditarProducto.parse({ ...actual, nombre }));
      const resultados = await Promise.allSettled([guardar("Uno"), guardar("Dos")]);
      assert.deepEqual(resultados.map((r) => r.status).sort(), ["fulfilled", "rejected"]);
      conCodigo("CAMBIO_SIMULTANEO")(resultados.find((r) => r.status === "rejected").reason);
    });

    await t.test("MCA-09: el panel filtra por estado, categoría y texto", async () => {
      assert.deepEqual(await enPanel({ estado: "ocultos" }), ["Cadena"]);
      assert.deepEqual(await enPanel({ estado: "sin_stock" }), ["Aceite agotado"]);
      assert.equal((await enPanel({ categoria_id: accesorios.id })).length, (await enPanel()).length);
      assert.equal((await enPanel({ categoria_id: cascos.id })).length, 1);
      assert.deepEqual(await enPanel({ q: "cadena 4" }), ["Cadena 428"]);
    });

    await t.test("MCA-01: los destacados salen en el inicio", async () => {
      assert.deepEqual(await web.listarDestacados(), []);
      await editar(casco.id, { destacado: true });
      assert.deepEqual((await web.listarDestacados()).map((p) => [p.id, p.categoria]), [[casco.id, "Cascos"]]);
    });

    await t.test("MCA-08: dar de baja lo saca de todos lados y conserva la fila; su categoría no se puede borrar", async () => {
      await productos.eliminarProducto(casco.id);
      await assert.rejects(web.detalleProducto("casco-nandu"), conCodigo("NO_EXISTE"));
      await assert.rejects(productos.obtenerProducto(casco.id), conCodigo("NO_EXISTE"));
      await assert.rejects(productos.eliminarProducto(casco.id), conCodigo("NO_EXISTE"));
      await assert.rejects(categorias.eliminarCategoria(cascos.id), conCodigo("EN_USO"));
    });

    await t.test("MOD-18: un rubro suma datos con su propia tabla unida a cat_variante, sin tocar las del módulo", async () => {
      const { DataTypes } = await import("sequelize");
      const { defineModel } = await import("../src/core/models/common/define_model.js");
      const { choquesDeModulos } = await import("../src/core/opcionales/verificar.js");
      const { MODULOS_OPCIONALES } = await import("../../core/modulos_opcionales.js");
      // Así lo haría un rubro: tabla con su prefijo y la variante como clave.
      const Talle = defineModel("PruebaVarianteTalle", {
        variante_id: { type: DataTypes.INTEGER, primaryKey: true, references: { model: "cat_variante", key: "id" } },
        talle_cm: { type: DataTypes.SMALLINT, allowNull: false },
      }, { tableName: "prueba_variante_talle" });
      assert.deepEqual(choquesDeModulos({ definiciones: MODULOS_OPCIONALES, opcionales: [moduloCatalogo], rubros: [{ codigo: "prueba", modelos: [Talle] }], tablasRetiradas: [], codigosPermiso: [] }), []);
      await Talle.sync();
      try {
        const otro = await crear("Casco con talle", cascos.id, { variantes: [{ nombre: "M", precio: 10 }, { nombre: "L", precio: 10 }] });
        await Talle.bulkCreate(otro.variantes.map((v, i) => ({ variante_id: v.id, talle_cm: 56 + i * 2 })));
        await editar(otro.id, { nombre: "Casco con talle EJEMPLO" });
        const [filas] = await sequelize.query("SELECT v.nombre, t.talle_cm FROM cat_variante v JOIN prueba_variante_talle t ON t.variante_id = v.id ORDER BY v.id");
        assert.deepEqual(filas, [{ nombre: "M", talle_cm: 56 }, { nombre: "L", talle_cm: 58 }]);
        const [columnas] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_schema = :schema AND table_name = 'cat_variante' ORDER BY ordinal_position", { replacements: { schema } });
        assert.ok(!columnas.some((c) => c.column_name === "talle_cm"), "cat_variante no ganó columnas");
      } finally {
        await Talle.drop();
      }
    });

    await t.test("MOD-09: la migración se deshace entera y vuelve a subir", async () => {
      // Si el proyecto prende módulos que usan las tablas del catálogo (pedidos, stock), primero se deshacen esos.
      const [usan] = await sequelize.query("SELECT DISTINCT modulo FROM _migraciones WHERE modulo <> 'catalogo' ORDER BY modulo");
      for (const { modulo } of usan) await deshacerMigracion({ codigo: modulo, migraciones: new URL(`../src/core/opcionales/${modulo}/migraciones/`, import.meta.url) }, base);
      assert.equal(await deshacerMigracion(moduloCatalogo, base), "001_catalogo");
      const [restos] = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = :schema AND tablename LIKE 'cat\\_%'", { replacements: { schema } });
      assert.deepEqual(restos, []);
      assert.deepEqual(await subirMigraciones([moduloCatalogo], base), ["catalogo/001_catalogo"]);
    });
  } finally {
    if (creado) {
      assert.match(schema, /^core_test_[a-f0-9]{32}$/);
      await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await sequelize.close();
  }
});
