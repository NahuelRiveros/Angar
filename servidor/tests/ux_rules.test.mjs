import test from "node:test";
import assert from "node:assert/strict";
import { createResetToken, verifyResetToken, passwordVersion } from "../src/services/common/auth_tokens.js";
import { CODIGOS_PERMISO, dependientesDe, permisosConfig, permisosEfectivos, tienePermiso } from "../../permisos_config.js";
import { cumpleAcceso } from "../../frontend/src/controls/acceso/acceso.js";
import { env } from "../src/configuracion_servidor/env.js";
import { enviarEmail, mailConfigured } from "../src/services/common/mail_service.js";
import { safeReturnTo } from "../../frontend/src/controls/acceso/return_to.js";
import { filtrarNavbarPorRol } from "../../frontend/src/controls/layout/navbar/navbar_permissions.js";
import { clasificarIdentificador, esNombreUsuarioValido } from "../src/services/common/nombre_usuario.js";

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

test("navbar filtra árboles por sesión y rol", () => {
  const config = { links: [{ to: "/", label: "Inicio" }], dropdowns: [{ id: "sistema", items: [{ label: "Gestión", children: [{ to: "/admin", roles: ["admin"], requiereAuth: true }] }] }] };
  assert.equal(filtrarNavbarPorRol(config, null).dropdowns.length, 0);
  assert.equal(filtrarNavbarPorRol(config, { roles: ["admin"] }).dropdowns.length, 1);
  assert.equal(filtrarNavbarPorRol(config, { roles: ["jugador"], permisos: [] }).dropdowns.length, 0);
  assert.deepEqual(filtrarNavbarPorRol(config, null).links.map((l) => l.to), ["/"]);
});

test("panel de gestión: el equipo ve lo de sus permisos; organizadores y jugadores no entran", async () => {
  const { panelGrupos, accesoPanel } = await import("../../frontend/src/config/navbar_config/panel_gestion.js");
  const porDefecto = (rol) => permisosConfig.permisos.filter((p) => p.porDefecto.includes(rol)).map((p) => p.codigo);
  const usuario = (roles, asignados = []) => ({ roles, permisos: permisosEfectivos(roles, asignados) });
  const menu = (u) => Object.fromEntries(filtrarNavbarPorRol({ dropdowns: panelGrupos }, u).dropdowns.map((g) => [g.id, g.items.map((i) => i.to)]));

  assert.deepEqual(porDefecto("soporte"), ["suscripciones.ver"]);
  const admin = menu(usuario(["admin"]));
  assert.deepEqual(admin.admin, ["/admin/suscripciones", "/admin/staffManager", "/admin/permisos", "/admin/home-config", "/admin/anuncios"]);
  assert.deepEqual(menu(usuario(["super_admin"])).admin, admin.admin);
  assert.deepEqual(menu(usuario(["soporte"], porDefecto("soporte"))).admin, ["/admin/suscripciones"]);
  assert.deepEqual(menu(usuario(["editor"], ["contenido.editar"])).admin, ["/admin/home-config", "/admin/anuncios"]);
  for (const rol of permisosConfig.rolesFuera) {
    assert.deepEqual(menu(usuario([rol])), {}, rol);
    assert.equal(accesoPanel.roles.includes(rol), false, rol);
  }
});

test("permisos: admin y super admin tienen todo; el resto, solo lo asignado y conocido", () => {
  assert.deepEqual(permisosEfectivos(["admin"], []), CODIGOS_PERMISO);
  assert.deepEqual(permisosEfectivos(["super_admin"], []), CODIGOS_PERMISO);
  assert.deepEqual(permisosEfectivos(["soporte"], ["suscripciones.ver", "inventado.ver", null]), ["suscripciones.ver"]);
  assert.deepEqual(permisosEfectivos(["soporte"], ["suscripciones.gestionar"]), ["suscripciones.ver", "suscripciones.gestionar"], "gestionar trae ver");
  assert.deepEqual(dependientesDe("suscripciones.ver"), ["suscripciones.gestionar"]);
  assert.deepEqual(permisosEfectivos(["jugador"], []), []);
  assert.deepEqual(permisosEfectivos(["organizador"], []), []);
  const soporte = { roles: ["soporte"], permisos: ["suscripciones.ver"] };
  assert.equal(tienePermiso(soporte, "suscripciones.gestionar", "suscripciones.ver"), true, "alcanza con uno");
  assert.equal(tienePermiso(soporte, "suscripciones.gestionar"), false);
  assert.equal(tienePermiso(null, "suscripciones.ver"), false);
  assert.equal(cumpleAcceso(soporte, {}), true);
  assert.equal(cumpleAcceso(soporte, { permisos: ["suscripciones.ver", "usuarios.gestionar"], todos: true }), false);
  assert.equal(cumpleAcceso({ roles: ["super_admin"], permisos: [] }, { roles: ["super_admin"] }), true);
  for (const p of permisosConfig.permisos) assert.ok(permisosConfig.grupos.some((g) => g.codigo === p.grupo), p.codigo);
});

test("roles: el registro crea jugadores y los roles fuera del equipo no aparecen como editables", async () => {
  const { ROLES_BASE } = await import("../src/services/usuarios/permisos_service.js");
  for (const rol of ["super_admin", "admin", "soporte", "organizador", "jugador"]) assert.ok(ROLES_BASE.includes(rol), rol);
  assert.deepEqual(permisosConfig.rolesFuera, ["organizador", "jugador"]);
});

