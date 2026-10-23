import test from "node:test";
import assert from "node:assert/strict";
import { createResetToken, verifyResetToken, passwordVersion } from "../src/services/common/auth_tokens.js";
import { validQuantity, validateSnapshot } from "../src/services/common/cart_rules.js";
import { orderConfig, receiptProblem, transitionProblem } from "../../order_config.js";
import { CODIGOS_PERMISO, dependientesDe, permisosConfig, permisosEfectivos, tienePermiso } from "../../permisos_config.js";
import { cumpleAcceso } from "../../frontend/src/controls/acceso/acceso.js";
import { cuitValido, dniValido, fiscalConfig, normalizarDocumento, problemaFiscal, tipoFacturaSugerida } from "../../fiscal_config.js";
import { env } from "../src/configuracion_servidor/env.js";
import { enviarEmail, mailConfigured } from "../src/services/common/mail_service.js";
import {
  escapar, mailCambioEstadoCliente, mailCancelacionClienteEquipo, mailComprobanteNuevoEquipo, mailComprobanteRechazadoCliente,
  mailPedidoNuevoEquipo, mailPedidoRecibidoCliente,
} from "../src/services/distribuidora/avisos_pedido_plantillas.js";
import { detectarFormatoComprobante } from "../src/services/common/comprobante_rules.js";
import { safeReturnTo } from "../../frontend/src/controls/acceso/return_to.js";
import { readGuestCart, mergeGuestItems } from "../../frontend/src/controls/carrito/guest_storage.js";
import { filtrarNavbarPorRol } from "../../frontend/src/controls/layout/navbar/navbar_permissions.js";
import { clasificarIdentificador, esNombreUsuarioValido } from "../src/services/common/nombre_usuario.js";
import { celularValido, datosClienteCompletos, validarDatosCliente } from "../src/services/common/datos_cliente.js";
import { normalizeRows } from "../src/services/distribuidora/importacion/normalize.js";
import { formatearNombre } from "../src/services/common/formato_nombre.js";
import { indexarCategorias, construirOpcionesCategoria } from "../../frontend/src/modules/eccomerce_distribuidora/utils/categoria_jerarquia.js";

test("primer pedido exige nombre, apellido, celular, datos fiscales y de entrega", () => {
  const completos = { nombre: "Gise", apellido: "Google", celular: "11 2345-6789", condicion_iva: "responsable_inscripto", cuit: "20-12345678-6", direccion: "Calle 1", provincia: "Buenos Aires", localidad: "La Plata" };
  assert.equal(datosClienteCompletos(completos), true);
  assert.equal(datosClienteCompletos({ ...completos, apellido: "" }), false, "cuenta de Google sin apellido");
  assert.equal(datosClienteCompletos({ ...completos, celular: null }), false);
  for (const bueno of ["11 2345-6789", "+54 9 11 2345-6789", "(0221) 456-7890"]) assert.equal(celularValido(bueno), true, bueno);
  for (const malo of ["1234567", "11-2345-abcd", "", "1".repeat(16)]) assert.equal(celularValido(malo), false, malo);

  const { datos } = validarDatosCliente({ ...completos, nombre: "  Gise ", razon_social: "  ", extra: "ignorado" });
  assert.equal(datos.nombre, "Gise");
  assert.equal(datos.razon_social, null);
  assert.equal("extra" in datos, false);
  assert.match(validarDatosCliente({ ...completos, apellido: " " }).error, /nombre y apellido/);
  assert.match(validarDatosCliente({ ...completos, celular: "123" }).error, /celular/);
  assert.match(validarDatosCliente({ ...completos, cuit: "" }).error, /CUIT/);
  // Un cliente de antes, sin condición de IVA o con un CUIT mal cargado, tiene que completarlo al pedir.
  assert.equal(datosClienteCompletos({ ...completos, condicion_iva: null }), false);
  assert.equal(datosClienteCompletos({ ...completos, cuit: "20-12345678-9" }), false, "dígito verificador incorrecto");
  assert.match(validarDatosCliente({ ...completos, condicion_iva: "inventada" }).error, /condición frente al IVA/);
  assert.equal(validarDatosCliente({ ...completos, cuit: "20 12345678 6" }).datos.cuit, "20-12345678-6", "se guarda con guiones");
  assert.equal(validarDatosCliente({ ...completos, condicion_iva: "consumidor_final", cuit: "30.123.456" }).datos.cuit, "30123456", "consumidor final con DNI");
  assert.match(validarDatosCliente({ ...completos, condicion_iva: "monotributista", cuit: "30123456" }).error, /CUIT válido/);
});

