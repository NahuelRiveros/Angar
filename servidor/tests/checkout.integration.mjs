import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
// Siempre localhost y un schema nuevo. Nunca ejecuta bootstrap ni usa la base remota.
dotenv.config({ quiet: true });
process.env.NODE_ENV = "test";
process.env.BD_URL = "";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_SSL = "false";
const ownedSchema = "codex_ux_test_" + randomUUID().replaceAll("-", "");
process.env.DB_SCHEMA = ownedSchema;
const { sequelize, DB_SCHEMA } = await import("../src/database/sequelize.js");
const models = await import("../src/models/index.js");
const { registrarCliente, login } = await import("../src/services/usuarios/auth_service.js");
const { obtenerCarrito, agregarItem, fusionarCarrito, actualizarCantidad } = await import("../src/services/distribuidora/carrito_distribuidora_service.js");
const { crearNotaPedido, cambiarEstado, registrarPago, anularPago, listarTodas } = await import("../src/services/distribuidora/nota_pedido_service.js");
const { createResetToken } = await import("../src/services/common/auth_tokens.js");
const { resetPassword } = await import("../src/services/usuarios/password_recovery_service.js");
const { env } = await import("../src/configuracion_servidor/env.js");
test("PostgreSQL: registro, fusión idempotente, cambios de precio, concurrencia y recuperación", async (t) => {
  let created = false;
  try {
    await sequelize.authenticate();
    assert.equal(DB_SCHEMA, ownedSchema);
    assert.match(DB_SCHEMA, /^codex_ux_test_[a-f0-9]{32}$/);
    await sequelize.query('CREATE SCHEMA "' + DB_SCHEMA + '"');
    created = true;
    for (const name of ["ModuloNegocio", "Sexo", "TipoDocumento", "TipoPersona", "Persona", "Usuario", "Rol", "UsuarioRol", "CategoriaDistribuidora", "ProductoDistribuidora", "VariedadDistribuidora", "CarritoDistribuidora", "CarritoDistribuidoraItem", "NotaPedido", "NotaPedidoEstadoLog", "NotaPedidoPago", "NotaPedidoItem", "PerfilClienteDistribuidora", "OperacionCarrito"]) await models[name].sync();
    await models.ModuloNegocio.create({ codigo: "eccomerce_distribuidora", descripcion: "Distribuidora", habilitado: true });
    await models.TipoDocumento.create({ descripcion: "DNI" });
    await models.Rol.create({ codigo: "cliente", descripcion: "Cliente" });
    const registration = await registrarCliente({ nombre: "Ana", apellido: "Prueba", email: "ana@example.test", password: "Clave1234" });
    assert.equal(registration.ok, true);
    const id = registration.usuario_id;
    await models.PerfilClienteDistribuidora.create({ usuario_id: id, cuit: "20-12345678-9", direccion: "Prueba 123", provincia: "Buenos Aires", localidad: "La Plata" });
    const category = await models.CategoriaDistribuidora.create({ nombre: "Almacén", slug: "almacen" });
    const product = await models.ProductoDistribuidora.create({ categoria_id: category.id, nombre: "Arroz" });
    const variant = await models.VariedadDistribuidora.create({ producto_id: product.id, nombre: "1 kg", precio: 100, controla_stock: true, cantidad: 100 });
    const payload = { producto_id: product.id, variedad_id: variant.id, cantidad: 2 };
    await t.test("fusionar dos veces la misma selección no duplica cantidades", async () => {
      const key = randomUUID();
      await Promise.all([fusionarCarrito(id, { key, items: [payload] }), fusionarCarrito(id, { key, items: [payload] })]);
      assert.equal((await obtenerCarrito(id))[0].cantidad, 2);
    });
    await t.test("rechaza cantidades no enteras y stock insuficiente", async () => {
      await assert.rejects(agregarItem(id, { ...payload, cantidad: "2" }));
      await assert.rejects(agregarItem(id, { ...payload, cantidad: 101 }));
    });
    await t.test("precio cambiado no genera pedido ni vacía el carrito", async () => {
      const old = await obtenerCarrito(id);
      await variant.update({ precio: 110 });
      await assert.rejects(crearNotaPedido(id, { key: randomUUID(), expectedItems: old }), /precio|cantidad/);
      assert.equal(await models.NotaPedido.count(), 0);
      assert.equal((await obtenerCarrito(id)).length, 1);
    });
    await t.test("envíos concurrentes y reintentos crean un único pedido", async () => {
      const expectedItems = await obtenerCarrito(id);
      const key = randomUUID();
      const [a,b] = await Promise.all([crearNotaPedido(id, { key, expectedItems }), crearNotaPedido(id, { key, expectedItems })]);
      assert.equal(a.id, b.id);
      assert.equal(await models.NotaPedido.count(), 1);
      assert.equal((await obtenerCarrito(id)).length, 0);
      assert.equal(Number(a.total), 220);
      assert.equal((await models.NotaPedidoItem.findOne()).variedad_id, variant.id);
      assert.equal((await crearNotaPedido(id, { key, expectedItems })).id, a.id);
    });
    await t.test("gestión: transiciones, auditoría y cobro independiente", async () => {
      const note = await models.NotaPedido.findOne();
      await assert.rejects(cambiarEstado(note.id, "entregado", { usuario_id: id, expectedState: "pendiente" }), /permitido/);
      await cambiarEstado(note.id, "en_curso", { usuario_id: id, expectedState: "pendiente" });
      await assert.rejects(cambiarEstado(note.id, "cancelada", { usuario_id: id, expectedState: "en_curso" }), /motivo/);
      await assert.rejects(cambiarEstado(note.id, "entregado", { usuario_id: id, expectedState: "pendiente" }), /operador/);
      await cambiarEstado(note.id, "entregado", { usuario_id: id, expectedState: "en_curso" });
      assert.equal((await note.reload()).estado_pago, "pendiente");
      assert.equal(await models.NotaPedidoEstadoLog.count(), 3);
      const list = await listarTodas({ q: "#" + note.id, estado: "entregado", estado_pago: "pendiente" });
      assert.equal(list.total, 1);
      assert.equal(list.data[0].historial_estados.length, 3);
      assert.equal((await listarTodas({ q: "NadieExiste" })).total, 0);
    });
    await t.test("cobros: reintentos, saldo máximo y anulación auditada", async () => {
      const note = await models.NotaPedido.findOne();
      const payment = { usuario_id: id, monto: 100, metodo: "efectivo", key: randomUUID() };
      await Promise.all([registrarPago(note.id, payment), registrarPago(note.id, payment)]);
      assert.equal(await models.NotaPedidoPago.count(), 1);
      assert.equal(Number((await note.reload()).monto_pagado), 100);
      await assert.rejects(registrarPago(note.id, { ...payment, monto: 99 }), /otros datos/);
      await assert.rejects(registrarPago(note.id, { ...payment, key: randomUUID(), monto: 121 }), /saldo/);
      await assert.rejects(registrarPago(note.id, { ...payment, key: randomUUID(), monto: 1.001 }), /decimales/);
      await registrarPago(note.id, { ...payment, key: randomUUID(), monto: 120 });
      assert.equal((await note.reload()).estado_pago, "pagado");
      const first = await models.NotaPedidoPago.findOne({ order: [["id", "ASC"]] });
      assert.equal(await anularPago(first.id, id, { pedidoId: 999999, motivo: "Error de carga" }), null);
      await assert.rejects(anularPago(first.id, id, { pedidoId: note.id, motivo: "" }), /motivo/);
      await Promise.all([anularPago(first.id, id, { pedidoId: note.id, motivo: "Error de carga" }), anularPago(first.id, id, { pedidoId: note.id, motivo: "Error de carga" })]);
      assert.equal(Number((await note.reload()).monto_pagado), 120);
      assert.equal(note.estado_pago, "parcial");
      assert.equal((await first.reload()).anulacion_motivo, "Error de carga");
      await cambiarEstado(note.id, "en_curso", { usuario_id: id, expectedState: "entregado", motivo: "Corregir entrega" });
      await cambiarEstado(note.id, "cancelada", { usuario_id: id, expectedState: "en_curso", motivo: "Solicita cliente" });
      await assert.rejects(registrarPago(note.id, { ...payment, key: randomUUID(), monto: 1 }), /Reabrí/);
    });
    await t.test("un cambio concurrente se serializa con el envío", async () => {
      await agregarItem(id, payload);
      const expectedItems = await obtenerCarrito(id);
      const results = await Promise.allSettled([
        actualizarCantidad(id, expectedItems[0].item_id, 3),
        crearNotaPedido(id, { key: randomUUID(), expectedItems }),
      ]);
      // O se envió el snapshot y el cambio no encuentra ítem, o el envío detectó el cambio.
      assert.equal(results.filter((r) => r.status === "rejected").length, 1);
    });
    await t.test("HTTP: cliente no gestiona notas y staff sí, con permisos actuales", async () => {
      const express = (await import("express")).default;
      const { notaPedidoRouter } = await import("../src/routes/distribuidora/nota_pedido_router.js");
      const app = express();
      app.use(express.json());
      app.use("/notas", notaPedidoRouter);
      const server = await new Promise((resolve) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
      });
      try {
        const url = "http://127.0.0.1:" + server.address().port + "/notas";
        const token = (await login({ email: "ana@example.test", password: "Clave1234" })).token;
        const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
        assert.equal((await fetch(url + "/todas")).status, 401);
        assert.equal((await fetch(url + "/todas", { headers })).status, 403);
        assert.equal((await fetch(url + "/1/estado", { headers, method: "PUT", body: JSON.stringify({ estado: "en_curso", expectedState: "pendiente" }) })).status, 403);
        assert.equal((await fetch(url, { headers })).status, 200);
        const staff = await models.Rol.create({ codigo: "staff", descripcion: "Staff" });
        await models.UsuarioRol.create({ usuario_id: id, rol_id: staff.id });
        const response = await fetch(url + "/todas", { headers });
        assert.equal(response.status, 200);
        assert.ok((await response.json()).total >= 1);
        await models.ModuloNegocio.update({ habilitado: false }, { where: { codigo: "eccomerce_distribuidora" } });
        assert.equal((await fetch(url + "/todas", { headers })).status, 403);
        await models.ModuloNegocio.update({ habilitado: true }, { where: { codigo: "eccomerce_distribuidora" } });
        // La revocación de rol debe surtir efecto con el mismo token.
        await models.UsuarioRol.destroy({ where: { usuario_id: id, rol_id: staff.id } });
        assert.equal((await fetch(url + "/todas", { headers })).status, 403);
      } finally { await new Promise((resolve) => server.close(resolve)); }
    });
    await t.test("enlace de recuperación se utiliza una vez y el login acepta la nueva clave", async () => {
      const user = await models.Usuario.findByPk(id);
      const token = createResetToken(user, env.JWT_SECRET, 20);
      await resetPassword(token, "NuevaClave123");
      await assert.rejects(resetPassword(token, "OtraClave456"), /enlace/);
      assert.equal((await login({ email: "ana@example.test", password: "NuevaClave123" })).ok, true);
      assert.equal((await login({ email: "ana@example.test", password: "Clave1234" })).ok, false);
    });
  } finally {
    if (created) {
      assert.equal(DB_SCHEMA, ownedSchema);
      assert.match(DB_SCHEMA, /^codex_ux_test_[a-f0-9]{32}$/);
      await sequelize.query('DROP SCHEMA "' + DB_SCHEMA + '" CASCADE');
    }
    await sequelize.close();
  }
});
