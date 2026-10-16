import test from "node:test";
import assert from "node:assert/strict";
import { createResetToken, verifyResetToken, passwordVersion } from "../src/services/common/auth_tokens.js";
import { validQuantity, validateSnapshot } from "../src/services/common/cart_rules.js";
import { safeReturnTo } from "../../frontend/src/controls/acceso/return_to.js";
import { readGuestCart, mergeGuestItems } from "../../frontend/src/controls/carrito/guest_storage.js";
import { filtrarNavbarPorRol } from "../../frontend/src/controls/layout/navbar/navbar_permissions.js";
import { clasificarIdentificador, esNombreUsuarioValido } from "../src/services/common/nombre_usuario.js";
import { celularValido, datosClienteCompletos, validarDatosCliente } from "../src/services/common/datos_cliente.js";

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
  for (const modulo of ["gym", "kinesiologia", "eccomerce_indumentaria", "eccomerce_distribuidora"]) {
    const config = { links: [{ to: "/", label: "Inicio" }], dropdowns: [{ id: modulo, items: [{ label: "Gestión", children: [{ to: "/admin", roles: ["admin"], modulo, requiereAuth: true }] }] }] };
    assert.equal(filtrarNavbarPorRol(config, null, { [modulo]: true }).dropdowns.length, 0);
    assert.equal(filtrarNavbarPorRol(config, { roles: ["admin"] }, { [modulo]: true }).dropdowns.length, 1);
    assert.equal(filtrarNavbarPorRol(config, { roles: ["admin"] }, { [modulo]: false }).dropdowns.length, 0);
  }
});