test("fiscal: CUIT con dígito verificador, DNI y factura que corresponde según emisor y cliente", () => {
  for (const bueno of ["20-12345678-6", "20123456786", "30-71234567-1"]) assert.equal(cuitValido(bueno), true, bueno);
  for (const malo of ["20-12345678-9", "99-12345678-6", "2012345678", "", null, "20-1234567a-6"]) assert.equal(cuitValido(malo), false, String(malo));
  assert.equal(dniValido("12.345.678"), true);
  for (const malo of ["123456", "123456789", "0000000"]) assert.equal(dniValido(malo), false, malo);
  assert.equal(normalizarDocumento(" 20 12345678 6 "), "20-12345678-6");
  assert.equal(normalizarDocumento("12.345.678"), "12345678");
  assert.equal(problemaFiscal({ condicion_iva: "exento", cuit: "30-71234567-1" }), null);
  assert.match(problemaFiscal({ cuit: "30-71234567-1" }), /condición/);
  // Responsable inscripto: A a inscriptos y monotributistas, B al resto. Monotributo o exento: siempre C.
  assert.deepEqual(["responsable_inscripto", "monotributista", "exento", "consumidor_final"].map((c) => tipoFacturaSugerida(c, "responsable_inscripto")), ["A", "A", "B", "B"]);
  assert.deepEqual(["responsable_inscripto", "consumidor_final"].map((c) => tipoFacturaSugerida(c, "monotributista")), ["C", "C"]);
  assert.equal(tipoFacturaSugerida("consumidor_final", null), null, "sin la condición de la distribuidora no se sugiere");
  assert.equal(tipoFacturaSugerida(null, "responsable_inscripto"), null);
  assert.equal(fiscalConfig.emisor.condicion_iva, null, "se completa con el dato real del cliente, no se inventa");
});

