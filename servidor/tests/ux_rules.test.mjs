import test from "node:test";
import assert from "node:assert/strict";
import { createResetToken, verifyResetToken, passwordVersion } from "../src/services/common/auth_tokens.js";
import { validQuantity, validateSnapshot } from "../src/services/common/cart_rules.js";
import { safeReturnTo } from "../../frontend/src/controls/acceso/return_to.js";
import { readGuestCart, mergeGuestItems } from "../../frontend/src/controls/carrito/guest_storage.js";
import { filtrarNavbarPorRol } from "../../frontend/src/controls/layout/navbar/navbar_permissions.js";
import { clasificarIdentificador, esNombreUsuarioValido } from "../src/services/common/nombre_usuario.js";
import { celularValido, datosClienteCompletos, validarDatosCliente } from "../src/services/common/datos_cliente.js";
import { normalizeRows } from "../src/services/distribuidora/importacion/normalize.js";
import { formatearNombre } from "../src/services/common/formato_nombre.js";
import { indexarCategorias, construirOpcionesCategoria } from "../../frontend/src/modules/eccomerce_distribuidora/utils/categoria_jerarquia.js";

test("primer pedido exige nombre, apellido, celular y datos de entrega", () => {
  const completos = { nombre: "Gise", apellido: "Google", celular: "11 2345-6789", cuit: "20-12345678-9", direccion: "Calle 1", provincia: "Buenos Aires", localidad: "La Plata" };
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

test("panel de gestión: cada rol ve solo sus secciones y el cliente no entra", async () => {
  const { panelGrupos, rolesPanel } = await import("../../frontend/src/config/navbar_config/panel_gestion.js");
  const modulos = { eccomerce_distribuidora: true };
  const menu = (roles) => Object.fromEntries(filtrarNavbarPorRol({ dropdowns: panelGrupos }, { roles }, modulos).dropdowns
    .map((g) => [g.id, g.items.map((i) => i.to)]));

  assert.deepEqual(Object.keys(menu(["staff"])), ["inicio", "distribuidora"]);
  assert.deepEqual(menu(["vendedor"]).distribuidora, ["/distribuidora/admin/notas-pedido", "/distribuidora/admin/lista-carga"]);
  assert.deepEqual(menu(["staff"]).distribuidora, ["/distribuidora/admin/productos", "/distribuidora/admin/categorias", "/distribuidora/admin/marcas", "/distribuidora/admin/importar", "/distribuidora/admin/notas-pedido", "/distribuidora/admin/lista-carga"]);
  assert.ok(menu(["admin"]).admin.includes("/admin/staffManager"));
  assert.ok(menu(["admin"]).distribuidora.includes("/distribuidora/admin/listas-precio")); // solo admin: define lo que se cobra
  assert.deepEqual(Object.keys(menu(["super_admin"])), ["inicio", "sistema"]);
  assert.deepEqual(menu(["cliente"]), {});
  assert.equal(rolesPanel.includes("cliente"), false);
  // Con el módulo apagado desde /super-admin/modulos, desaparece su sección.
  assert.equal(filtrarNavbarPorRol({ dropdowns: panelGrupos }, { roles: ["staff"] }, { eccomerce_distribuidora: false }).dropdowns.some((g) => g.id === "distribuidora"), false);
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