test("plan: 14 días de prueba, estados por fecha argentina y aviso 7 días antes", async () => {
  const r = await import("../src/services/suscripciones/suscripcion_reglas.js");
  // 02:30 UTC del 28/10 todavía es 27/10 en Argentina (UTC-3).
  assert.equal(r.hoyArgentina(new Date("2026-10-28T02:30:00Z")), "2026-10-27");
  assert.equal(r.vencimientoDePrueba("2026-10-27"), "2026-11-09");
  assert.equal(r.calcularEstado({ fecha_vencimiento: "2026-11-09", en_prueba: true }, "2026-10-27").dias_restantes, 14);
  assert.equal(r.calcularEstado({ fecha_vencimiento: "2026-11-09", en_prueba: true }, "2026-10-27").estado, "prueba");
  assert.equal(r.calcularEstado({ fecha_vencimiento: "2026-11-30", en_prueba: false }, "2026-10-27").estado, "activo");
  const porVencer = r.calcularEstado({ fecha_vencimiento: "2026-11-02", en_prueba: false }, "2026-10-27");
  assert.deepEqual([porVencer.estado, porVencer.dias_restantes, porVencer.vigente], ["por_vencer", 7, true]);
  const ultimoDia = r.calcularEstado({ fecha_vencimiento: "2026-10-27", en_prueba: false }, "2026-10-27");
  assert.deepEqual([ultimoDia.vigente, ultimoDia.dias_restantes], [true, 1], "el día del vencimiento todavía se puede usar");
  const vencido = r.calcularEstado({ fecha_vencimiento: "2026-10-26", en_prueba: true }, "2026-10-27");
  assert.deepEqual([vencido.estado, vencido.vigente], ["vencido", false], "sin días de gracia, también al terminar la prueba");
});

test("plan: cada pago suma 30 días al final, o desde hoy si ya había vencido", async () => {
  const { nuevoVencimiento, sumarDias, diasEntre } = await import("../src/services/suscripciones/suscripcion_reglas.js");
  assert.equal(nuevoVencimiento("2026-11-05", "2026-10-27", 30), "2026-12-05", "pagar antes no hace perder días");
  assert.equal(nuevoVencimiento("2026-10-27", "2026-10-27", 30), "2026-11-26");
  assert.equal(nuevoVencimiento("2026-09-01", "2026-10-27", 30), "2026-11-25", "vencido: hoy es el día 1 de 30");
  assert.equal(diasEntre("2026-10-27", nuevoVencimiento("2026-09-01", "2026-10-27", 30)) + 1, 30);
  assert.equal(sumarDias("2028-02-28", 1), "2028-02-29");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
});

test("MercadoPago: solo un pago aprobado, en pesos y por el precio suma días al usuario de la referencia", async () => {
  const { evaluarPagoMercadoPago, referenciaDeUsuario, usuarioDeReferencia } = await import("../src/services/suscripciones/suscripcion_reglas.js");
  const pago = { id: 1, estado: "approved", monto: 15000, moneda: "ARS", external_reference: referenciaDeUsuario(42) };
  assert.deepEqual(evaluarPagoMercadoPago(pago, 15000), { aplicar: true, usuarioId: 42, estado: "aprobado" });
  assert.equal(evaluarPagoMercadoPago({ ...pago, monto: 100 }, 15000).estado, "monto_insuficiente");
  assert.equal(evaluarPagoMercadoPago({ ...pago, moneda: "USD" }, 15000).estado, "monto_insuficiente");
  assert.equal(evaluarPagoMercadoPago(pago, 0).aplicar, false, "sin precio configurado no se habilita nada");
  assert.deepEqual(evaluarPagoMercadoPago({ ...pago, estado: "pending" }, 15000), { aplicar: false, usuarioId: 42, estado: "pendiente" });
  assert.equal(evaluarPagoMercadoPago({ ...pago, estado: "rejected" }, 15000).estado, "rechazado");
  for (const mala of ["42", "usuario:", "usuario:1 OR 1=1", "usuario:-3", null]) assert.equal(usuarioDeReferencia(mala), null, String(mala));
  assert.equal(evaluarPagoMercadoPago({ ...pago, external_reference: "otra-cosa" }, 15000).usuarioId, null);
});

test("plan: extensión manual y ajuste de fecha validan días, fecha y nota", async () => {
  const { validarExtensionManual, validarAjusteFecha } = await import("../src/services/suscripciones/suscripcion_reglas.js");
  assert.deepEqual(validarExtensionManual({ dias: 30, nota: "  transferencia  " }).datos, { dias: 30, nota: "transferencia" });
  for (const dias of [0, -1, 1.5, 366, "abc", undefined]) assert.ok(validarExtensionManual({ dias }).error, String(dias));
  assert.ok(validarExtensionManual({ dias: 3, nota: "x".repeat(301) }).error);
  assert.deepEqual(validarAjusteFecha({ fecha: "2026-12-31" }).datos, { fecha: "2026-12-31", nota: null });
  for (const fecha of ["2026-02-30", "31/12/2026", "2026-1-5", "", null]) assert.ok(validarAjusteFecha({ fecha }).error, String(fecha));
});
