import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import express from "express";
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
const { Persona, Usuario } = await import("../src/core/models/index.js");
const { moduloCatalogo } = await import("../src/core/opcionales/catalogo/modulo.js");
const { moduloPedidos } = await import("../src/core/opcionales/pedidos/modulo.js");
const categorias = await import("../src/core/opcionales/catalogo/services/categorias_service.js");
const productos = await import("../src/core/opcionales/catalogo/services/productos_service.js");
const compra = await import("../src/core/opcionales/pedidos/services/enviar_service.js");
const panel = await import("../src/core/opcionales/pedidos/services/panel_service.js");
const { esquemaCategoria, esquemaEditarProducto, esquemaProducto } = await import("../src/core/opcionales/catalogo/reglas.js");
const { esquemaEnviar, esquemaFiltros } = await import("../src/core/opcionales/pedidos/reglas.js");
const { manejarErrores } = await import("../src/core/app.js");
const { POR_HORA, crearPedidosRouter } = await import("../src/core/opcionales/pedidos/pedidos_router.js");

const base = { sequelize, schema };
const conCodigo = (codigo) => (error) => { assert.equal(error.codigo, codigo, error.message); return true; };
const pedido = (items, extra) => esquemaEnviar().parse({ clave_envio: randomUUID(), nombre: "Ana Gómez", celular: "1123456789", entrega: "envio", direccion: "Calle Falsa 123", localidad: "Centro", items, ...extra });
const contar = async () => (await sequelize.query("SELECT count(*)::int AS n FROM ped_pedido", { plain: true })).n;
const listar = async (filtros) => panel.listarPedidos(esquemaFiltros.parse(filtros));
const editar = async (id, cambio) => {
  const actual = await productos.obtenerProducto(id);
  return productos.actualizarProducto(id, esquemaEditarProducto.parse({ ...actual, ...cambio }));
};
async function persona(nombre, apellido) {
  const p = await Persona.create({ nombre, apellido });
  return (await Usuario.create({ persona_id: p.id, contrasena: "x" })).id;
}