test("login distingue email de nombre de usuario y valida el usuario sin consultar la base", () => {
  assert.deepEqual(clasificarIdentificador("  Ana@Example.TEST "), { tipo: "email", valor: "ana@example.test" });
  assert.deepEqual(clasificarIdentificador("Juan.Perez_1"), { tipo: "usuario", valor: "juan.perez_1", valido: true });
  for (const malo of ["ab", "a".repeat(31), "con espacio", "ñandú", "", null]) assert.equal(esNombreUsuarioValido(malo), false, String(malo));
  for (const bueno of ["abc", "juan-p", "a".repeat(30)]) assert.equal(esNombreUsuarioValido(bueno), true, bueno);
});
test("redirecciones internas conservan filtros y rechazan otros orígenes y login", () => {
  assert.equal(safeReturnTo("/distribuidora/catalogo?q=arroz"), "/distribuidora/catalogo?q=arroz");
  for (const path of ["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/register?returnTo=x"]) assert.equal(safeReturnTo(path), "/");
});
test("recuperación vence y deja de servir después del cambio de contraseña", () => {
  const user = { id: 7, contrasena: "old-hash" };
  const token = createResetToken(user, "test-secret", 20);
  assert.equal(verifyResetToken(token, user, "test-secret").sub, "7");
  assert.throws(() => verifyResetToken(token, { ...user, contrasena: "new-hash" }, "test-secret"));
  assert.throws(() => verifyResetToken(createResetToken(user, "test-secret", -1), user, "test-secret"));
  assert.notEqual(passwordVersion("old-hash"), passwordVersion("new-hash"));
});
test("stock, enteros y snapshot protegen el envío ante datos obsoletos", () => {
  for (const q of [0, -1, 1.5, "2", Infinity, 10000]) assert.throws(() => validQuantity(q));
  assert.throws(() => validQuantity(3, 2));
  assert.equal(validQuantity(120), 120);
  const items = [{ item_id: 1, cantidad: 2, precio: 500 }];
  assert.doesNotThrow(() => validateSnapshot(items, items));
  assert.throws(() => validateSnapshot(items, [{ ...items[0], precio: 400 }]), /precio|cantidad/);
  assert.throws(() => validateSnapshot(items, []));
});
test("pedido: se confirma antes de preparar, retroceder pide motivo y el comprador solo cancela lo recibido", () => {
  assert.match(transitionProblem("pendiente", "en_curso", null, "pendiente"), /permitido/);
  assert.equal(transitionProblem("pendiente", "confirmado", null, "pendiente"), null);
  assert.equal(transitionProblem("confirmado", "en_curso", null, "pendiente"), null);
  for (const [desde, hacia] of [["confirmado", "pendiente"], ["en_curso", "confirmado"], ["confirmado", "cancelada"]]) {
    assert.match(transitionProblem(desde, hacia, "", "pendiente"), /motivo/, `${desde} → ${hacia}`);
    assert.equal(transitionProblem(desde, hacia, "Falta stock", "pendiente"), null);
  }
  // Todo estado alcanzable descuenta stock salvo los dos que no lo tienen comprometido.
  assert.deepEqual(Object.keys(orderConfig.states).filter((e) => !orderConfig.stockStates.includes(e)), ["pendiente", "cancelada"]);
  assert.deepEqual(orderConfig.buyerCancelableStates, ["pendiente"]);
});
test("mails de pedidos: detalle, enlaces y texto del cliente escapado", () => {
  const nota = { id: 42, total: 2400, fecha_alta: "2026-10-22T15:00:00Z", direccion: "Av. Siempre Viva 742", localidad: "La Plata", provincia: "Buenos Aires",
    notas: "<script>alert(1)</script>", items: [{ cantidad: 2, nombre_producto: "Arroz", variedad_nombre: "1 kg", subtotal: 2400 }] };
  const cliente = { nombre: "Ana <b>", apellido: "Prueba", email: "ana@example.test", celular: "11 2345-6789" };
  const equipo = mailPedidoNuevoEquipo(nota, cliente);
  assert.match(equipo.subject, /^Nuevo pedido #42 de Ana <b> Prueba: \$\s?2\.400,00$/);
  assert.match(equipo.html, /2 × Arroz \(1 kg\)/);
  assert.match(equipo.html, /notas-pedido\?q=%2342/);
  assert.match(equipo.html, /22\/10\/26,? 12:00/, "la hora va en Argentina");
  assert.equal(equipo.html.includes("<script>"), false);
  assert.equal(equipo.html.includes("Ana <b>"), false);
  assert.match(equipo.html, /&lt;script&gt;/);
  assert.match(equipo.text, /Total: \$\s?2\.400,00/);
  assert.match(mailPedidoRecibidoCliente(nota, cliente).text, /mis-pedidos/);
  const cancelado = mailCambioEstadoCliente(nota, cliente, { nuevo: "cancelada", motivo: "Sin stock <i>" });
  assert.equal(cancelado.subject, "Tu pedido #42: Cancelado");
  assert.match(cancelado.html, /Motivo: Sin stock &lt;i&gt;/);
  // Los motivos de retroceso son internos: el cliente no los ve.
  assert.equal(mailCambioEstadoCliente(nota, cliente, { nuevo: "pendiente", motivo: "Revisar precios" }).text.includes("Revisar precios"), false);
  assert.match(mailCambioEstadoCliente(nota, cliente, { nuevo: "confirmado" }).text, /está confirmado/);
  assert.match(mailCancelacionClienteEquipo(nota, cliente, "Me equivoqué").text, /canceló el pedido #42.*Motivo: Me equivoqué/);
  assert.equal(escapar(`"'&`), "&quot;&#39;&amp;");
});
test("comprobantes: se reconocen por contenido y no se adjuntan a pedidos cancelados, cobrados o llenos", () => {
  const relleno = Buffer.alloc(16);
  assert.equal(detectarFormatoComprobante(Buffer.concat([Buffer.from("%PDF-1.4"), relleno])), "pdf");
  assert.equal(detectarFormatoComprobante(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), relleno])), "jpg");
  assert.equal(detectarFormatoComprobante(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), relleno])), "png");
  assert.equal(detectarFormatoComprobante(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), relleno])), "webp");
  for (const malo of [Buffer.from("MZ ejecutable con nombre .pdf"), Buffer.from("GIF89a" + "x".repeat(10)), Buffer.from("%PDF"), null, "texto"])
    assert.equal(detectarFormatoComprobante(malo), null, String(malo).slice(0, 10));
  const nota = { estado: "pendiente", estado_pago: "pendiente" };
  assert.equal(receiptProblem(nota, 0), null);
  assert.match(receiptProblem({ ...nota, estado: "cancelada" }, 0), /cancelado/);
  assert.match(receiptProblem({ ...nota, estado_pago: "pagado" }, 0), /cobrado/);
  assert.equal(receiptProblem({ ...nota, estado_pago: "parcial" }, 4), null, "con saldo pendiente se puede pagar en partes");
  assert.match(receiptProblem(nota, orderConfig.receipts.maxPerOrder), /máximo de 5/);
  const cliente = { nombre: "Ana", apellido: "<Prueba>" };
  const rechazo = mailComprobanteRechazadoCliente({ id: 7, total: 100 }, cliente, "Importe <distinto>");
  assert.match(rechazo.html, /Motivo: Importe &lt;distinto&gt;/);
  assert.match(rechazo.text, /mis-pedidos/);
  assert.equal(mailComprobanteNuevoEquipo({ id: 7, total: 100 }, cliente).subject, "Comprobante para revisar: pedido #7");
});
test("correo: con clave de Brevo envía por su API HTTPS y explica sus errores", async () => {
  const previo = { ...env };
  const fetchOriginal = globalThis.fetch;
  const llamadas = [];
  let estado = 201;
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return new Response(estado === 201 ? JSON.stringify({ messageId: "x" }) : "{\"message\":\"Sender not verified\"}", { status: estado });
  };
  try {
    Object.assign(env, { CLAVE_API_BREVO: "clave-falsa", CORREO_REMITENTE: "", NOMBRE_REMITENTE: "Distribuidora EJEMPLO", SMTP_USER: "", SMTP_PASS: "" });
    assert.equal(mailConfigured(), true);
    await assert.rejects(enviarEmail({ to: "a@example.test", subject: "Hola", text: "x" }), /CORREO_REMITENTE/);
    env.CORREO_REMITENTE = "pedidos@example.test";
    await enviarEmail({ to: ["a@example.test", "b@example.test"], subject: "Hola", html: "<p>x</p>", text: "x" });
    assert.equal(llamadas[0].url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(llamadas[0].opciones.headers["api-key"], "clave-falsa");
    assert.deepEqual(JSON.parse(llamadas[0].opciones.body), {
      sender: { email: "pedidos@example.test", name: "Distribuidora EJEMPLO" },
      to: [{ email: "a@example.test" }, { email: "b@example.test" }], subject: "Hola", htmlContent: "<p>x</p>", textContent: "x",
    });
    estado = 400;
    await assert.rejects(enviarEmail({ to: "a@example.test", subject: "Hola", text: "x" }), /Brevo respondió 400.*Sender not verified/);
    env.CLAVE_API_BREVO = "";
    assert.equal(mailConfigured(), false, "sin Brevo ni SMTP no hay correo");
  } finally {
    Object.assign(env, previo);
    globalThis.fetch = fetchOriginal;
  }
});
test("carrito invitado combina variantes sin superar stock y descarta almacenamiento corrupto", () => {
  const item = { variedad_id: 1, cantidad: 2, stock_disponible: 3 };
  assert.equal(mergeGuestItems([item], { ...item, cantidad: 1 }, 99, 10)[0].cantidad, 3);
  assert.throws(() => mergeGuestItems([item], item, 99, 10));
  assert.equal(readGuestCart({ getItem: () => "invalid" }, "key"), null);
  assert.equal(readGuestCart({ getItem: () => JSON.stringify({ key: "k", items: [], updatedAt: 0 }) }, "key"), null);
});
test("navbar filtra árboles por rol y módulo, sin acoplarse a un rubro", () => {
  for (const modulo of ["stock", "eccomerce_indumentaria", "eccomerce_distribuidora"]) {
    const config = { links: [{ to: "/", label: "Inicio" }], dropdowns: [{ id: modulo, items: [{ label: "Gestión", children: [{ to: "/admin", roles: ["admin"], modulo, requiereAuth: true }] }] }] };
    assert.equal(filtrarNavbarPorRol(config, null, { [modulo]: true }).dropdowns.length, 0);
    assert.equal(filtrarNavbarPorRol(config, { roles: ["admin"] }, { [modulo]: true }).dropdowns.length, 1);
    assert.equal(filtrarNavbarPorRol(config, { roles: ["admin"] }, { [modulo]: false }).dropdowns.length, 0);
  }
});

