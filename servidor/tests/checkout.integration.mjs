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
// Nunca enviar correos reales: el .env local puede tener SMTP o Brevo cargados.
// dotenv no pisa variables ya definidas, así que vacías quedan vacías.
for (const clave of ["SMTP_USER", "SMTP_PASS", "CLAVE_API_BREVO", "CORREO_REMITENTE"]) process.env[clave] = "";
const ownedSchema = "codex_ux_test_" + randomUUID().replaceAll("-", "");
process.env.DB_SCHEMA = ownedSchema;
const { sequelize, DB_SCHEMA } = await import("../src/database/sequelize.js");
const models = await import("../src/models/index.js");
const { registrarCliente, login, loginConGoogle } = await import("../src/services/usuarios/auth_service.js");
const { obtenerCarrito, agregarItem, fusionarCarrito, actualizarCantidad, vaciarCarrito } = await import("../src/services/distribuidora/carrito_distribuidora_service.js");
const { crearNotaPedido, cambiarEstado, cancelarPropia, registrarPago, anularPago, listarTodas } = await import("../src/services/distribuidora/nota_pedido_service.js");
const { createResetToken } = await import("../src/services/common/auth_tokens.js");
const { resetPassword } = await import("../src/services/usuarios/password_recovery_service.js");
const { env } = await import("../src/configuracion_servidor/env.js");
const { guardarPerfil, obtenerPerfil } = await import("../src/services/distribuidora/perfil_cliente_service.js");
const { crear_indice_busqueda_productos, aplicar_ajustes_puntuales, TABLAS_RETIRADAS } = await import("../src/database/bootstrap.js");
const { obtenerResumenPanel } = await import("../src/services/distribuidora/panel_distribuidora_service.js");
const productos = await import("../src/services/distribuidora/producto_distribuidora_service.js");
const { armarListaCarga } = await import("../src/services/distribuidora/lista_carga_service.js");
const { validarVariedad } = await import("../src/services/common/articulo_rules.js");
const categoriasSrv = await import("../src/services/distribuidora/catalogos_distribuidora_service.js");
const marcasSrv = await import("../src/services/distribuidora/marcas_distribuidora_service.js");
const listasSrv = await import("../src/services/distribuidora/listas_precio_service.js");
const { sincronizarPermisos } = await import("../src/services/usuarios/permisos_service.js");
const { permisosEfectivos } = await import("../../permisos_config.js");
// Usuario con los permisos que le darían esos roles (asignados = lo tildado en el panel).
const comoUsuario = (roles, asignados = []) => ({ roles, permisos: permisosEfectivos(roles, asignados) });
test("PostgreSQL: registro, fusión idempotente, cambios de precio, concurrencia y recuperación", async (t) => {
  let created = false;
  try {
    await sequelize.authenticate();
    assert.equal(DB_SCHEMA, ownedSchema);
    assert.match(DB_SCHEMA, /^codex_ux_test_[a-f0-9]{32}$/);
    await sequelize.query('CREATE SCHEMA "' + DB_SCHEMA + '"');
    created = true;
    for (const name of ["ModuloNegocio", "Sexo", "TipoDocumento", "TipoPersona", "Persona", "Usuario", "Rol", "UsuarioRol", "Modulo", "Permiso", "RolPermiso", "CategoriaDistribuidora", "MarcaDistribuidora", "MarcaCategoriaDistribuidora", "ProductoDistribuidora", "VariedadDistribuidora", "ListaPrecio", "ListaPrecioLocalidad", "ListaPrecioItem", "CarritoDistribuidora", "CarritoDistribuidoraItem", "NotaPedido", "NotaPedidoEstadoLog", "NotaPedidoPago", "NotaPedidoComprobante", "NotaPedidoItem", "PerfilClienteDistribuidora", "OperacionCarrito"]) await models[name].sync();
    await models.ModuloNegocio.create({ codigo: "eccomerce_distribuidora", descripcion: "Distribuidora", habilitado: true });
    await models.TipoDocumento.create({ descripcion: "DNI" });
    await models.Rol.create({ codigo: "cliente", descripcion: "Cliente" });
    // Igual que el arranque: roles del personal y sus permisos por defecto.
    await models.Rol.bulkCreate([{ codigo: "supervisor", descripcion: "Supervisor" }, { codigo: "vendedor", descripcion: "Vendedor" }]);
    await sincronizarPermisos();
    const registration = await registrarCliente({ nombre: "Ana", apellido: "Prueba", email: "ana@example.test", password: "Clave1234" });
    assert.equal(registration.ok, true);
    const id = registration.usuario_id;
    // Recién registrada no puede pedir: le faltan celular y datos de entrega.
    assert.equal((await obtenerPerfil(id)).completo, false);
    const datosAna = { nombre: "Ana", apellido: "Prueba", celular: "11 2345-6789", cuit: "20-12345678-9", razon_social: null, condicion_iva: null, direccion: "Prueba 123", provincia: "Buenos Aires", departamento: null, localidad: "La Plata", codigo_postal: null };
    const guardado = await guardarPerfil(id, datosAna);
    assert.equal(guardado.completo, true);
    assert.equal((await models.Persona.findOne({ where: { email: "ana@example.test" } })).celular, "11 2345-6789");
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
      await assert.rejects(cambiarEstado(note.id, "en_curso", { usuario_id: id, expectedState: "pendiente" }), /permitido/);
      await cambiarEstado(note.id, "confirmado", { usuario_id: id, expectedState: "pendiente" });
      // Confirmar descuenta las 2 unidades del pedido; avanzar dentro de los estados con stock no vuelve a descontar.
      assert.equal((await variant.reload()).cantidad, 98);
      assert.equal((await note.reload()).stock_descontado, true);
      await cambiarEstado(note.id, "en_curso", { usuario_id: id, expectedState: "confirmado" });
      await assert.rejects(cambiarEstado(note.id, "cancelada", { usuario_id: id, expectedState: "en_curso" }), /motivo/);
      await assert.rejects(cambiarEstado(note.id, "entregado", { usuario_id: id, expectedState: "pendiente" }), /operador/);
      await cambiarEstado(note.id, "entregado", { usuario_id: id, expectedState: "en_curso" });
      assert.equal((await variant.reload()).cantidad, 98);
      assert.equal((await note.reload()).estado_pago, "pendiente");
      assert.equal(await models.NotaPedidoEstadoLog.count(), 4);
      const list = await listarTodas({ q: "#" + note.id, estado: "entregado", estado_pago: "pendiente" });
      assert.equal(list.total, 1);
      assert.equal(list.data[0].historial_estados.length, 4);
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
      // Cancelar un pedido que había descontado devuelve el stock una sola vez.
      assert.equal((await variant.reload()).cantidad, 100);
      assert.equal((await note.reload()).stock_descontado, false);
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
    // Arma un pedido de una sola línea con el carrito real de Ana.
    async function pedirAna(producto, variedad, cantidad) {
      await vaciarCarrito(id);
      await agregarItem(id, { producto_id: producto.id, variedad_id: variedad.id, cantidad });
      return crearNotaPedido(id, { key: randomUUID(), expectedItems: await obtenerCarrito(id) });
    }
    const productoEscaso = await models.ProductoDistribuidora.create({ categoria_id: category.id, nombre: "Té en hebras" });
    const escasa = await models.VariedadDistribuidora.create({ producto_id: productoEscaso.id, nombre: "500 g", precio: 50, controla_stock: true, cantidad: 5 });
    await t.test("stock: confirmar descuenta, sin stock no confirma y los pedidos viejos no devuelven", async () => {
      // Los dos pedidos entran porque enviar no reserva; el segundo choca al confirmar.
      const a = await pedirAna(productoEscaso, escasa, 4);
      const b = await pedirAna(productoEscaso, escasa, 4);
      await cambiarEstado(a.id, "confirmado", { usuario_id: id, expectedState: "pendiente" });
      assert.equal((await escasa.reload()).cantidad, 1);
      await assert.rejects(cambiarEstado(b.id, "confirmado", { usuario_id: id, expectedState: "pendiente" }), /stock suficiente.*Té en hebras \(500 g\): hay 1, el pedido lleva 4/);
      assert.equal((await b.reload()).estado, "pendiente");
      assert.equal((await escasa.reload()).cantidad, 1);
      // Volver a "Recibido" devuelve lo descontado y libera el stock para el otro pedido.
      await assert.rejects(cambiarEstado(a.id, "pendiente", { usuario_id: id, expectedState: "confirmado" }), /motivo/);
      await cambiarEstado(a.id, "pendiente", { usuario_id: id, expectedState: "confirmado", motivo: "Revisar precios" });
      assert.equal((await escasa.reload()).cantidad, 5);
      await cambiarEstado(b.id, "confirmado", { usuario_id: id, expectedState: "pendiente" });
      assert.equal((await escasa.reload()).cantidad, 1);
      // Confirmaciones simultáneas del stock restante: solo una puede pasar.
      await escasa.update({ cantidad: 4 });
      const c = await pedirAna(productoEscaso, escasa, 3);
      await cambiarEstado(a.id, "cancelada", { usuario_id: id, expectedState: "pendiente", motivo: "Duplicado" });
      const d = await pedirAna(productoEscaso, escasa, 3);
      const resultados = await Promise.allSettled([c, d].map((n) => cambiarEstado(n.id, "confirmado", { usuario_id: id, expectedState: "pendiente" })));
      assert.equal(resultados.filter((r) => r.status === "rejected").length, 1);
      assert.equal((await escasa.reload()).cantidad, 1);
      // Pedido en preparación de antes de este cambio: nunca descontó, cancelarlo no suma stock.
      const viejo = await models.NotaPedido.create({ usuario_id: id, estado: "en_curso", total: 50 });
      await models.NotaPedidoItem.create({ nota_pedido_id: viejo.id, producto_id: productoEscaso.id, variedad_id: escasa.id, nombre_producto: "Té en hebras", precio_unitario: 50, cantidad: 1, subtotal: 50 });
      await cambiarEstado(viejo.id, "cancelada", { usuario_id: id, expectedState: "en_curso", motivo: "Pedido viejo" });
      assert.equal((await escasa.reload()).cantidad, 1);
    });
    await t.test("comprador: cancela en Recibido, vuelve a armar una sola vez y no toca pedidos ajenos ni en proceso", async () => {
      const nota = await pedirAna(product, variant, 3);
      const otro = await registrarCliente({ nombre: "Beto", apellido: "Ajeno", email: "beto@example.test", password: "Clave1234" });
      assert.equal(await cancelarPropia(otro.usuario_id, nota.id, { motivo: "No es mío" }), null);
      await assert.rejects(cancelarPropia(id, nota.id, { motivo: " " }), /motivo/);
      await variant.update({ precio: 120 });
      // Doble clic: cualquiera de los dos puede ganar el lock, el otro encuentra el pedido cancelado.
      const intentos = await Promise.allSettled([
        cancelarPropia(id, nota.id, { motivo: "Me equivoqué", volverAlCarrito: true }),
        cancelarPropia(id, nota.id, { motivo: "Me equivoqué", volverAlCarrito: true }),
      ]);
      const ok = intentos.filter((r) => r.status === "fulfilled");
      const rechazos = intentos.filter((r) => r.status === "rejected");
      assert.equal(ok.length, 1);
      assert.deepEqual(ok[0].value.omitidos, []);
      assert.match(rechazos[0].reason.message, /ya está cancelado/);
      const carrito = await obtenerCarrito(id);
      assert.equal(carrito.length, 1);
      assert.equal(carrito[0].cantidad, 3, "el doble clic no repone dos veces");
      assert.equal(carrito[0].precio, 120, "vuelve con el precio de hoy");
      const log = await models.NotaPedidoEstadoLog.findOne({ where: { nota_pedido_id: nota.id, nuevo: "cancelada" } });
      assert.match(log.motivo, /^Cancelado por el cliente: Me equivoqué$/);
      // Lo que ya no alcanza vuelve ajustado y se informa.
      const escasaNota = await pedirAna(productoEscaso, escasa, 1);
      await escasa.update({ cantidad: 0 });
      await vaciarCarrito(id);
      const { omitidos } = await cancelarPropia(id, escasaNota.id, { motivo: "Cambio de idea", volverAlCarrito: true });
      assert.deepEqual(omitidos, [{ nombre: "Té en hebras (500 g)", pedido: 1, cargado: 0 }]);
      assert.equal((await obtenerCarrito(id)).length, 0);
      // Una vez confirmado ya no lo cancela el comprador.
      const confirmada = await pedirAna(product, variant, 1);
      await cambiarEstado(confirmada.id, "confirmado", { usuario_id: id, expectedState: "pendiente" });
      await assert.rejects(cancelarPropia(id, confirmada.id, { motivo: "Tarde" }), /en proceso/);
      assert.equal((await confirmada.reload()).estado, "confirmado");
    });
    await t.test("HTTP: cliente no gestiona notas y el supervisor sí, con sus permisos", async () => {
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
        const cancelar = (ruta) => fetch(url + ruta, { headers, method: "POST", body: JSON.stringify({ motivo: "Prueba" }) });
        assert.equal((await cancelar("/999999/cancelar")).status, 404);
        assert.equal((await cancelar("/abc/cancelar")).status, 404);
        const staff = await models.Rol.findOne({ where: { codigo: "supervisor" } });
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
    await t.test("avisos: pedido nuevo al equipo y al comprador una sola vez; estados y cancelación; Brevo caído no frena el pedido", async () => {
      const { esperarAvisos } = await import("../src/services/distribuidora/avisos_pedido_service.js");
      const { mailConfigured } = await import("../src/services/common/mail_service.js");
      assert.equal(mailConfigured(), false, "las pruebas arrancan sin ningún correo real configurado");
      const previo = { ...env };
      const fetchReal = globalThis.fetch;
      const mails = [];
      let brevoCaido = false;
      // Solo se intercepta Brevo; cualquier otra petición sigue su curso.
      globalThis.fetch = async (url, opciones) => {
        if (!String(url).startsWith("https://api.brevo.com/")) return fetchReal(url, opciones);
        if (brevoCaido) return new Response("caído", { status: 503 });
        mails.push(JSON.parse(opciones.body));
        return new Response("{}", { status: 201 });
      };
      Object.assign(env, { CLAVE_API_BREVO: "clave-de-prueba", CORREO_REMITENTE: "pedidos@example.test" });
      try {
        const rolStaff = await models.Rol.findOne({ where: { codigo: "supervisor" } });
        const [rolVendedor] = await models.Rol.findOrCreate({ where: { codigo: "vendedor" }, defaults: { descripcion: "Vendedor" } });
        const eva = await registrarCliente({ nombre: "Eva", apellido: "Equipo", email: "eva@example.test", password: "Clave1234" });
        const suspendido = await registrarCliente({ nombre: "Sol", apellido: "Suspendida", email: "sol@example.test", password: "Clave1234" });
        await models.UsuarioRol.bulkCreate([{ usuario_id: eva.usuario_id, rol_id: rolStaff.id }, { usuario_id: eva.usuario_id, rol_id: rolVendedor.id }, { usuario_id: suspendido.usuario_id, rol_id: rolVendedor.id }]);
        await models.Usuario.update({ activo: false }, { where: { id: suspendido.usuario_id } });

        await vaciarCarrito(id);
        await agregarItem(id, payload);
        const key = randomUUID();
        const expectedItems = await obtenerCarrito(id);
        const nota = await crearNotaPedido(id, { key, expectedItems });
        await crearNotaPedido(id, { key, expectedItems }); // reintento del navegador
        await esperarAvisos();
        assert.equal(mails.length, 2, "un mail al equipo y uno al comprador, sin repetir por el reintento");
        const alEquipo = mails.find((m) => m.subject.startsWith("Nuevo pedido"));
        // Eva tiene dos roles de gestión pero recibe uno solo; la usuaria suspendida no recibe.
        assert.deepEqual(alEquipo.to, [{ email: "eva@example.test" }]);
        assert.match(alEquipo.subject, new RegExp(`#${nota.id} de Ana Prueba`));
        assert.deepEqual(mails.find((m) => m.subject === `Recibimos tu pedido #${nota.id}`).to, [{ email: "ana@example.test" }]);

        mails.length = 0;
        await cambiarEstado(nota.id, "confirmado", { usuario_id: eva.usuario_id, expectedState: "pendiente" });
        await cambiarEstado(nota.id, "confirmado", { usuario_id: eva.usuario_id, expectedState: "confirmado" }); // sin cambio, sin mail
        await esperarAvisos();
        assert.deepEqual(mails.map((m) => [m.subject, m.to[0].email]), [[`Tu pedido #${nota.id}: Confirmado`, "ana@example.test"]]);

        mails.length = 0;
        const otra = await pedirAna(product, variant, 1);
        await esperarAvisos();
        mails.length = 0;
        await cancelarPropia(id, otra.id, { motivo: "Pedí de más" });
        await esperarAvisos();
        assert.equal(mails.length, 1);
        assert.equal(mails[0].subject, `Ana Prueba canceló el pedido #${otra.id}`);
        assert.match(mails[0].textContent, /Motivo: Pedí de más/);

        // Si Brevo no responde, el pedido igual se guarda y el error queda solo en el log.
        brevoCaido = true;
        const sinMail = await pedirAna(product, variant, 1);
        await esperarAvisos();
        assert.equal((await models.NotaPedido.findByPk(sinMail.id)).estado, "pendiente");
      } finally {
        await esperarAvisos();
        Object.assign(env, previo);
        globalThis.fetch = fetchReal;
      }
    });
    await t.test("comprobantes: archivo real y privado, rechazo, aceptación con cobro, anulación y permisos", async () => {
      const { cloudinary } = await import("../src/configuracion_servidor/cloudinary.js");
      const { Writable } = await import("node:stream");
      const comprobantes = await import("../src/services/distribuidora/comprobantes_service.js");
      const { listarPropias } = await import("../src/services/distribuidora/nota_pedido_service.js");
      const { orderConfig } = await import("../../order_config.js");
      const originales = { subir: cloudinary.uploader.upload_stream, borrar: cloudinary.uploader.destroy, enlace: cloudinary.utils.private_download_url };
      const subidas = [];
      const borrados = [];
      let alSubir = null;
      // Cloudinary simulado: ningún archivo sale de la máquina.
      cloudinary.uploader.upload_stream = (opciones, listo) => new Writable({
        write(_chunk, _enc, cb) { cb(); },
        final(cb) {
          subidas.push(opciones);
          Promise.resolve(alSubir?.()).then(() => { listo(null, { public_id: `${opciones.folder}/${opciones.public_id}`, resource_type: "image" }); cb(); });
        },
      });
      cloudinary.uploader.destroy = async (publicId, opciones) => { borrados.push({ publicId, opciones }); return { result: "ok" }; };
      cloudinary.utils.private_download_url = (publicId, formato, opciones) => `https://cloudinary.test/${publicId}.${formato}?expira=${opciones.expires_at}&tipo=${opciones.type}`;
      const pdf = (texto = "a") => ({ buffer: Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.from(texto.padEnd(20, " "))]), originalname: "transferencia.pdf" });
      const png = { buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]), originalname: "captura.png" };
      try {
        const nota = await pedirAna(product, variant, 2);
        const total = Number(nota.total);
        const beto = await models.Usuario.findOne({ include: [{ model: models.Persona, as: "persona", where: { email: "beto@example.test" } }] });

        await assert.rejects(comprobantes.subirComprobante(id, nota.id, { buffer: Buffer.from("MZ ejecutable renombrado.pdf"), originalname: "x.pdf" }), /imagen.*PDF/);
        await assert.rejects(comprobantes.subirComprobante(id, nota.id, null), /Adjuntá/);
        assert.equal(await comprobantes.subirComprobante(beto.id, nota.id, pdf()), null, "no adjunta a pedidos ajenos");
        assert.equal(subidas.length, 0, "nada inválido llega a Cloudinary");

        const primero = await comprobantes.subirComprobante(id, nota.id, pdf());
        assert.equal(primero.estado, "pendiente");
        assert.equal(primero.formato, "pdf");
        assert.deepEqual([subidas[0].type, subidas[0].folder], ["private", "distribucg/comprobantes"]);
        assert.equal((await listarTodas({ comprobante: "por_revisar" })).data.some((n) => n.id === nota.id), true);
        assert.equal((await listarTodas({ comprobante: "sin" })).data.some((n) => n.id === nota.id), false);
        const propio = (await listarPropias(id)).find((n) => n.id === nota.id).toJSON();
        assert.equal(propio.comprobantes.length, 1);
        assert.equal("public_id" in propio.comprobantes[0], false, "el id de Cloudinary no sale en la API");

        const enlace = await comprobantes.enlaceComprobante({ usuario_id: id, ...comoUsuario(["cliente"]) }, nota.id, primero.id);
        assert.match(enlace.url, /^https:\/\/cloudinary\.test\/distribucg\/comprobantes\/pedido-\d+-.+\.pdf\?expira=\d+&tipo=private$/);
        assert.equal(await comprobantes.enlaceComprobante({ usuario_id: beto.id, ...comoUsuario(["cliente"]) }, nota.id, primero.id), null);
        assert.ok(await comprobantes.enlaceComprobante({ usuario_id: beto.id, ...comoUsuario(["vendedor"], ["pedidos.ver"]) }, nota.id, primero.id), "el equipo ve cualquier comprobante");

        await assert.rejects(comprobantes.rechazarComprobante(nota.id, primero.id, { usuario_id: id, motivo: " " }), /motivo/);
        await comprobantes.rechazarComprobante(nota.id, primero.id, { usuario_id: id, motivo: "No se lee el importe" });
        assert.equal((await primero.reload()).motivo_rechazo, "No se lee el importe");
        await assert.rejects(comprobantes.rechazarComprobante(nota.id, primero.id, { usuario_id: id, motivo: "Otra vez" }), /ya fue revisado/);
        assert.equal((await listarTodas({ comprobante: "sin" })).data.some((n) => n.id === nota.id), true, "un rechazado cuenta como sin comprobante");

        // Aceptar registra el cobro por transferencia; un doble clic no cobra dos veces.
        const segundo = await comprobantes.subirComprobante(id, nota.id, png);
        const intentos = await Promise.allSettled([1, 2].map(() => comprobantes.aceptarComprobante(nota.id, segundo.id, { usuario_id: id, monto: total })));
        assert.equal(intentos.filter((r) => r.status === "fulfilled").length, 1);
        assert.match(intentos.find((r) => r.status === "rejected").reason.message, /ya fue revisado/);
        assert.equal((await nota.reload()).estado_pago, "pagado");
        await segundo.reload();
        const pago = await models.NotaPedidoPago.findByPk(segundo.pago_id);
        assert.deepEqual([segundo.estado, pago.metodo, Number(pago.monto), pago.nota], ["aceptado", "transferencia", total, `Comprobante #${segundo.id}`]);
        await assert.rejects(comprobantes.subirComprobante(id, nota.id, pdf()), /ya figura como cobrado/);

        // Si se anula ese cobro (la plata no llegó), el comprobante vuelve a revisión.
        await anularPago(pago.id, id, { pedidoId: nota.id, motivo: "No se acreditó" });
        assert.deepEqual([(await segundo.reload()).estado, segundo.pago_id], ["pendiente", null]);
        await assert.rejects(comprobantes.aceptarComprobante(nota.id, segundo.id, { usuario_id: id, monto: total + 1 }), /saldo/);

        // Si el pedido cambia mientras se sube el archivo, el registro se cancela y el archivo se borra.
        alSubir = () => models.NotaPedido.update({ estado: "cancelada" }, { where: { id: nota.id } });
        await assert.rejects(comprobantes.subirComprobante(id, nota.id, pdf("tarde")), /cancelado/);
        alSubir = null;
        assert.equal(borrados.at(-1).publicId, `distribucg/comprobantes/${subidas.at(-1).public_id}`);
        assert.equal(borrados.at(-1).opciones.type, "private");
        await models.NotaPedido.update({ estado: "pendiente" }, { where: { id: nota.id } });
        assert.equal(await models.NotaPedidoComprobante.count({ where: { nota_pedido_id: nota.id } }), 2);

        await models.NotaPedidoComprobante.bulkCreate([1, 2, 3].map(() => ({ nota_pedido_id: nota.id, public_id: "x", resource_type: "image", formato: "pdf", tamano: 1, subido_por: id })));
        await assert.rejects(comprobantes.subirComprobante(id, nota.id, pdf()), /máximo de 5/);

        // HTTP: el vendedor no cobra, el archivo grande se corta antes de leerse y el id privado no sale.
        const express = (await import("express")).default;
        const { notaPedidoRouter } = await import("../src/routes/distribuidora/nota_pedido_router.js");
        const app = express();
        app.use(express.json());
        app.use("/notas", notaPedidoRouter);
        const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
        try {
          const url = `http://127.0.0.1:${server.address().port}/notas`;
          const vero = await registrarCliente({ nombre: "Vero", apellido: "Ventas", email: "vero@example.test", password: "Clave1234" });
          const [rolVendedor] = await models.Rol.findOrCreate({ where: { codigo: "vendedor" }, defaults: { descripcion: "Vendedor" } });
          await models.UsuarioRol.create({ usuario_id: vero.usuario_id, rol_id: rolVendedor.id });
          const token = async (identificador) => "Bearer " + (await login({ identificador, password: "Clave1234" })).token;
          const vendedor = { Authorization: await token("vero@example.test"), "Content-Type": "application/json" };
          assert.equal((await fetch(`${url}/${nota.id}/comprobantes/${segundo.id}/aceptar`, { method: "POST", headers: vendedor, body: JSON.stringify({ monto: 1 }) })).status, 403);
          assert.equal((await fetch(`${url}/${nota.id}/pagos`, { method: "POST", headers: vendedor, body: JSON.stringify({ monto: 1 }) })).status, 403);
          assert.equal((await fetch(`${url}/${nota.id}/comprobantes/${segundo.id}/enlace`, { headers: vendedor })).status, 200);

          const nueva = await pedirAna(product, variant, 1);
          const ana = { Authorization: await token("ana@example.test") };
          const formulario = (contenido, nombre) => { const f = new FormData(); f.append("archivo", new Blob([contenido]), nombre); return f; };
          const grande = await fetch(`${url}/${nueva.id}/comprobantes`, { method: "POST", headers: ana, body: formulario(Buffer.alloc(orderConfig.receipts.maxBytes + 1), "enorme.pdf") });
          assert.equal(grande.status, 413);
          const subida = await fetch(`${url}/${nueva.id}/comprobantes`, { method: "POST", headers: ana, body: formulario(png.buffer, "captura.png") });
          assert.equal(subida.status, 201);
          const cuerpo = await subida.json();
          assert.equal(cuerpo.data.formato, "png");
          assert.equal("public_id" in cuerpo.data, false);
          assert.equal((await fetch(`${url}/abc/comprobantes`, { method: "POST", headers: ana, body: formulario(png.buffer, "x.png") })).status, 404);
        } finally { await new Promise((resolve) => server.close(resolve)); }
      } finally {
        Object.assign(cloudinary.uploader, { upload_stream: originales.subir, destroy: originales.borrar });
        cloudinary.utils.private_download_url = originales.enlace;
      }
    });
    await t.test("permisos: sincronización sin pisar el panel, staff → supervisor, roles nuevos y precios protegidos", async () => {
      const permisosSrv = await import("../src/services/usuarios/permisos_service.js");
      const { renombrarStaffASupervisor } = await import("../src/database/seed/seed_rbac.js");
      const { listarRolesAsignables } = await import("../src/services/usuarios/admin_staff_service.js");
      const codigosDe = async (codigo) => (await permisosSrv.listarRolesConPermisos()).find((r) => r.codigo === codigo)?.permisos;
      const vendedor = await models.Rol.findOne({ where: { codigo: "vendedor" } });

      // Lo destildado en el panel no vuelve al reiniciar; un permiso que salió de la lista se borra.
      await permisosSrv.guardarPermisosDeRol(vendedor.id, []);
      await models.Permiso.create({ codigo: "viejo.permiso", accion: "permiso", descripcion: "Ya no existe", modulo_id: (await models.Modulo.findOne()).id });
      assert.deepEqual(await permisosSrv.sincronizarPermisos(), { nuevos: 0, borrados: 1 });
      assert.deepEqual(await codigosDe("vendedor"), []);
      await permisosSrv.guardarPermisosDeRol(vendedor.id, ["pedidos.ver", "pedidos.gestionar"]);

      // Una base vieja con "staff": sus usuarios pasan a supervisor y el rol viejo desaparece.
      const staff = await models.Rol.create({ codigo: "staff", descripcion: "Staff" });
      const viejo = await registrarCliente({ nombre: "Sergio", apellido: "Staff", email: "sergio@example.test", password: "Clave1234" });
      await models.UsuarioRol.create({ usuario_id: viejo.usuario_id, rol_id: staff.id });
      await renombrarStaffASupervisor();
      await renombrarStaffASupervisor(); // sin "staff", no hace nada
      assert.equal(await models.Rol.count({ where: { codigo: "staff" } }), 0);
      const supervisor = await models.Rol.findOne({ where: { codigo: "supervisor" } });
      assert.equal(await models.UsuarioRol.count({ where: { usuario_id: viejo.usuario_id, rol_id: supervisor.id } }), 1);

      // Roles nuevos: código desde el nombre, sin duplicados ni nombres del sistema.
      const repositor = await permisosSrv.crearRol({ nombre: "  Repositor  de Góndola " });
      assert.deepEqual([repositor.codigo, repositor.descripcion], ["repositor_de_gondola", "Repositor de Góndola"]);
      await assert.rejects(permisosSrv.crearRol({ nombre: "repositor de gondola" }), /Ya existe/);
      await assert.rejects(permisosSrv.crearRol({ nombre: "Staff" }), /reservado/);
      await assert.rejects(permisosSrv.crearRol({ nombre: "ab" }), /entre 3 y 40/);
      await assert.rejects(permisosSrv.guardarPermisosDeRol(repositor.id, ["inventado.ver"]), /desconocidos/);
      const admin = await models.Rol.findOrCreate({ where: { codigo: "admin" }, defaults: { descripcion: "Administrador" } }).then(([r]) => r);
      await assert.rejects(permisosSrv.guardarPermisosDeRol(admin.id, []), /todos los permisos/);
      // Cobrar trae "ver pedidos": sin él no hay pantalla donde hacerlo.
      assert.deepEqual((await permisosSrv.guardarPermisosDeRol(repositor.id, ["cobros.gestionar"])).permisos.sort(), ["cobros.gestionar", "pedidos.ver"]);
      await permisosSrv.guardarPermisosDeRol(repositor.id, ["productos.editar"]);
      const grilla = await permisosSrv.listarRolesConPermisos();
      assert.equal(grilla.some((r) => r.codigo === "cliente"), false);
      assert.deepEqual(grilla.find((r) => r.codigo === "admin").editable, false);
      assert.ok((await listarRolesAsignables()).some((r) => r.codigo === "repositor_de_gondola"), "Personal ofrece los roles nuevos");
      assert.equal((await listarRolesAsignables()).some((r) => ["cliente", "super_admin"].includes(r.codigo)), false);
      await assert.rejects(permisosSrv.eliminarRol(vendedor.id), /del sistema/);

      // HTTP con los permisos leídos de la base: el repositor edita artículos pero no precios ni permisos.
      const express = (await import("express")).default;
      const { productoDistribuidoraRouter } = await import("../src/routes/distribuidora/producto_distribuidora_router.js");
      const { permisosRouter } = await import("../src/routes/usuarios/permisos_router.js");
      const app = express();
      app.use(express.json());
      app.use("/productos", productoDistribuidoraRouter);
      app.use("/permisos", permisosRouter);
      const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
      try {
        const url = `http://127.0.0.1:${server.address().port}`;
        const rafa = await registrarCliente({ nombre: "Rafa", apellido: "Repone", email: "rafa@example.test", password: "Clave1234" });
        await models.UsuarioRol.create({ usuario_id: rafa.usuario_id, rol_id: repositor.id });
        const headers = { Authorization: "Bearer " + (await login({ identificador: "rafa@example.test", password: "Clave1234" })).token, "Content-Type": "application/json" };
        const fideos = await models.ProductoDistribuidora.create({ categoria_id: category.id, nombre: "Fideos Permisos" });
        await models.VariedadDistribuidora.create({ producto_id: fideos.id, nombre: null, precio: 300 });
        const ficha = (cambios) => JSON.stringify({ categoria_id: category.id, nombre: "Fideos Permisos", precio: 300, precio_anterior: null, ...cambios });
        const conPrecioNuevo = await fetch(`${url}/productos/${fideos.id}`, { method: "PUT", headers, body: ficha({ precio: 350 }) });
        assert.equal(conPrecioNuevo.status, 403);
        assert.match((await conPrecioNuevo.json()).mensaje, /permiso para cambiar precios/);
        assert.equal(Number((await models.VariedadDistribuidora.findOne({ where: { producto_id: fideos.id } })).precio), 300, "nada se guardó");
        assert.equal((await fetch(`${url}/productos/${fideos.id}`, { method: "PUT", headers, body: ficha({ descripcion: "Moño 500 g" }) })).status, 200);
        assert.equal((await fetch(`${url}/productos`, { method: "POST", headers, body: JSON.stringify({ categoria_id: category.id, nombre: "Nuevo Sin Precio", precio: 0 }) })).status, 201);
        assert.equal((await fetch(`${url}/productos`, { method: "POST", headers, body: JSON.stringify({ categoria_id: category.id, nombre: "Nuevo Con Precio", precio: 10 }) })).status, 403);
        assert.equal((await fetch(`${url}/productos/ajustar-precios`, { method: "POST", headers, body: JSON.stringify({ porcentaje: 10, producto_id: fideos.id }) })).status, 403);
        assert.equal((await fetch(`${url}/permisos`, { headers })).status, 403);
        // Al darle el permiso desde el panel, rige en el pedido siguiente, sin volver a iniciar sesión.
        await permisosSrv.guardarPermisosDeRol(repositor.id, ["productos.editar", "precios.editar", "permisos.gestionar"]);
        assert.equal((await fetch(`${url}/productos/${fideos.id}`, { method: "PUT", headers, body: ficha({ precio: 350 }) })).status, 200);
        const panel = await fetch(`${url}/permisos`, { headers });
        assert.equal(panel.status, 200);
        assert.equal((await panel.json()).data.permisos.some((p) => "porDefecto" in p), false, "los roles por defecto son internos");
        await assert.rejects(permisosSrv.eliminarRol(repositor.id), /persona\(s\) con este rol/);
        await models.UsuarioRol.destroy({ where: { rol_id: repositor.id } });
        assert.equal((await fetch(`${url}/permisos/roles/${repositor.id}`, { method: "DELETE", headers })).status, 403, "sin rol, la sesión sigue pero sin permisos");
      } finally { await new Promise((resolve) => server.close(resolve)); }
      assert.ok(await permisosSrv.eliminarRol(repositor.id));
      assert.equal(await models.RolPermiso.count({ where: { rol_id: repositor.id } }), 0);
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
    await t.test("sin apellido (cuenta de Google) el pedido se frena hasta completar los datos", async () => {
      const persona = await models.Persona.findOne({ where: { email: "ana@example.test" } });
      await persona.update({ apellido: "" });
      assert.equal((await obtenerPerfil(id)).completo, false);
      await agregarItem(id, payload);
      await assert.rejects(crearNotaPedido(id, { key: randomUUID(), expectedItems: await obtenerCarrito(id) }), /Completá tus datos/);
      const completo = await guardarPerfil(id, { ...datosAna, apellido: "Google", celular: "+54 9 221 456-7890" });
      assert.equal(completo.completo, true);
      assert.equal(completo.apellido, "Google");
      assert.equal(completo.cuit, "20-12345678-9");
      const nota = await crearNotaPedido(id, { key: randomUUID(), expectedItems: await obtenerCarrito(id) });
      assert.ok(nota.id);
    });
    await t.test("índice de búsqueda se crea aunque pg_trgm esté instalada en otro schema", async () => {
      const { QueryTypes } = await import("sequelize");
      const extSchema = DB_SCHEMA + "_ext";
      assert.match(extSchema, /^codex_ux_test_[a-f0-9]{32}_ext$/);
      const [{ instalada }] = await sequelize.query("SELECT count(*)::int AS instalada FROM pg_extension WHERE extname = 'pg_trgm'", { type: QueryTypes.SELECT });
      // Si no estaba, se instala en un schema propio fuera del search_path (como "kinetica" o "extensions").
      if (!instalada) {
        await sequelize.query('CREATE SCHEMA "' + extSchema + '"');
        await sequelize.query('CREATE EXTENSION pg_trgm SCHEMA "' + extSchema + '"');
      }
      try {
        await crear_indice_busqueda_productos();
        await crear_indice_busqueda_productos(); // al reiniciar el servidor no falla
        const [{ indices }] = await sequelize.query("SELECT count(*)::int AS indices FROM pg_indexes WHERE schemaname = :schema AND indexname = 'producto_distribuidora_nombre_trgm_idx'", { replacements: { schema: DB_SCHEMA }, type: QueryTypes.SELECT });
        assert.equal(indices, 1);
      } finally {
        if (!instalada) await sequelize.query('DROP SCHEMA "' + extSchema + '" CASCADE');
      }
    });
    await t.test("panel: resumen por rol, ventas en hora de Argentina y presentaciones sin stock", async () => {
      // 14/03/2030 23:30 en Argentina = 15/03 02:30 UTC: "hoy" sigue siendo el 14.
      const ahora = new Date("2030-03-15T02:30:00Z");
      const antes = await obtenerResumenPanel(comoUsuario(["admin"]), { ahora });
      const base = { usuario_id: id, estado_pago: "pendiente", monto_pagado: 0, cuit: "20-12345678-9", direccion: "Prueba 123", provincia: "Buenos Aires", localidad: "La Plata", fecha_mod: ahora };
      await models.NotaPedido.bulkCreate([
        { ...base, estado: "pendiente", total: 100, fecha_alta: new Date("2030-03-14T12:00:00Z") },  // hoy
        { ...base, estado: "en_curso", total: 50, monto_pagado: 20, estado_pago: "parcial", fecha_alta: new Date("2030-03-15T01:00:00Z") }, // hoy (22 h en AR)
        { ...base, estado: "entregado", total: 30, monto_pagado: 30, estado_pago: "pagado", fecha_alta: new Date("2030-03-02T12:00:00Z") }, // este mes
        { ...base, estado: "pendiente", total: 7, fecha_alta: new Date("2030-03-01T02:00:00Z") },    // 28/02 en AR: mes anterior
        { ...base, estado: "cancelada", total: 999, fecha_alta: new Date("2030-03-14T13:00:00Z") },  // cancelado: no suma
      ]);
      const producto = await models.ProductoDistribuidora.create({ categoria_id: category.id, nombre: "Yerba" });
      await models.VariedadDistribuidora.bulkCreate([
        { producto_id: producto.id, nombre: "500 g", precio: 10, controla_stock: true, cantidad: 0 },
        { producto_id: producto.id, nombre: "1 kg", precio: 20, controla_stock: false, cantidad: 0 },
        { producto_id: producto.id, nombre: "Vieja", precio: 5, controla_stock: true, cantidad: 0, fecha_baja: "2030-01-01" },
      ]);

      const { pedidos, stock } = await obtenerResumenPanel(comoUsuario(["admin"]), { ahora });
      assert.deepEqual(pedidos.ventas, { hoy: { pedidos: 2, monto: 150 }, mes: { pedidos: 3, monto: 180 } });
      assert.equal(pedidos.por_estado.pendiente - antes.pedidos.por_estado.pendiente, 2);
      assert.equal(pedidos.por_estado.en_curso - antes.pedidos.por_estado.en_curso, 1);
      assert.equal(pedidos.por_estado.cancelada - antes.pedidos.por_estado.cancelada, 1);
      assert.equal(pedidos.por_cobrar.saldo - antes.pedidos.por_cobrar.saldo, 100 + 30 + 7);
      assert.equal(pedidos.ultimos.length, 5);
      assert.equal(pedidos.ultimos[0].fecha_alta.toISOString(), "2030-03-15T01:00:00.000Z");
      assert.equal(pedidos.ultimos[0].cliente, "Ana Google");
      assert.equal(stock.sin_stock - antes.stock.sin_stock, 1);
      assert.ok(stock.ejemplos_sin_stock.some((v) => v.producto === "Yerba" && v.presentacion === "500 g"));

      const vendedor = await obtenerResumenPanel(comoUsuario(["vendedor"], ["pedidos.ver", "pedidos.gestionar"]), { ahora });
      assert.ok(vendedor.pedidos);
      assert.equal(vendedor.stock, null);
      // Montos solo con "ventas.ver" (de entrada, solo admin): supervisor y vendedor ven cantidades, no dinero.
      const supervisor = comoUsuario(["supervisor"], ["pedidos.ver", "pedidos.gestionar", "cobros.gestionar", "productos.editar", "precios.editar"]);
      for (const usuario of [comoUsuario(["vendedor"], ["pedidos.ver"]), supervisor]) {
        const { pedidos: sinMontos } = await obtenerResumenPanel(usuario, { ahora });
        assert.equal(sinMontos.por_cobrar, null);
        assert.equal(sinMontos.ventas, null);
        assert.equal(sinMontos.por_estado.pendiente, pedidos.por_estado.pendiente);
      }
      assert.ok((await obtenerResumenPanel(supervisor, { ahora })).stock, "quien edita artículos ve el stock");
      const conVentas = await obtenerResumenPanel(comoUsuario(["cajero"], ["ventas.ver"]), { ahora });
      assert.deepEqual(conVentas.pedidos.ventas, pedidos.ventas, "ventas.ver se puede dar a otro rol");
      const superAdmin = await obtenerResumenPanel(comoUsuario(["super_admin"]), { ahora });
      assert.deepEqual(superAdmin.pedidos.ventas, pedidos.ventas);
      assert.ok(superAdmin.stock);
      assert.deepEqual(await obtenerResumenPanel(comoUsuario(["cliente"]), { ahora }), { pedidos: null, stock: null });
    });
    await t.test("artículos: ficha con bultos, filtros de gestión y fecha de cambio de precio", async () => {
      const familia = await models.CategoriaDistribuidora.create({ nombre: "Galletitas en gral", slug: "galletitas-en-gral" });
      const ficha = (cambios = {}) => validarVariedad({ precio: 1000, controla_stock: true, cantidad: 482, stock_minimo: 50, unidad_medida: "PAQUETE", unidad_bulto: "CAJA", unidades_por_bulto: 20, cod_ref: "000519", codigo_barras: "7790040001230", ...cambios }).datos;
      const nueve = await productos.crearProductoConVariedad({ categoria_id: familia.id, nombre: "9 de oro agridulce 200g", marca: "Cañuela" }, ficha());
      const v = nueve.variedades[0];
      assert.equal(v.unidades_por_bulto, 20);
      assert.equal(v.codigo_barras, "7790040001230");
      assert.ok(v.fecha_cambio_precio);

      // Mismo precio: la fecha no cambia; precio nuevo: sí.
      const fechaInicial = new Date(v.fecha_cambio_precio).getTime();
      await new Promise((r) => setTimeout(r, 20));
      const sinCambio = await productos.actualizarProductoConVariedad(nueve.id, { categoria_id: familia.id, nombre: nueve.nombre, marca: "Cañuela" }, ficha());
      assert.equal(new Date(sinCambio.variedades[0].fecha_cambio_precio).getTime(), fechaInicial);
      const conCambio = await productos.actualizarProductoConVariedad(nueve.id, { categoria_id: familia.id, nombre: nueve.nombre, marca: "Cañuela" }, ficha({ precio: 1100, cantidad: 30 }));
      assert.ok(new Date(conCambio.variedades[0].fecha_cambio_precio).getTime() > fechaInicial);

      const lavandina = await productos.crearProductoConVariedad({ categoria_id: familia.id, nombre: "Lavandina X5 12x1 lts", marca: "X5" }, ficha({ cod_ref: "002982", codigo_barras: null, cantidad: 0, unidad_medida: "BOTELLA", unidades_por_bulto: 12 }));
      await productos.cambiarEstadoProducto(lavandina.id, false);
      const buscar = async (filtros) => (await productos.listarProductos({ soloActivos: false, categoria: familia.id, ...filtros })).productos.map((p) => p.nombre).sort();
      assert.deepEqual(await buscar({ q: "7790040" }), [nueve.nombre]);                       // por código de barras
      assert.deepEqual(await buscar({ q: "002982" }), [lavandina.nombre]);                     // por código interno
      assert.deepEqual(await buscar({ stock: "bajo_minimo" }), [lavandina.nombre, nueve.nombre].sort()); // 30 <= 50 y 0
      assert.deepEqual(await buscar({ stock: "sin_stock" }), [lavandina.nombre]);
      assert.deepEqual(await buscar({ estado: "inactivos" }), [lavandina.nombre]);
      assert.deepEqual(await buscar({ marca: "cañuela" }), [nueve.nombre]);
      assert.deepEqual(await buscar({ q: "100%" }), []);                                       // el % no es comodín
      assert.ok((await marcasSrv.listarMarcas()).some((m) => m.nombre === "Cañuela"));
      // El catálogo público nunca muestra inactivos aunque pidan el filtro.
      assert.deepEqual((await productos.listarProductos({ categoria: familia.id, estado: "inactivos" })).productos.map((p) => p.nombre), [nueve.nombre]);

      const antes = await models.VariedadDistribuidora.findByPk(v.id);
      await new Promise((r) => setTimeout(r, 20));
      await productos.ajustarPreciosMasivo({ porcentaje: 10, producto_id: nueve.id });
      const despues = await models.VariedadDistribuidora.findByPk(v.id);
      assert.equal(Number(despues.precio), 1210);
      assert.ok(despues.fecha_cambio_precio > antes.fecha_cambio_precio);

      const { stock } = await obtenerResumenPanel(comoUsuario(["admin"]));
      assert.equal(stock.bajo_minimo, 1); // la lavandina está inactiva: el dashboard solo cuenta artículos activos
    });
    await t.test("lista de carga: suma varios pedidos por artículo, agrupa por familia y separa bultos", async () => {
      const familia = await models.CategoriaDistribuidora.create({ nombre: "Limpieza", slug: "limpieza" });
      const crear = (nombre, cod, porBulto) => productos.crearProductoConVariedad({ categoria_id: familia.id, nombre }, validarVariedad({ precio: 100, cod_ref: cod, unidad_medida: "BOTELLA", unidades_por_bulto: porBulto }).datos);
      const lav = await crear("Lavandina X5 1 lt", "002982", 12);
      const jabon = await crear("Jabón Lux x3", "002967", 1);
      const base = { usuario_id: id, estado_pago: "pendiente", monto_pagado: 0, total: 0, cuit: "20-12345678-9", direccion: "Prueba 123", provincia: "Buenos Aires", localidad: "La Plata", fecha_alta: new Date(), fecha_mod: new Date() };
      const [n1, n2, cancelado] = await models.NotaPedido.bulkCreate([{ ...base, estado: "en_curso" }, { ...base, estado: "pendiente" }, { ...base, estado: "cancelada" }]);
      const item = (nota, prod, cantidad) => ({ nota_pedido_id: nota.id, producto_id: prod.id, variedad_id: prod.variedades[0].id, nombre_producto: prod.nombre, precio_unitario: 100, cantidad, subtotal: 100 * cantidad });
      await models.NotaPedidoItem.bulkCreate([item(n1, lav, 20), item(n2, lav, 6), item(n1, jabon, 9), item(cancelado, lav, 500)]);

      const lista = await armarListaCarga([n1.id, n2.id, cancelado.id, 999999]);
      assert.deepEqual(lista.comprobantes, [n1.id, n2.id]);
      const limpieza = lista.familias.find((f) => f.nombre === "Limpieza");
      const fila = (codigo) => limpieza.articulos.find((a) => a.codigo === codigo);
      assert.deepEqual([fila("002982").cantidad, fila("002982").bultos, fila("002982").sueltos], [26, 2, 2]);
      assert.deepEqual([fila("002967").cantidad, fila("002967").bultos, fila("002967").sueltos], [9, 0, 9]);
      assert.equal(lista.totales.unidades, 35);
    });
    await t.test("familias y categorías: dos niveles, mover en lote y fusionar sin perder artículos", async () => {
      const C = models.CategoriaDistribuidora;
      const crear = (nombre, padre_id = null) => categoriasSrv.crearCategoria({ nombre, slug: "t-" + nombre.toLowerCase().replace(/W+/g, "-") + "-" + (padre_id ?? 0), padre_id });
      const comestibles = await crear("Comestibles QA");
      const almacen = await crear("Almacen QA");
      const galletitas = await crear("Galletitas QA", almacen.id);
      const galletitasCom = await crear("Galletitas QA", comestibles.id);
      const arroz = await crear("Arroz QA", comestibles.id);
      const fideos = await crear("Fideos QA", comestibles.id);
      const articulo = (categoria_id, nombre) => models.ProductoDistribuidora.create({ categoria_id, nombre });
      await Promise.all([articulo(galletitas.id, "Pepitos QA"), articulo(galletitasCom.id, "Oreo QA"), articulo(arroz.id, "Gallo QA"), articulo(comestibles.id, "Suelto QA")]);

      // Nunca un tercer nivel, ni una familia con categorías convertida en categoría.
      await assert.rejects(crear("Dulces QA", galletitas.id), { codigo: "CATEGORIA_INVALIDA" });
      await assert.rejects(categoriasSrv.actualizarCategoria(almacen.id, { nombre: almacen.nombre, slug: almacen.slug, padre_id: comestibles.id }), { codigo: "CATEGORIA_INVALIDA" });

      // Mover en lote: rechaza nombres repetidos en el destino y destinos que no son familia.
      await assert.rejects(categoriasSrv.moverCategorias([galletitasCom.id, arroz.id], almacen.id), /Galletitas QA/);
      await assert.rejects(categoriasSrv.moverCategorias([fideos.id], galletitas.id), { codigo: "CATEGORIA_INVALIDA" });
      assert.deepEqual(await categoriasSrv.moverCategorias([fideos.id], almacen.id), { ok: true, movidas: 1 });
      assert.equal((await C.findByPk(fideos.id)).padre_id, almacen.id);

      // Familia en familia: las de igual nombre se unen, el resto se muestra en el destino, y ningún artículo se pierde.
      await assert.rejects(categoriasSrv.fusionarCategoria(comestibles.id, galletitas.id), { codigo: "CATEGORIA_INVALIDA" });
      const r = await categoriasSrv.fusionarCategoria(comestibles.id, almacen.id);
      assert.deepEqual(r, { ok: true, productos_movidos: 2, categorias_movidas: 1, categorias_fusionadas: 1 });
      assert.equal(await C.findByPk(comestibles.id), null);
      assert.equal(await C.findByPk(galletitasCom.id), null);
      assert.equal((await C.findByPk(arroz.id)).padre_id, almacen.id);
      const enGalletitas = await models.ProductoDistribuidora.findAll({ where: { categoria_id: galletitas.id }, order: [["nombre", "ASC"]] });
      assert.deepEqual(enGalletitas.map((p) => p.nombre), ["Oreo QA", "Pepitos QA"]);
      assert.equal(await models.ProductoDistribuidora.count({ where: { categoria_id: almacen.id, nombre: "Suelto QA" } }), 1);

      // Categoría en categoría: pasan sus artículos y se borra.
      assert.equal((await categoriasSrv.fusionarCategoria(arroz.id, galletitas.id)).productos_movidos, 1);
      assert.equal(await models.ProductoDistribuidora.count({ where: { categoria_id: galletitas.id } }), 3);
    });
    await t.test("marcas: datos viejos migran a la tabla, se ofrecen por familia o categoría y se unifican", async () => {
      const C = models.CategoriaDistribuidora;
      const fam = await C.create({ nombre: "Marcas QA", slug: "marcas-qa" });
      const galle = await C.create({ nombre: "Galle QA", slug: "marcas-qa-galle", padre_id: fam.id });
      const fideos = await C.create({ nombre: "Fideos QA", slug: "marcas-qa-fideos", padre_id: fam.id });
      const otraFam = await C.create({ nombre: "Otra Fam QA", slug: "marcas-qa-otra" });

      // Artículos con marca solo en texto (antes de la tabla): el bootstrap los migra uniendo repetidas.
      const crear = (nombre, marca, categoria_id = galle.id, extra = {}) => models.ProductoDistribuidora.create({ categoria_id, nombre, marca, ...extra });
      await crear("A QA", "BAGLEY QA");
      await crear("B QA", "Bagley Qa");
      await crear("C QA", "bagley  qa", galle.id, { activo: false });
      await crear("D QA", "Lucchetti Qa", fideos.id);
      const migracion = await marcasSrv.sincronizarMarcasLegado();
      assert.equal(migracion.articulos >= 4, true);
      assert.deepEqual(await marcasSrv.sincronizarMarcasLegado(), { marcas: 0, articulos: 0 }); // idempotente
      const resumen = (await marcasSrv.resumenMarcas({ q: "qa", por_pagina: 100 })).marcas.filter((m) => m.nombre.endsWith("Qa"));
      const bagley = resumen.find((m) => m.nombre === "Bagley Qa");
      assert.deepEqual([bagley.articulos, bagley.activos, bagley.categorias.map((c) => c.ruta)], [3, 2, ["Marcas QA › Galle QA"]]);
      assert.equal(resumen.filter((m) => m.nombre.toLowerCase().startsWith("bagley")).length, 1);
      assert.equal((await models.ProductoDistribuidora.findOne({ where: { nombre: "C QA" } })).marca, "Bagley Qa");
      // Pantalla Marcas paginada: filtro por familia, estado y orden por cantidad de artículos.
      const pagina = await marcasSrv.resumenMarcas({ categoria: fam.id, orden: "articulos", por_pagina: 1 });
      assert.deepEqual([pagina.marcas[0].nombre, pagina.pagination.total, pagina.pagination.totalPages], ["Bagley Qa", 2, 2]);
      assert.deepEqual((await marcasSrv.resumenMarcas({ q: "lucche", estado: "sin_articulos" })).marcas, []);
      assert.ok(pagina.totales.marcas >= 2);

      // La ficha ve las marcas de su categoría y de su familia, no las de una categoría hermana.
      const nombres = async (categoria) => (await marcasSrv.listarMarcas({ categoria })).map((m) => m.nombre).filter((n) => n.endsWith("Qa"));
      assert.deepEqual(await nombres(galle.id), ["Bagley Qa"]);
      assert.deepEqual(await nombres(fideos.id), ["Lucchetti Qa"]);
      assert.deepEqual(await nombres(fam.id), ["Bagley Qa", "Lucchetti Qa"]); // la familia ve las de sus categorías
      const arcor = await marcasSrv.crearMarca({ nombre: "arcor qa", categorias: [fam.id] });
      assert.equal(arcor.nombre, "Arcor Qa");
      assert.deepEqual(await nombres(fideos.id), ["Arcor Qa", "Lucchetti Qa"]); // asociada a la familia entera
      await assert.rejects(marcasSrv.crearMarca({ nombre: "ARCOR-QA", categorias: [fam.id] }), { codigo: "MARCA_EXISTE" });
      await assert.rejects(marcasSrv.crearMarca({ nombre: "Sin lugar Qa", categorias: [] }), { codigo: "MARCA_INVALIDA" });

      // No se puede quitar una categoría donde la marca tiene artículos; renombrar actualiza la copia de texto.
      await assert.rejects(marcasSrv.actualizarMarca(bagley.id, { nombre: "Bagley Qa", categorias: [otraFam.id] }), /Galle QA/);
      await marcasSrv.actualizarMarca(bagley.id, { nombre: "Bagley SA Qa", categorias: [galle.id, otraFam.id] });
      assert.equal((await models.ProductoDistribuidora.findOne({ where: { nombre: "A QA" } })).marca, "Bagley SA Qa");

      // Guardar un artículo con marca_id en otra categoría la asocia ahí; unificar pasa artículos y lugares.
      const conId = await productos.crearProducto({ categoria_id: fideos.id, nombre: "E QA", marca_id: bagley.id });
      assert.equal(conId.marca, "Bagley SA Qa");
      assert.ok((await nombres(fideos.id)).includes("Bagley SA Qa"));
      const lucchetti = resumen.find((m) => m.nombre === "Lucchetti Qa");
      const r = await marcasSrv.unificarMarcas([lucchetti.id], bagley.id);
      assert.deepEqual([r.ok, r.articulos], [true, 1]);
      assert.equal(await models.MarcaDistribuidora.findByPk(lucchetti.id), null);
      assert.equal((await models.ProductoDistribuidora.findOne({ where: { nombre: "D QA" } })).marca_id, bagley.id);
      await assert.rejects(marcasSrv.eliminarMarca(bagley.id), { codigo: "MARCA_INVALIDA" }); // tiene artículos
      assert.deepEqual(await marcasSrv.eliminarMarca(arcor.id), { ok: true });

      // Fusionar categorías arrastra dónde se ofrece cada marca.
      await categoriasSrv.fusionarCategoria(otraFam.id, fam.id);
      const asociadas = await models.MarcaCategoriaDistribuidora.findAll({ where: { marca_id: bagley.id }, raw: true });
      assert.ok(asociadas.some((a) => a.categoria_id === fam.id));
    });
    await t.test("listas de precios: la localidad del cliente define el precio del carrito y del pedido; ofertas por lista", async () => {
      const cat = await models.CategoriaDistribuidora.create({ nombre: "Listas QA", slug: "listas-qa" });
      const yerba = await models.ProductoDistribuidora.create({ categoria_id: cat.id, nombre: "Yerba Lista QA" });
      const vYerba = await models.VariedadDistribuidora.create({ producto_id: yerba.id, nombre: "1 kg", precio: 1000, cod_ref: "LQA-1" });
      const azucar = await models.ProductoDistribuidora.create({ categoria_id: cat.id, nombre: "Azucar Lista QA" });
      const vAzucar = await models.VariedadDistribuidora.create({ producto_id: azucar.id, nombre: "1 kg", precio: 500, precio_anterior: 600, cod_ref: "LQA-2" });

      // Sin lista: General, y el azúcar está en oferta (600 → 500).
      assert.ok((await listasSrv.idsProductosEnOferta(null)).includes(azucar.id));
      // Ana (perfil en La Plata, Buenos Aires) entra en esta lista; la localidad no puede repetirse en otra.
      const lista = await listasSrv.guardarLista(null, { nombre: "La Plata QA", localidades: [{ provincia: "Buenos Aires", departamento: null, localidad: "La Plata" }] });
      await assert.rejects(listasSrv.guardarLista(null, { nombre: "Otra QA", localidades: [{ provincia: "buenos aires", localidad: "LA PLATA" }] }), /ya está en "La Plata QA"/);
      assert.deepEqual(await listasSrv.listaDeUsuario(id), { id: lista.id, nombre: "La Plata QA" });

      await listasSrv.guardarPreciosDeLista(lista.id, [{ variedad_id: vYerba.id, precio: 1200, precio_anterior: 1500 }, { variedad_id: vAzucar.id, precio: 550 }]);
      const enOferta = await listasSrv.idsProductosEnOferta(lista.id);
      assert.ok(enOferta.includes(yerba.id));     // oferta propia de la lista
      assert.ok(!enOferta.includes(azucar.id));   // precio especial sin "anterior": en esta zona no es oferta
      const [conLista] = await listasSrv.aplicarListaAProductos([await productos.obtenerProductoPorId(yerba.id)], lista);
      assert.deepEqual([conLista.variedades[0].precio, conLista.variedades[0].precio_anterior], [1200, 1500]);

      // Carrito y pedido usan el precio de la lista y el pedido guarda cuál fue.
      await vaciarCarrito(id);
      const carrito = await agregarItem(id, { producto_id: yerba.id, variedad_id: vYerba.id, cantidad: 2 });
      const linea = carrito.find((it) => it.variedad_id === vYerba.id);
      assert.deepEqual([linea.precio, linea.precio_referencia, linea.descuento], [1200, 1500, "oferta"]); // oferta de la lista: se tacha el anterior
      // Precio de zona sin "anterior" pero más barato que la General: se tacha la General.
      await listasSrv.guardarPreciosDeLista(lista.id, [{ variedad_id: vAzucar.id, precio: 450 }]);
      const conZona = await agregarItem(id, { producto_id: azucar.id, variedad_id: vAzucar.id, cantidad: 1 });
      const lineaZona = conZona.find((it) => it.variedad_id === vAzucar.id);
      assert.deepEqual([lineaZona.precio, lineaZona.precio_referencia, lineaZona.descuento], [450, 500, "zona"]);
      await actualizarCantidad(id, lineaZona.item_id, 1);
      await vaciarCarrito(id);
      await agregarItem(id, { producto_id: yerba.id, variedad_id: vYerba.id, cantidad: 2 });
      const nota = await crearNotaPedido(id, { key: randomUUID(), expectedItems: await obtenerCarrito(id) });
      assert.deepEqual([Number(nota.total), nota.lista_precio_nombre], [2400, "La Plata QA"]);

      // Lista pausada: vuelve la General. Importar con un código inexistente no guarda nada.
      await listasSrv.guardarLista(lista.id, { nombre: "La Plata QA", activo: false, localidades: [{ provincia: "Buenos Aires", localidad: "La Plata" }] });
      assert.equal(await listasSrv.listaDeUsuario(id), null);
      await assert.rejects(listasSrv.importarPreciosDeLista(lista.id, [{ cod_ref: "LQA-1", precio: 1 }, { cod_ref: "NO-EXISTE", precio: 2 }]), /NO-EXISTE/);
      assert.equal((await listasSrv.listarPreciosDeLista(lista.id, { solo_especiales: true })).filas.find((f) => f.variedad_id === vYerba.id).precio, 1200);
    });
    await t.test("arranque: borra las tablas de gym y kinesiología y sus módulos, sin tocar la distribuidora", async () => {
      const { QueryTypes } = await import("sequelize");
      for (const tabla of ["alumno", "ejercicio", "patologia"]) await sequelize.query('CREATE TABLE "' + DB_SCHEMA + '"."' + tabla + '" (id serial PRIMARY KEY)');
      await models.ModuloNegocio.bulkCreate([{ codigo: "gym", descripcion: "Gym", habilitado: true }, { codigo: "kinesiologia", descripcion: "Kinesiología", habilitado: true }]);
      await aplicar_ajustes_puntuales();
      await aplicar_ajustes_puntuales(); // corre en cada arranque: la segunda vez no falla
      const tablas = (await sequelize.query("SELECT table_name::text AS nombre FROM information_schema.tables WHERE table_schema = :schema", { replacements: { schema: DB_SCHEMA }, type: QueryTypes.SELECT })).map((x) => x.nombre);
      for (const tabla of TABLAS_RETIRADAS) assert.equal(tablas.includes(tabla), false, tabla);
      for (const tabla of ["nota_pedido", "producto_distribuidora", "persona"]) assert.ok(tablas.includes(tabla), tabla + " no está: " + tablas.join(", "));
      assert.deepEqual((await models.ModuloNegocio.findAll()).map((m) => m.codigo), ["eccomerce_distribuidora"]);
    });
    await t.test("precios de demostración: precio a los cargados sin precio, activa y repone stock, sin repetir", async () => {
      const { aplicarPreciosDemo } = await import("../src/database/seed/precios_demo_distribuidora.js");
      const familia = await models.CategoriaDistribuidora.create({ nombre: "Demo", slug: "demo" });
      const categoria = await models.CategoriaDistribuidora.create({ nombre: "Demo Hija", slug: "demo-hija", padre_id: familia.id });
      const [sinPrecio1, sinPrecio2, conPrecio, deBaja, sinStock] = await models.ProductoDistribuidora.bulkCreate([
        { categoria_id: categoria.id, nombre: "Demo Uno", activo: false },
        { categoria_id: categoria.id, nombre: "Demo Dos", activo: false },
        { categoria_id: categoria.id, nombre: "Demo Con Precio", activo: false },
        { categoria_id: categoria.id, nombre: "Demo De Baja", activo: false, fecha_baja: "2026-01-01" },
        { categoria_id: categoria.id, nombre: "Demo Sin Stock", activo: true },
      ]);
      await models.VariedadDistribuidora.create({ producto_id: conPrecio.id, precio: 1234, controla_stock: false, cantidad: 0 });
      const agotada = await models.VariedadDistribuidora.create({ producto_id: sinStock.id, precio: 500, controla_stock: true, cantidad: 0 });

      await assert.rejects(aplicarPreciosDemo({ modelos: models, esquema: "gc_dist" }), /producción/);
      const primera = await aplicarPreciosDemo({ modelos: models, esquema: DB_SCHEMA });
      assert.ok(primera.productos >= 2);
      for (const producto of [sinPrecio1, sinPrecio2]) {
        const variedades = await models.VariedadDistribuidora.findAll({ where: { producto_id: producto.id } });
        assert.equal(variedades.length, 1);
        assert.ok(Number(variedades[0].precio) >= 800 && Number(variedades[0].precio) <= 9000);
        assert.equal(variedades[0].controla_stock, false);
        assert.equal((await models.ProductoDistribuidora.findByPk(producto.id)).activo, true);
      }
      // El que ya tenía precio se activa sin cambiar el precio; el dado de baja no se toca.
      assert.deepEqual((await models.VariedadDistribuidora.findAll({ where: { producto_id: conPrecio.id } })).map((v) => Number(v.precio)), [1234]);
      assert.equal((await models.ProductoDistribuidora.findByPk(conPrecio.id)).activo, true);
      assert.ok(primera.activados >= 1);
      assert.equal(await models.VariedadDistribuidora.count({ where: { producto_id: deBaja.id } }), 0);
      assert.equal((await models.ProductoDistribuidora.findByPk(deBaja.id)).activo, false);
      // La presentación agotada recibe stock entre 20 y 200, sin cambiar su precio.
      const repuesta = await models.VariedadDistribuidora.findByPk(agotada.id);
      assert.ok(repuesta.cantidad >= 20 && repuesta.cantidad <= 200);
      assert.equal(Number(repuesta.precio), 500);
      assert.deepEqual(await aplicarPreciosDemo({ modelos: models, esquema: DB_SCHEMA }), { productos: 0, ofertas: 0, activados: 0, con_stock: 0 });
    });
    await t.test("arranque con catálogo de demostración: carga el seed con precios, repetible y nunca en producción", async () => {
      const { seed_catalogo_demo } = await import("../src/database/seed/catalogo_demo.js");
      const { PRODUCTOS_INICIALES } = await import("../src/database/seed/seed_productos_distribuidora.js");
      assert.equal(await seed_catalogo_demo({ esquema: "gc_dist" }), null);
      const primera = await seed_catalogo_demo();
      assert.ok(primera.productos >= Object.values(PRODUCTOS_INICIALES).flat().length);
      const { QueryTypes } = await import("sequelize");
      const [{ sin_precio, ocultos }] = await sequelize.query(`SELECT
        count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM variedad_distribuidora v WHERE v.producto_id = p.id AND v.fecha_baja IS NULL))::int AS sin_precio,
        count(*) FILTER (WHERE NOT p.activo)::int AS ocultos
        FROM producto_distribuidora p WHERE p.fecha_baja IS NULL`, { type: QueryTypes.SELECT });
      assert.deepEqual({ sin_precio, ocultos }, { sin_precio: 0, ocultos: 0 });
      assert.deepEqual(await seed_catalogo_demo(), { productos: 0, ofertas: 0, activados: 0, con_stock: 0 });
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
