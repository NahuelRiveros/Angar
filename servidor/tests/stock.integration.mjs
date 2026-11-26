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
const { registrarEnganches } = await import("../src/core/opcionales/enganches.js");
const { moduloCatalogo } = await import("../src/core/opcionales/catalogo/modulo.js");
const { moduloPedidos } = await import("../src/core/opcionales/pedidos/modulo.js");
const { moduloStock } = await import("../src/core/opcionales/stock/modulo.js");
const categorias = await import("../src/core/opcionales/catalogo/services/categorias_service.js");
const productos = await import("../src/core/opcionales/catalogo/services/productos_service.js");
const web = await import("../src/core/opcionales/catalogo/services/web_service.js");
const compra = await import("../src/core/opcionales/pedidos/services/enviar_service.js");
const panel = await import("../src/core/opcionales/pedidos/services/panel_service.js");
const stock = await import("../src/core/opcionales/stock/services/stock_service.js");
const { esquemaCategoria, esquemaEditarProducto, esquemaProducto } = await import("../src/core/opcionales/catalogo/reglas.js");
const { esquemaEnviar } = await import("../src/core/opcionales/pedidos/reglas.js");
const { esquemaFiltros, esquemaMovimiento } = await import("../src/core/opcionales/stock/reglas.js");

const base = { sequelize, schema };
const conCodigo = (codigo) => (error) => { assert.equal(error.codigo, codigo, error.message); return true; };
const mover = (id, datos) => stock.mover(id, esquemaMovimiento.parse(datos), null);
const cantidad = async (id) => (await sequelize.query("SELECT cantidad FROM stk_existencia WHERE variante_id = :id", { replacements: { id }, plain: true }))?.cantidad;
const enWeb = async (slug) => Object.fromEntries((await web.detalleProducto(slug)).variantes.map((v) => [v.nombre, v.disponible]));
const pedir = (items) => compra.enviarPedido(esquemaEnviar().parse({ clave_envio: randomUUID(), nombre: "Ana", celular: "1123456789", entrega: "retiro", items }));
async function estado(numero, a, motivo = null) {
  const { version } = await panel.obtenerPedido(numero);
  return panel.cambiarEstado(numero, { estado: a, motivo, version }, null);
}