test("panel de gestión: cada uno ve las secciones de sus permisos y el cliente no entra", async () => {
  const { panelGrupos, accesoPanel } = await import("../../frontend/src/config/navbar_config/panel_gestion.js");
  const modulos = { eccomerce_distribuidora: true };
  const porDefecto = (rol) => permisosConfig.permisos.filter((p) => p.porDefecto.includes(rol)).map((p) => p.codigo);
  const usuario = (roles, asignados = []) => ({ roles, permisos: permisosEfectivos(roles, asignados) });
  const menu = (u) => Object.fromEntries(filtrarNavbarPorRol({ dropdowns: panelGrupos }, u, modulos).dropdowns.map((g) => [g.id, g.items.map((i) => i.to)]));

  // Lo decidido con el cliente: el vendedor solo pedidos; el supervisor catálogo, precios, pedidos y cobros.
  assert.deepEqual(porDefecto("vendedor"), ["pedidos.ver", "pedidos.gestionar"]);
  assert.deepEqual(porDefecto("supervisor"), ["pedidos.ver", "pedidos.gestionar", "cobros.gestionar", "productos.editar", "precios.editar"]);
  const supervisor = usuario(["supervisor"], porDefecto("supervisor"));
  assert.deepEqual(Object.keys(menu(supervisor)), ["inicio", "distribuidora"]);
  assert.deepEqual(menu(usuario(["vendedor"], porDefecto("vendedor"))).distribuidora, ["/distribuidora/admin/notas-pedido", "/distribuidora/admin/lista-carga"]);
  assert.deepEqual(menu(supervisor).distribuidora, ["/distribuidora/admin/productos", "/distribuidora/admin/categorias", "/distribuidora/admin/marcas", "/distribuidora/admin/listas-precio", "/distribuidora/admin/importar", "/distribuidora/admin/notas-pedido", "/distribuidora/admin/lista-carga"]);
  // Un rol creado en el panel con solo artículos: sin listas de precios ni importación (que escribe precios).
  assert.deepEqual(menu(usuario(["repositor"], ["productos.editar"])).distribuidora, ["/distribuidora/admin/productos", "/distribuidora/admin/categorias", "/distribuidora/admin/marcas"]);
  const admin = menu(usuario(["admin"]));
  assert.deepEqual(admin.admin, ["/admin/staffManager", "/admin/permisos", "/admin/home-config", "/admin/anuncios"]);
  assert.ok(admin.distribuidora.includes("/distribuidora/admin/listas-precio"));
  assert.ok(Object.keys(menu(usuario(["super_admin"]))).includes("sistema"));
  assert.deepEqual(menu(usuario(["cliente"])), {});
  assert.equal(accesoPanel.roles.includes("cliente"), false);
  // Todo permiso tiene una pantalla del panel, propia o la del permiso que requiere; "ventas.ver" se ve en el inicio.
  for (const p of permisosConfig.permisos.filter((p) => p.codigo !== "ventas.ver")) {
    assert.ok([p.codigo, ...(p.requiere ?? [])].some((c) => accesoPanel.permisos.includes(c)), p.codigo);
  }
  // Con el módulo apagado desde /super-admin/modulos, desaparece su sección.
  assert.equal(filtrarNavbarPorRol({ dropdowns: panelGrupos }, supervisor, { eccomerce_distribuidora: false }).dropdowns.some((g) => g.id === "distribuidora"), false);
});