test("PostgreSQL: pedidos", async (t) => {
  let creado = false;
  try {
    await sequelize.authenticate();
    await bootstrap_database();
    creado = true;
    // Si el proyecto ya los tiene prendidos, el arranque las subió: acá no queda nada por subir.
    await subirMigraciones([moduloCatalogo, moduloPedidos], base);
    const cat = await categorias.crearCategoria(esquemaCategoria.parse({ nombre: "Cascos" }));
    const casco = await productos.crearProducto(esquemaProducto.parse({ nombre: "Casco Ñandú", categoria_id: cat.id, variantes: [{ nombre: "M", codigo: "C-M", precio: "100.10" }, { nombre: "L", precio: 200 }] }));
    const [m, l] = casco.variantes;
    const sinPrecio = (await productos.crearProducto(esquemaProducto.parse({ nombre: "Guantes", categoria_id: cat.id, variantes: [{}] }))).variantes[0];
    const oculto = (await productos.crearProducto(esquemaProducto.parse({ nombre: "Oculto", categoria_id: cat.id, activo: false, variantes: [{ precio: 1 }] }))).variantes[0];
    const empleada = await persona("Eva", "Prueba");
    const clienta = await persona("Ana", "Gómez");
    let primero;

    await t.test("MOD-08: la base y los modelos tienen las mismas columnas", async () => {
      for (const modelo of moduloPedidos.modelos) {
        const [columnas] = await sequelize.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = :schema AND table_name = :tabla", { replacements: { schema, tabla: modelo.tableName } });
        const enBase = Object.fromEntries(columnas.map((c) => [c.column_name, c.is_nullable === "YES"]));
        const enModelo = Object.fromEntries(Object.entries(modelo.rawAttributes).map(([n, a]) => [n, a.allowNull !== false && !a.primaryKey]));
        assert.deepEqual(enBase, enModelo, modelo.tableName);
      }
    });

    await t.test("MPE-02, MPE-05 y MPE-06: el servidor calcula el total y el pedido guarda su copia aunque el producto cambie", async () => {
      primero = await compra.enviarPedido(pedido([{ variante_id: m.id, cantidad: 3, precio_visto: "100.10" }, { variante_id: l.id, cantidad: 1 }]), clienta);
      assert.equal(primero.total, "500.30");
      assert.match(primero.clave, /^[A-Za-z0-9_-]{24}$/);
      await editar(casco.id, { nombre: "Casco Pro", variantes: [{ ...m, nombre: "Mediano", precio: 999 }, l] });
      const visto = await compra.seguirPedido(primero.clave);
      assert.deepEqual(visto.items.map((i) => [i.producto_nombre, i.variante_nombre, i.precio, i.cantidad, i.subtotal]), [["Casco Ñandú", "M", "100.10", 3, "300.30"], ["Casco Ñandú", "L", "200.00", 1, "200.00"]]);
      const mios = await compra.misPedidos(clienta, { page: 1 });
      assert.deepEqual(mios.items.map((p) => [p.numero, p.unidades, p.estado]), [[primero.numero, 4, "recibido"]]);
      assert.deepEqual((await compra.misPedidos(empleada, { page: 1 })).items, []);
    });

    await t.test("MPE-03: con un precio viejo o algo que ya no se vende, no se crea nada y se dice qué cambió", async () => {
      const antes = await contar();
      await assert.rejects(compra.enviarPedido(pedido([{ variante_id: m.id, cantidad: 1, precio_visto: "100.10" }, { variante_id: sinPrecio.id, cantidad: 1 }, { variante_id: oculto.id, cantidad: 1 }, { variante_id: 999999, cantidad: 1 }])), (error) => {
        assert.equal(error.codigo, "CARRITO_CAMBIO");
        assert.equal(error.estado, 409);
        assert.deepEqual(error.datos.cambios.map((c) => [c.variante_id, c.tipo, c.precio]), [[m.id, "precio", "999.00"], [sinPrecio.id, "no_disponible", undefined], [oculto.id, "no_disponible", undefined], [999999, "no_disponible", undefined]]);
        return true;
      });
      await editar(casco.id, { variantes: [{ ...m, precio: 999 }, { ...l, disponible: false }] });
      await assert.rejects(compra.enviarPedido(pedido([{ variante_id: l.id, cantidad: 1 }])), conCodigo("CARRITO_CAMBIO"));
      await editar(casco.id, { variantes: [{ ...m, precio: 999 }, { ...l, disponible: true }] });
      assert.equal(await contar(), antes);
    });

    await t.test("MPE-04: el mismo envío dos veces, o tres a la vez, crea un solo pedido", async () => {
      const antes = await contar();
      const datos = pedido([{ variante_id: l.id, cantidad: 2 }], { entrega: "retiro" });
      const [a, b, c] = await Promise.all([compra.enviarPedido(datos), compra.enviarPedido(datos), compra.enviarPedido(datos)]);
      assert.equal(new Set([a.numero, b.numero, c.numero]).size, 1);
      assert.equal((await compra.enviarPedido(datos)).clave, a.clave);
      assert.equal(await contar(), antes + 1);
    });

    await t.test("MPE-09: el link muestra el pedido sin celular ni dirección; uno inventado no existe", async () => {
      const visto = await compra.seguirPedido(primero.clave);
      assert.equal(visto.nombre, "Ana");
      for (const campo of ["celular", "direccion", "localidad", "nota", "usuario_id", "clave_envio"]) assert.equal(visto[campo], undefined, campo);
      assert.deepEqual(visto.historial.map((h) => h.estado), ["recibido"]);
      await assert.rejects(compra.seguirPedido("A".repeat(24)), conCodigo("NO_EXISTE"));
    });

    await t.test("MPE-07: avanza, vuelve, cancela y reabre; cada paso queda con persona, fecha y motivo", async () => {
      const id = primero.numero;
      let p = await panel.cambiarEstado(id, { estado: "confirmado", motivo: "se ignora", version: 1 }, empleada);
      assert.deepEqual([p.estado, p.version], ["confirmado", 2]);
      await assert.rejects(panel.cambiarEstado(id, { estado: "entregado", motivo: null, version: 2 }, empleada), conCodigo("ESTADO_INVALIDO"));
      await assert.rejects(panel.cambiarEstado(id, { estado: "cancelado", motivo: null, version: 2 }, empleada), conCodigo("DATOS_INVALIDOS"));
      p = await panel.cambiarEstado(id, { estado: "cancelado", motivo: "No contesta", version: 2 }, empleada);
      p = await panel.cambiarEstado(id, { estado: "recibido", motivo: "Volvió a escribir", version: 3 }, empleada);
      assert.deepEqual(p.historial.map((h) => [h.de, h.a, h.motivo, h.persona]), [
        [null, "recibido", null, "Ana Gómez"], ["recibido", "confirmado", null, "Eva Prueba"], ["confirmado", "cancelado", "No contesta", "Eva Prueba"], ["cancelado", "recibido", "Volvió a escribir", "Eva Prueba"],
      ]);
      assert.deepEqual(p.siguientes.map((s) => s.estado), ["confirmado", "cancelado"]);
      assert.equal(p.celular, "1123456789", "el panel sí ve el contacto");
      assert.equal(p.clave_envio, undefined);
    });

    await t.test("MPE-08: dos personas a la vez sobre el mismo pedido: una gana y la otra recibe el aviso", async () => {
      const { version } = await panel.obtenerPedido(primero.numero);
      const resultados = await Promise.allSettled([
        panel.cambiarEstado(primero.numero, { estado: "confirmado", motivo: null, version }, empleada),
        panel.cambiarEstado(primero.numero, { estado: "cancelado", motivo: "Duplicado", version }, empleada),
      ]);
      assert.deepEqual(resultados.map((r) => r.status).sort(), ["fulfilled", "rejected"]);
      assert.equal(resultados.find((r) => r.status === "rejected").reason.codigo, "CAMBIO_SIMULTANEO");
      await assert.rejects(panel.cambiarEstado(primero.numero, { estado: "recibido", motivo: "x", version }, empleada), conCodigo("CAMBIO_SIMULTANEO"));
    });

    await t.test("MPE-10: lista por estado y busca por número, nombre sin acentos o celular", async () => {
      const otro = await compra.enviarPedido(pedido([{ variante_id: l.id, cantidad: 1 }], { nombre: "José Núñez", celular: "3415550000", entrega: "retiro" }));
      const numeros = async (filtros) => (await listar(filtros)).items.map((p) => p.numero);
      assert.deepEqual(await numeros({ q: "nunez" }), [otro.numero]);
      assert.deepEqual(await numeros({ q: "555" }), [otro.numero]);
      assert.deepEqual(await numeros({ q: `#${otro.numero}` }), [otro.numero]);
      assert.deepEqual(await numeros({ q: "100%" }), []);
      const todos = await listar({});
      assert.equal(todos.paginacion.total, await contar());
      assert.deepEqual(todos.items.map((p) => p.numero), [...todos.items.map((p) => p.numero)].sort((a, b) => b - a), "los más nuevos primero");
      const recibidos = await listar({ estado: "recibido" });
      assert.equal(recibidos.items.every((p) => p.estado === "recibido"), true);
      assert.equal(Object.values(todos.por_estado).reduce((a, b) => a + b, 0), todos.paginacion.total);
      await assert.rejects(panel.obtenerPedido(999999), conCodigo("NO_EXISTE"));
    });

    await t.test("MCA-08: dar de baja un producto no rompe sus pedidos viejos", async () => {
      await productos.eliminarProducto(casco.id);
      const visto = await panel.obtenerPedido(primero.numero);
      assert.equal(visto.items[0].producto_nombre, "Casco Ñandú");
      await assert.rejects(compra.enviarPedido(pedido([{ variante_id: m.id, cantidad: 1 }])), conCodigo("CARRITO_CAMBIO"));
    });

    await t.test("MPE-11: por la API, sin ingresar; desde la misma conexión, hasta 10 pedidos por hora", async () => {
      const producto = await productos.crearProducto(esquemaProducto.parse({ nombre: "Cadena", categoria_id: cat.id, variantes: [{ precio: 50 }] }));
      const servidor = express().use(express.json()).use("/pedidos", crearPedidosRouter()).use(manejarErrores).listen(0);
      await new Promise((listo) => servidor.once("listening", listo));
      try {
        const enviar = (extra) => fetch(`http://127.0.0.1:${servidor.address().port}/pedidos`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ clave_envio: randomUUID(), nombre: "Ana", celular: "1123456789", entrega: "retiro", items: [{ variante_id: producto.variantes[0].id, cantidad: 1, precio_visto: "50.00" }], ...extra }),
        });
        const cambio = await enviar({ items: [{ variante_id: producto.variantes[0].id, cantidad: 1, precio_visto: "40" }] });
        assert.equal(cambio.status, 409);
        assert.equal((await cambio.json()).datos.cambios[0].precio, "50.00");
        for (let i = 0; i < POR_HORA; i++) assert.equal((await enviar()).status, 201, `pedido ${i + 1}`);
        const tope = await enviar();
        assert.equal(tope.status, 429);
        assert.equal((await tope.json()).codigo, "DEMASIADOS_INTENTOS");
      } finally {
        servidor.close();
      }
    });

    await t.test("MOD-09: la migración se deshace entera y vuelve a subir", async () => {
      assert.equal(await deshacerMigracion(moduloPedidos, base), "001_pedidos");
      const [restos] = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = :schema AND tablename LIKE 'ped\\_%'", { replacements: { schema } });
      assert.deepEqual(restos, []);
      assert.deepEqual(await subirMigraciones([moduloCatalogo, moduloPedidos], base), ["pedidos/001_pedidos"]);
    });
  } finally {
    if (creado) {
      assert.match(schema, /^core_test_[a-f0-9]{32}$/);
      await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await sequelize.close();
  }
});