test("PostgreSQL: stock", async (t) => {
  let creado = false;
  try {
    await sequelize.authenticate();
    await bootstrap_database();
    creado = true;
    const modulos = [moduloCatalogo, moduloStock, moduloPedidos];
    await subirMigraciones(modulos, base);
    registrarEnganches(modulos);
    const cat = await categorias.crearCategoria(esquemaCategoria.parse({ nombre: "Cascos" }));
    const casco = await productos.crearProducto(esquemaProducto.parse({ nombre: "Casco", categoria_id: cat.id, variantes: [{ nombre: "M", precio: 100 }, { nombre: "L", precio: 100 }, { nombre: "XL", precio: 100 }] }));
    const [m, l, xl] = casco.variantes.map((v) => v.id);

    await t.test("MOD-08: la base y los modelos tienen las mismas columnas", async () => {
      for (const modelo of moduloStock.modelos) {
        const [columnas] = await sequelize.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = :schema AND table_name = :tabla", { replacements: { schema, tabla: modelo.tableName } });
        const enBase = Object.fromEntries(columnas.map((c) => [c.column_name, c.is_nullable === "YES"]));
        const enModelo = Object.fromEntries(Object.entries(modelo.rawAttributes).map(([n, a]) => [n, a.allowNull !== false && !a.primaryKey]));
        assert.deepEqual(enBase, enModelo, modelo.tableName);
      }
    });

    await t.test("MST-01 y MST-06: al controlar, el «hay stock» de la web sale de la cantidad y el formulario no lo pisa", async () => {
      await stock.controlar(m, { cantidad: 0, minimo: 0 }, null);
      await stock.controlar(l, { cantidad: 5, minimo: 2 }, null);
      await assert.rejects(stock.controlar(l, { cantidad: 1, minimo: 0 }, null), conCodigo("DUPLICADO"));
      assert.deepEqual(await enWeb("casco"), { M: false, L: true, XL: true }, "XL no controla: vale su casilla");
      const enPanel = await productos.obtenerProducto(casco.id);
      assert.deepEqual(enPanel.variantes.map((v) => v.disponible_por), ["stock", "stock", null]);
      await productos.actualizarProducto(casco.id, esquemaEditarProducto.parse({ ...enPanel, variantes: enPanel.variantes.map((v) => ({ ...v, disponible: !v.disponible })) }));
      assert.deepEqual(await enWeb("casco"), { M: false, L: true, XL: false }, "solo cambió la que no controla");
      await mover(m, { tipo: "entrada", cantidad: 3 });
      assert.deepEqual(await enWeb("casco"), { M: true, L: true, XL: false }, "la entrada se ve en la web sin esperar la caché");
    });

    await t.test("MST-02 y MST-03: cada movimiento guarda saldo y motivo; nunca queda negativo, ni con dos a la vez", async () => {
      await assert.rejects(mover(l, { tipo: "salida", cantidad: 6, motivo: "Rotura" }), conCodigo("STOCK_INSUFICIENTE"));
      await assert.rejects(mover(xl, { tipo: "entrada", cantidad: 1 }), conCodigo("NO_EXISTE"));
      await assert.rejects(mover(l, { tipo: "ajuste", cantidad: 5, motivo: "Conteo" }), conCodigo("SIN_CAMBIOS"));
      const resultados = await Promise.allSettled([1, 2, 3].map(() => mover(l, { tipo: "salida", cantidad: 2, motivo: "Venta en el local" })));
      assert.deepEqual(resultados.map((r) => r.status).sort(), ["fulfilled", "fulfilled", "rejected"]);
      assert.equal(await cantidad(l), 1);
      await mover(l, { tipo: "ajuste", cantidad: 4, motivo: "Conteo" });
      const { items } = await stock.movimientos(l, { page: 1 });
      assert.deepEqual(items.map((i) => [i.tipo, i.cantidad, i.saldo]), [["ajuste", 3, 4], ["salida", -2, 1], ["salida", -2, 3], ["inicio", 5, 5]]);
      assert.equal(items[1].motivo, "Venta en el local");
    });

    await t.test("MST-02: un movimiento no se edita ni se borra, tampoco por SQL", async () => {
      await assert.rejects(sequelize.query("UPDATE stk_movimiento SET cantidad = 99"), /no se editan ni se borran/);
      await assert.rejects(sequelize.query("DELETE FROM stk_movimiento"), /no se editan ni se borran/);
    });

    await t.test("MST-04 y MST-05: confirmar descuenta; si falta, no avanza y dice cuánto hay; devolver es una sola vez", async () => {
      const grande = await pedir([{ variante_id: l, cantidad: 9 }]);
      await assert.rejects(estado(grande.numero, "confirmado"), (error) => {
        assert.equal(error.codigo, "STOCK_INSUFICIENTE");
        assert.match(error.message, /Casco \(L\): pide 9 y hay 4/);
        return true;
      });
      assert.equal((await panel.obtenerPedido(grande.numero)).estado, "recibido", "el pedido no avanzó");

      const chico = await pedir([{ variante_id: l, cantidad: 3 }, { variante_id: m, cantidad: 1 }]);
      await estado(chico.numero, "confirmado");
      assert.deepEqual([await cantidad(l), await cantidad(m)], [1, 2]);
      await estado(chico.numero, "listo");
      await estado(chico.numero, "confirmado", "Faltaba algo");
      assert.deepEqual([await cantidad(l), await cantidad(m)], [1, 2], "ir y volver entre pasos con stock tomado no mueve nada");
      await estado(chico.numero, "cancelado", "No lo retiró");
      assert.deepEqual([await cantidad(l), await cantidad(m)], [4, 3]);
      await estado(chico.numero, "recibido", "Volvió");
      assert.deepEqual([await cantidad(l), await cantidad(m)], [4, 3], "reabrir no descuenta");
      await estado(chico.numero, "confirmado");
      assert.deepEqual([await cantidad(l), await cantidad(m)], [1, 2]);
      const porPedido = await sequelize.query("SELECT tipo, cantidad FROM stk_movimiento WHERE pedido_id = :id AND variante_id = :l ORDER BY id", { replacements: { id: chico.numero, l }, type: "SELECT" });
      assert.deepEqual(porPedido.map((x) => [x.tipo, x.cantidad]), [["pedido", -3], ["devolucion", 3], ["pedido", -3]]);
    });

    await t.test("MST-06: lo agotado y lo bajo van primero; los filtros separan lo que hay que reponer", async () => {
      await mover(l, { tipo: "salida", cantidad: 1, motivo: "Rotura" });
      const lista = async (filtros) => (await stock.listar(esquemaFiltros.parse(filtros))).items.map((i) => [i.opcion, i.estado]);
      assert.deepEqual(await lista({}), [["L", "agotado"], ["M", "ok"], ["XL", null]]);
      assert.deepEqual(await lista({ estado: "reponer" }), [["L", "agotado"]]);
      await stock.cambiarMinimo(m, { minimo: 2 });
      assert.deepEqual(await lista({ estado: "reponer" }), [["L", "agotado"], ["M", "bajo"]]);
      assert.deepEqual(await lista({ estado: "sin_control" }), [["XL", null]]);
      assert.deepEqual(await lista({ q: "CASCO" }), await lista({}));
      assert.deepEqual(await lista({ q: "zzz%" }), []);
      assert.equal((await web.detalleProducto("casco")).variantes.find((v) => v.nombre === "L").cantidad, undefined, "la web nunca ve cantidades");
    });

    await t.test("MST-01: dejar de controlar vuelve a la casilla y conserva los movimientos", async () => {
      await stock.dejarDeControlar(l);
      assert.equal(await cantidad(l), undefined);
      assert.ok((await stock.movimientos(l, { page: 1 })).paginacion.total > 0);
      assert.equal((await productos.obtenerProducto(casco.id)).variantes.find((v) => v.id === l).disponible_por, null);
    });

    await t.test("MOD-09: la migración se deshace entera y vuelve a subir", async () => {
      assert.equal(await deshacerMigracion(moduloStock, base), "001_stock");
      const [restos] = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = :schema AND tablename LIKE 'stk\\_%'", { replacements: { schema } });
      assert.deepEqual(restos, []);
      assert.deepEqual(await subirMigraciones(modulos, base), ["stock/001_stock"]);
    });
  } finally {
    registrarEnganches([]);
    if (creado) {
      assert.match(schema, /^core_test_[a-f0-9]{32}$/);
      await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await sequelize.close();
  }
});