test("permisos: admin y super admin tienen todo; el resto, solo lo asignado y conocido", () => {
  assert.deepEqual(permisosEfectivos(["admin"], []), CODIGOS_PERMISO);
  assert.deepEqual(permisosEfectivos(["vendedor"], ["pedidos.ver", "inventado.ver", null]), ["pedidos.ver"]);
  assert.deepEqual(permisosEfectivos(["cajero"], ["cobros.gestionar"]), ["pedidos.ver", "cobros.gestionar"], "cobrar trae ver pedidos");
  assert.deepEqual(dependientesDe("pedidos.ver"), ["pedidos.gestionar", "cobros.gestionar"]);
  assert.deepEqual(permisosEfectivos(["cliente"], []), []);
  const vendedor = { roles: ["vendedor"], permisos: ["pedidos.ver"] };
  assert.equal(tienePermiso(vendedor, "cobros.gestionar", "pedidos.ver"), true, "alcanza con uno");
  assert.equal(tienePermiso(vendedor, "cobros.gestionar"), false);
  assert.equal(tienePermiso(null, "pedidos.ver"), false);
  assert.equal(cumpleAcceso(vendedor, {}), true);
  assert.equal(cumpleAcceso(vendedor, { permisos: ["productos.editar", "precios.editar"], todos: true }), false);
  assert.equal(cumpleAcceso({ roles: ["x"], permisos: ["productos.editar", "precios.editar"] }, { permisos: ["productos.editar", "precios.editar"], todos: true }), true);
  assert.equal(cumpleAcceso({ roles: ["super_admin"], permisos: [] }, { roles: ["super_admin"] }), true);
  for (const p of permisosConfig.permisos) assert.ok(permisosConfig.grupos.some((g) => g.codigo === p.grupo), p.codigo);
});

