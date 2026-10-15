import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
// Siempre localhost y un schema nuevo. Nunca ejecuta bootstrap ni usa la base remota.
dotenv.config({ quiet: true });
process.env.NODE_ENV = "test";
process.env.BD_URL = "";
process.env.GOOGLE_CLIENT_ID = "cliente-de-prueba";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_SSL = "false";
const ownedSchema = "codex_ux_test_" + randomUUID().replaceAll("-", "");
process.env.DB_SCHEMA = ownedSchema;
const { sequelize, DB_SCHEMA } = await import("../src/database/sequelize.js");
const models = await import("../src/models/index.js");
const { registrarCliente, login, loginConGoogle } = await import("../src/services/usuarios/auth_service.js");
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
        const token = (await login({ identificador: "ana@example.test", password: "Clave1234" })).token;
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
      assert.equal((await login({ identificador: "ana@example.test", password: "NuevaClave123" })).ok, true);
      assert.equal((await login({ identificador: "ana@example.test", password: "Clave1234" })).ok, false);
    });
    await t.test("login con email o nombre de usuario, sin distinguir mayúsculas", async () => {
      await models.Usuario.update({ nombre_usuario: "ana.prueba" }, { where: { id } });
      const porUsuario = await login({ identificador: " Ana.Prueba ", password: "NuevaClave123" });
      assert.equal(porUsuario.ok, true);
      assert.equal(porUsuario.usuario.nombre_usuario, "ana.prueba");
      assert.equal((await login({ identificador: "ANA@EXAMPLE.TEST", password: "NuevaClave123" })).ok, true);
      for (const identificador of ["ana.prueba", "otro.usuario", "a b", ""]) {
        const r = await login({ identificador, password: identificador === "ana.prueba" ? "mala" : "NuevaClave123" });
        assert.equal(r.codigo, "CREDENCIALES_INVALIDAS", identificador);
      }
      const otra = await registrarCliente({ nombre: "Beto", apellido: "Prueba", email: "beto@example.test", password: "Clave1234" });
      await assert.rejects(models.Usuario.update({ nombre_usuario: "ana.prueba" }, { where: { id: otra.usuario_id } }));
    });
    await t.test("registro con usuario opcional: guarda en minúsculas, rechaza repetido e inválido", async () => {
      const base = { nombre: "Caro", apellido: "Prueba", password: "Clave1234" };
      const conUsuario = await registrarCliente({ ...base, email: "caro@example.test", nombre_usuario: " Caro.P " });
      assert.equal(conUsuario.ok, true);
      assert.equal((await models.Usuario.findByPk(conUsuario.usuario_id)).nombre_usuario, "caro.p");
      assert.equal((await login({ identificador: "caro.p", password: "Clave1234" })).ok, true);

      const sinUsuario = await registrarCliente({ ...base, email: "dani@example.test", nombre_usuario: "  " });
      assert.equal(sinUsuario.ok, true);
      assert.equal((await models.Usuario.findByPk(sinUsuario.usuario_id)).nombre_usuario, null);

      const repetido = await registrarCliente({ ...base, email: "eli@example.test", nombre_usuario: "CARO.P" });
      assert.equal(repetido.codigo, "NOMBRE_USUARIO_DUPLICADO");
      assert.equal(await models.Persona.count({ where: { email: "eli@example.test" } }), 0);
      assert.equal((await registrarCliente({ ...base, email: "fede@example.test", nombre_usuario: "con espacio" })).codigo, "NOMBRE_USUARIO_INVALIDO");

      // Simultáneos con el mismo usuario: uno se crea y el otro recibe el mensaje, sin error 500.
      const [a, b] = await Promise.all([
        registrarCliente({ ...base, email: "gabi@example.test", nombre_usuario: "mismo" }),
        registrarCliente({ ...base, email: "hugo@example.test", nombre_usuario: "mismo" }),
      ]);
      assert.deepEqual([a.ok, b.ok].sort(), [false, true]);
      assert.equal([a, b].find((r) => !r.ok).codigo, "NOMBRE_USUARIO_DUPLICADO");
      assert.equal(await models.Usuario.count({ where: { nombre_usuario: "mismo" } }), 1);
    });
    await t.test("Google: crea cliente, vincula por email verificado y rechaza credenciales dudosas", async () => {
      const google = (datos) => ({ verificar: async () => ({ email_verificado: true, nombre: "Gise", apellido: "Google", ...datos }) });

      // Cuenta nueva: cliente con rol, sin contraseña conocida; la segunda vez entra a la misma.
      const nueva = await loginConGoogle({ credencial: "x" }, google({ google_id: "g-nueva", email: "Gise@Example.TEST" }));
      assert.equal(nueva.ok, true);
      assert.deepEqual(nueva.usuario.roles, ["cliente"]);
      assert.equal(nueva.usuario.email, "gise@example.test");
      const otraVez = await loginConGoogle({ credencial: "x" }, google({ google_id: "g-nueva", email: "gise.nuevo@example.test" }));
      assert.equal(otraVez.usuario.usuario_id, nueva.usuario.usuario_id);
      assert.equal(await models.Persona.count({ where: { email: "gise.nuevo@example.test" } }), 0);

      // Email que ya tenía cuenta con contraseña: se vincula y la contraseña sigue funcionando.
      const vinculada = await loginConGoogle({ credencial: "x" }, google({ google_id: "g-caro", email: "caro@example.test" }));
      assert.equal(vinculada.ok, true);
      assert.equal((await models.Usuario.findByPk(vinculada.usuario.usuario_id)).google_id, "g-caro");
      assert.equal((await login({ identificador: "caro@example.test", password: "Clave1234" })).ok, true);
      const otraCuenta = await loginConGoogle({ credencial: "x" }, google({ google_id: "g-intruso", email: "caro@example.test" }));
      assert.equal(otraCuenta.codigo, "GOOGLE_OTRA_CUENTA");

      const sinVerificar = await loginConGoogle({ credencial: "x" }, google({ google_id: "g-dani", email: "dani@example.test", email_verificado: false }));
      assert.equal(sinVerificar.codigo, "GOOGLE_EMAIL_NO_VERIFICADO");
      assert.equal((await models.Usuario.findOne({ include: [{ model: models.Persona, as: "persona", where: { email: "dani@example.test" } }] })).google_id, null);
      const invalida = await loginConGoogle({ credencial: "x" }, { verificar: async () => { throw new Error("firma inválida"); } });
      assert.equal(invalida.codigo, "GOOGLE_INVALIDO");

      // Doble clic: dos pedidos simultáneos crean una sola cuenta.
      const [a, b] = await Promise.all([1, 2].map(() => loginConGoogle({ credencial: "x" }, google({ google_id: "g-doble", email: "doble@example.test" }))));
      assert.equal(a.ok && b.ok, true);
      assert.equal(a.usuario.usuario_id, b.usuario.usuario_id);
      assert.equal(await models.Persona.count({ where: { email: "doble@example.test" } }), 1);
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