test("bultos y sueltos: 23 paquetes en cajas de 20 son 1 caja + 3 paquetes", async () => {
  const { separarBultos, describirBulto, textoBultos } = await import("../../unidades_config.js");
  assert.deepEqual(separarBultos(23, 20), { bultos: 1, sueltos: 3 });
  assert.deepEqual(separarBultos(40, 20), { bultos: 2, sueltos: 0 });
  assert.deepEqual(separarBultos(7, 1), { bultos: 0, sueltos: 7 }); // sin bulto, todo suelto
  assert.deepEqual(separarBultos(-3, 12), { bultos: 0, sueltos: 0 });
  assert.equal(describirBulto({ unidad_bulto: "CAJA", unidades_por_bulto: 20, unidad_medida: "PAQUETE" }), "Caja x 20 paquetes");
  assert.equal(describirBulto({ unidades_por_bulto: 1 }), null);
  const lavandina = { unidad_bulto: "CAJA", unidades_por_bulto: 12, unidad_medida: "BOTELLA" };
  assert.equal(textoBultos(26, lavandina), "2 cajas + 2 botellas");
  assert.equal(textoBultos(12, lavandina), "1 caja");
  assert.equal(textoBultos(5, lavandina), "5 botellas");
  const { cantidadConUnidad } = await import("../../unidades_config.js");
  assert.deepEqual([cantidadConUnidad(1, "CAJA"), cantidadConUnidad(0, "UNIDAD"), cantidadConUnidad(20, "PAQUETE"), cantidadConUnidad(3, "KG")], ["1 caja", "0 unidades", "20 paquetes", "3 kg"]);
});

test("ficha del artículo valida precio, IVA, stock, unidades y código de barras", async () => {
  const { validarVariedad } = await import("../src/services/common/articulo_rules.js");
  const ok = validarVariedad({ precio: "1500.5", iva_porcentaje: "10.5", controla_stock: true, cantidad: "482", stock_minimo: "50", unidad_medida: "paquete", unidad_bulto: "CAJA", unidades_por_bulto: "20", cod_ref: " 000519 ", codigo_barras: "7790 040 001230", extra: "x" });
  assert.deepEqual(ok.datos, { precio: 1500.5, precio_anterior: null, iva_porcentaje: 10.5, controla_stock: true, cantidad: 482, stock_minimo: 50, unidad_medida: "PAQUETE", unidad_bulto: "CAJA", unidades_por_bulto: 20, cod_ref: "000519", codigo_barras: "7790040001230" });
  assert.equal(validarVariedad({ precio: 10, controla_stock: false, cantidad: 99 }).datos.cantidad, 0, "sin control de stock no guarda cantidad");
  for (const [cambio, mensaje] of [
    [{ precio: "" }, /precio/], [{ precio: -1 }, /precio/], [{ iva_porcentaje: 150 }, /IVA/],
    [{ controla_stock: true, cantidad: 2.5 }, /stock/], [{ stock_minimo: -1 }, /mínimo/],
    [{ unidad_medida: "TONELADA" }, /unidad/], [{ unidades_por_bulto: 0 }, /bulto/], [{ codigo_barras: "77-90" }, /barras/],
  ]) assert.match(validarVariedad({ precio: 10, ...cambio }).error ?? "", mensaje, JSON.stringify(cambio));
});

test("lista de carga acepta ids de pedidos válidos y limita la cantidad", async () => {
  const { leerIdsPedidos, MAX_PEDIDOS_LISTA_CARGA } = await import("../src/services/distribuidora/lista_carga_service.js");
  assert.deepEqual(leerIdsPedidos("12, 15,15,x,-3,0"), [12, 15]);
  assert.throws(() => leerIdsPedidos(""), /al menos un pedido/);
  assert.throws(() => leerIdsPedidos(Array.from({ length: MAX_PEDIDOS_LISTA_CARGA + 1 }, (_, i) => i + 1).join(",")), /hasta/);
});

test("familias y categorías: la importación aplana a dos niveles y el índice arma rutas y totales", () => {
  const parsed = { columns: [{ key: "c" }, { key: "n" }, { key: "p" }, { key: "cat" }], rows: [
    { number: 2, values: ["1", "Pepitos", "100", "Almacén > Galletitas > Dulces"] },
    { number: 3, values: ["2", "Arroz", "50", "Almacén>Arroz"] },
    { number: 4, values: ["3", "Largo", "50", "Almacén > Galletitas > " + "x".repeat(80)] },
  ] };
  const filas = normalizeRows(parsed, { cod_ref: "c", producto_nombre: "n", precio: "p", categoria: "cat" }, { decimal: "comma", identity: "sku", mode: "upsert", category: "" });
  assert.equal(filas[0].value.categoria, "Almacén > Galletitas - Dulces");
  assert.equal(filas[1].value.categoria, "Almacén > Arroz");
  assert.equal(filas[2].action, "error");

  const categorias = [
    { id: 1, nombre: "Almacén", padre_id: null, cantidad_productos: 2 },
    { id: 2, nombre: "Galletitas", padre_id: 1, cantidad_productos: 5 },
    { id: 3, nombre: "Dulces", padre_id: 2, cantidad_productos: 1 }, // nivel heredado
    { id: 4, nombre: "Limpieza", padre_id: null, cantidad_productos: 0 },
  ];
  const indice = indexarCategorias(categorias);
  assert.deepEqual(indice.familias.map((f) => f.id), [1, 4]);
  assert.equal(indice.rutaDe.get(3), "Almacén › Galletitas › Dulces");
  assert.equal(indice.familiaDe.get(3), 1);
  assert.equal(indice.totalDe.get(1), 8);
  assert.deepEqual(indice.categoriasDe.get(1).map((c) => c.id), [2, 3]);
  assert.deepEqual(construirOpcionesCategoria(categorias, { soloFamilias: true }).map((o) => o.label), ["Almacén", "Limpieza"]);
  assert.equal(construirOpcionesCategoria(categorias)[1].label, "Almacén › Galletitas");
});

test("nombres del catálogo: mayúscula por palabra sin romper códigos, unidades ni palabras cortas", () => {
  const casos = {
    "pan dulce": "Pan Dulce",
    "9 de oro agridulce 20x200g": "9 de Oro Agridulce 20x200g",
    "lavandina X5 12x1 lts": "Lavandina X5 12x1 lts",
    "leche UHT descremada": "Leche UHT Descremada",
    "PAN DULCE": "Pan Dulce",                    // todo en mayúsculas: se normaliza
    "JABON LUX X3 125G": "Jabon Lux X3 125g",
    "  de   la huerta ": "De la Huerta",         // la primera palabra siempre va en mayúscula
    "la serenísima": "La Serenísima",
  };
  for (const [entrada, esperado] of Object.entries(casos)) assert.equal(formatearNombre(entrada), esperado, entrada);
  assert.equal(formatearNombre(""), "");
  assert.equal(formatearNombre(null), "");

  const parsed = { columns: [{ key: "c" }, { key: "n" }, { key: "p" }, { key: "m" }, { key: "cat" }], rows: [{ number: 2, values: ["1", "ARROZ LARGO FINO 1KG", "50", "gallo", "almacen > arroz"] }] };
  const [fila] = normalizeRows(parsed, { cod_ref: "c", producto_nombre: "n", precio: "p", marca: "m", categoria: "cat" }, { decimal: "comma", identity: "sku", mode: "upsert", category: "" });
  assert.deepEqual([fila.value.producto_nombre, fila.value.marca, fila.value.categoria], ["Arroz Largo Fino 1kg", "Gallo", "Almacen > Arroz"]);
});

test("importación: el código de barras se limpia de espacios y se valida (6 a 14 números)", async () => {
  const { normalizeRows } = await import("../src/services/distribuidora/importacion/normalize.js");
  const parsed = { columns: [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "d" }], rows: [
    { number: 2, values: ["000519", "Esponjas surtidas", "1200", "7790 040 001230"] },
    { number: 3, values: ["002982", "Lavandina", "950", "77-90"] },
    { number: 4, values: ["002983", "Sin barras", "100", ""] },
  ] };
  const mapping = { cod_ref: "a", producto_nombre: "b", precio: "c", codigo_barras: "d" };
  const [ok, mal, vacio] = normalizeRows(parsed, mapping, { decimal: "comma", identity: "sku", mode: "upsert", category: "Limpieza" });
  assert.equal(ok.value.codigo_barras, "7790040001230");
  assert.equal(ok.value.producto_nombre.toLowerCase(), "esponjas surtidas"); // no se pierden las "s"
  assert.equal(mal.action, "error");
  assert.ok(mal.message.includes("Código de barras"));
  assert.equal(vacio.value.codigo_barras, null);
});

test("precios de demostración: fijos por producto, en el rango de la familia, ~20 % en oferta y nunca en producción", async () => {
  const { precioDemo, esquemaPermiteDemo, RANGOS_FAMILIA } = await import("../src/database/seed/precios_demo_distribuidora.js");
  assert.deepEqual(precioDemo(37, "Golosinas"), precioDemo(37, "Golosinas"));
  const [min, max] = RANGOS_FAMILIA.Golosinas;
  let ofertas = 0;
  for (let id = 1; id <= 1000; id++) {
    const { precio, precio_anterior } = precioDemo(id, "Golosinas");
    assert.ok(precio >= min && precio <= max && precio % 10 === 0, "precio " + id);
    if (precio_anterior != null) {
      ofertas++;
      assert.ok(precio_anterior >= precio * 1.14 && precio_anterior <= precio * 1.36, "oferta " + id);
    }
  }
  assert.ok(ofertas > 150 && ofertas < 250, "ofertas: " + ofertas);
  assert.equal(esquemaPermiteDemo("gc_dist"), false);
  assert.equal(esquemaPermiteDemo("gc_dist_test"), true);
});
