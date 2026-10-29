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

test("transferencia: el comprobante se reconoce por su contenido y se validan tamaño, nota y motivo", async () => {
  const { detectarFormatoComprobante, validarAvisoTransferencia, validarRechazo } = await import("../src/services/suscripciones/suscripcion_reglas.js");
  const { cobroConfig, transferenciaLista } = await import("../../cobro_config.js");
  const relleno = Buffer.alloc(16);
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), relleno]);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), relleno]);
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), relleno]);
  const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), relleno]);
  assert.deepEqual([jpg, png, webp, pdf].map(detectarFormatoComprobante), ["jpg", "png", "webp", "pdf"]);
  // Un ejecutable o un HTML con nombre .jpg no pasa: se mira el contenido.
  for (const malo of [Buffer.from("MZ\x90\x00 programa......"), Buffer.from("<html><script>alert(1)</script>"), Buffer.alloc(3), null]) {
    assert.equal(detectarFormatoComprobante(malo), null);
  }
  const reglas = cobroConfig.comprobante;
  assert.deepEqual(validarAvisoTransferencia({ archivo: { buffer: pdf }, nota: " Banco Galicia " }, reglas).datos, { formato: "pdf", nota: "Banco Galicia" });
  assert.match(validarAvisoTransferencia({ archivo: null }, reglas).error, /Adjuntá/);
  assert.match(validarAvisoTransferencia({ archivo: { buffer: Buffer.from("texto cualquiera, no es imagen") } }, reglas).error, /JPG, PNG o WEBP/);
  assert.match(validarAvisoTransferencia({ archivo: { buffer: Buffer.concat([jpg, Buffer.alloc(reglas.maxBytes)]) } }, reglas).error, /hasta 5 MB/);
  assert.ok(validarAvisoTransferencia({ archivo: { buffer: jpg }, nota: "x".repeat(301) }, reglas).error);
  assert.deepEqual(validarRechazo({ motivo: "  El monto no coincide " }).datos, { motivo: "El monto no coincide" });
  for (const motivo of ["", "no", "x".repeat(301), undefined]) assert.ok(validarRechazo({ motivo }).error, String(motivo));
  // Con los datos bancarios de ejemplo ([COMPLETAR]) todavía no se puede transferir.
  assert.equal(transferenciaLista(), false);
  assert.equal(cobroConfig.mercadoPagoHabilitado, false, "por ahora se cobra por transferencia");
});

test("torneo: datos con lista blanca, textos recortados, fechas válidas y en orden", async () => {
  const { validarDatosTorneo, fechasCoherentes } = await import("../src/services/torneos/torneo_reglas.js");
  const { datos } = validarDatosTorneo({ nombre: "  Abierto de Verano ", sede: " Club Norte ", fecha_inicio: "2026-12-05", estado: "finalizado", organizador_id: 99 }, { crear: true });
  assert.deepEqual(datos, { nombre: "Abierto de Verano", sede: "Club Norte", fecha_inicio: "2026-12-05" }, "estado y dueño no se aceptan del cuerpo");
  assert.match(validarDatosTorneo({}, { crear: true }).error, /nombre/);
  assert.match(validarDatosTorneo({ nombre: "AB" }, { crear: true }).error, /entre 3 y 120/);
  assert.deepEqual(validarDatosTorneo({ sede: "" }).datos, { sede: null }, "vaciar un campo opcional");
  assert.match(validarDatosTorneo({ fecha_inicio: "2026-02-30" }).error, /fechas/);
  assert.match(validarDatosTorneo({ reglamento: "x".repeat(10001) }).error, /10000/);
  assert.match(validarDatosTorneo({ sede: { $gt: "" } }).error, /texto/);
  assert.equal(fechasCoherentes({ fecha_inicio: "2026-12-06", fecha_fin: "2026-12-05" }), false);
  assert.equal(fechasCoherentes({ fecha_inicio: "2026-12-05", fecha_fin: "2026-12-05" }), true);
  assert.equal(fechasCoherentes({ fecha_inicio: null, fecha_fin: "2026-12-05" }), true);
});

test("torneo: estados en orden y requisitos para abrir la inscripción", async () => {
  const { puedePasar, faltantesPara } = await import("../src/services/torneos/torneo_reglas.js");
  const { TRANSICIONES, EDICION_POR_ESTADO, ESTADOS_TORNEO } = await import("../../torneo_config.js");
  assert.ok(puedePasar("borrador", "inscripcion"));
  assert.ok(puedePasar("inscripcion", "borrador"), "se puede despublicar mientras se inscribe");
  assert.ok(puedePasar("en_juego", "finalizado"));
  assert.equal(puedePasar("borrador", "en_juego"), false, "no se saltea la inscripción");
  assert.equal(puedePasar("en_juego", "inscripcion"), false);
  assert.equal(puedePasar("finalizado", "cancelado"), false, "finalizado queda cerrado");
  assert.equal(puedePasar("cancelado", "borrador"), false);
  for (const [estado, salidas] of Object.entries(TRANSICIONES)) {
    assert.ok(ESTADOS_TORNEO[estado] && EDICION_POR_ESTADO[estado], estado);
    for (const { a } of salidas) assert.ok(ESTADOS_TORNEO[a], `${estado} → ${a}`);
  }
  assert.deepEqual(faltantesPara("inscripcion", { sede: null, fecha_inicio: null }, 0), ["la sede", "la fecha de inicio", "al menos una categoría"]);
  assert.deepEqual(faltantesPara("inscripcion", { sede: "Club", fecha_inicio: "2026-12-05" }, 2), []);
  assert.deepEqual(faltantesPara("cancelado", { sede: null }, 0), [], "cancelar no pide nada");
  assert.equal(EDICION_POR_ESTADO.en_juego.categorias, false);
  assert.equal(EDICION_POR_ESTADO.finalizado.datos, false);
});

test("categorías: nivel y rama de la lista o nombre propio, cupo opcional y sin repetidas", async () => {
  const { validarCategoria, claveCategoria } = await import("../src/services/torneos/torneo_reglas.js");
  const { nombreCategoria } = await import("../../torneo_config.js");
  const cuarta = validarCategoria({ nivel: "4", rama: "caballeros", cupo_parejas: "16" }).datos;
  const ZONA_POR_DEFECTO = { parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", formato_llave: "mejor_de_3_stb" };
  assert.deepEqual(cuarta, { nivel: 4, rama: "caballeros", nombre_personalizado: null, cupo_parejas: 16, monto_inscripcion: null, ...ZONA_POR_DEFECTO });
  assert.equal(nombreCategoria(cuarta), "4ta Caballeros");
  assert.equal(nombreCategoria({ nivel: 7, rama: "mixto" }), "7ma Mixto");
  const suma = validarCategoria({ nombre_personalizado: " Suma 13 ", nivel: 4, rama: "damas" }).datos;
  assert.deepEqual(suma, { nivel: null, rama: null, nombre_personalizado: "Suma 13", cupo_parejas: null, monto_inscripcion: null, ...ZONA_POR_DEFECTO }, "con nombre propio se ignora la lista");
  const larga = validarCategoria({ nivel: 2, rama: "mixto", parejas_por_zona: "4", clasifican_por_zona: "1", formato_zona: "mejor_de_3_stb" }).datos;
  assert.deepEqual([larga.parejas_por_zona, larga.clasifican_por_zona, larga.formato_zona], [4, 1, "mejor_de_3_stb"]);
  assert.match(validarCategoria({ nivel: 2, rama: "mixto", parejas_por_zona: 6 }).error, /zonas pueden ser/);
  assert.match(validarCategoria({ nivel: 2, rama: "mixto", parejas_por_zona: 3, clasifican_por_zona: 3 }).error, /clasifican/);
  assert.match(validarCategoria({ nivel: 2, rama: "mixto", formato_zona: "a_muerte" }).error, /formato/);
  assert.match(validarCategoria({ nivel: 2, rama: "mixto", formato_llave: "a_muerte" }).error, /llave/);
  assert.match(validarCategoria({ nivel: 9, rama: "damas" }).error, /nivel/);
  assert.match(validarCategoria({ nivel: 3, rama: "veteranos" }).error, /rama/);
  for (const cupo of [1, 257, 2.5, "muchas"]) assert.ok(validarCategoria({ nivel: 3, rama: "damas", cupo_parejas: cupo }).error, String(cupo));
  assert.equal(claveCategoria({ nombre_personalizado: "SUMA  13" }), claveCategoria(suma));
  assert.equal(claveCategoria({ nombre_personalizado: "4ta caballeros" }), claveCategoria(cuarta), "el nombre propio no duplica una de la lista");
});

test("premios: puesto conocido, descripción obligatoria, 'Otro' con nombre y tope por categoría", async () => {
  const { validarPremios } = await import("../src/services/torneos/torneo_reglas.js");
  const { datos } = validarPremios([
    { puesto: "campeon", descripcion: " $200.000 + trofeo " },
    { puesto: "otro", etiqueta: "Fair play", descripcion: "Paletas", id: 5, categoria_id: 99 },
  ]);
  assert.deepEqual(datos, [
    { puesto: "campeon", etiqueta: null, descripcion: "$200.000 + trofeo", orden: 0 },
    { puesto: "otro", etiqueta: "Fair play", descripcion: "Paletas", orden: 1 },
  ]);
  assert.deepEqual(validarPremios([]).datos, [], "se pueden quitar todos");
  assert.match(validarPremios([{ puesto: "primero", descripcion: "x" }]).error, /puesto/);
  assert.match(validarPremios([{ puesto: "campeon", descripcion: "  " }]).error, /Campeón/);
  assert.match(validarPremios([{ puesto: "otro", descripcion: "x" }]).error, /Otro/);
  assert.match(validarPremios(Array.from({ length: 11 }, () => ({ puesto: "campeon", descripcion: "x" }))).error, /Hasta 10/);
  assert.ok(validarPremios("campeon").error);
});

test("marcadores: sets a 6 y a 9, mejor de 3 y super tie-break; rechaza lo imposible", async () => {
  const { validarResultado } = await import("../src/services/torneos/zona_reglas.js");
  const ok = (sets, formato) => validarResultado(sets, formato).datos?.ganador;
  const mal = (sets, formato) => validarResultado(sets, formato).error;
  assert.equal(ok([[6, 3]], "un_set_6"), 1);
  assert.equal(ok([[5, 7]], "un_set_6"), 2);
  assert.equal(ok([[7, 6]], "un_set_6"), 1);
  for (const set of [[6, 5], [7, 4], [8, 6], [6, 6], [3, 2]]) assert.ok(mal([set], "un_set_6"), set.join("-"));
  assert.equal(ok([[9, 8]], "un_set_9"), 1, "9-8 con tie-break en 8-8");
  assert.ok(mal([[9, 9]], "un_set_9"));
  assert.ok(mal([[10, 8]], "un_set_9"));
  assert.equal(ok([[6, 4], [3, 6], [7, 5]], "mejor_de_3"), 1);
  assert.equal(ok([[4, 6], [2, 6]], "mejor_de_3"), 2);
  assert.match(mal([[6, 4], [6, 3], [6, 0]], "mejor_de_3"), /Sobra un set/);
  assert.match(mal([[6, 4], [3, 6]], "mejor_de_3"), /Falta cargar/);
  assert.equal(ok([[6, 4], [3, 6], [10, 8]], "mejor_de_3_stb"), 1);
  assert.equal(ok([[6, 4], [3, 6], [12, 14]], "mejor_de_3_stb"), 2);
  assert.match(mal([[6, 4], [3, 6], [10, 9]], "mejor_de_3_stb"), /super tie-break/);
  assert.match(mal([[6, 4], [3, 6], [15, 9]], "mejor_de_3_stb"), /super tie-break/, "pasado de 10 se gana por 2 exactos");
  assert.match(mal([[6, 4], [3, 6], [7, 5]], "mejor_de_3_stb"), /super tie-break/);
  for (const raro of [[], null, [[6]], [["6", "3"]], [[6.5, 3]], [[-1, 6]]]) assert.ok(mal(raro, "un_set_6"), JSON.stringify(raro));
  assert.ok(mal([[6, 3]], "inventado"));
});

test("zonas: tamaños parejos, nunca una zona de 2, cabezas de serie separadas y sorteo reproducible", async () => {
  const { tamaniosDeZonas, armarZonas, nombreZona } = await import("../src/services/torneos/zona_reglas.js");
  assert.deepEqual(tamaniosDeZonas(9, 3), [3, 3, 3]);
  assert.deepEqual(tamaniosDeZonas(10, 3), [4, 3, 3]);
  assert.deepEqual(tamaniosDeZonas(11, 3), [4, 4, 3]);
  assert.deepEqual(tamaniosDeZonas(5, 3), [5], "con 5 y zonas de 3 no se arma una de 2");
  assert.deepEqual(tamaniosDeZonas(9, 5), [5, 4]);
  assert.deepEqual(tamaniosDeZonas(10, 4), [5, 5]);
  assert.deepEqual(tamaniosDeZonas(2, 3), [2], "con 2 parejas, un partido");
  assert.deepEqual(tamaniosDeZonas(1, 3), []);
  for (let n = 3; n <= 40; n += 1) {
    for (const k of [3, 4, 5]) {
      const t = tamaniosDeZonas(n, k);
      assert.equal(t.reduce((a, b) => a + b, 0), n, `${n}/${k}`);
      assert.ok(Math.min(...t) >= 3, `${n}/${k}: ${t}`);
      assert.ok(Math.max(...t) - Math.min(...t) <= 1, `${n}/${k}: ${t}`);
    }
  }
  const parejas = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, cabeza_de_serie: i < 4 }));
  const fijo = () => 0.42;
  const zonas = armarZonas(parejas, 3, fijo);
  assert.deepEqual(zonas.map((z) => z.nombre), ["A", "B", "C", "D"]);
  assert.deepEqual(zonas.map((z) => z.parejas[0]), [1, 2, 3, 4], "una cabeza de serie por zona");
  assert.deepEqual(zonas.flatMap((z) => z.parejas).sort((a, b) => a - b), parejas.map((p) => p.id), "están todas, una sola vez");
  assert.deepEqual(armarZonas(parejas, 3, fijo), zonas, "mismo azar, mismas zonas");
  let semilla = 7;
  const otroAzar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
  assert.notDeepEqual(armarZonas(parejas, 3, otroAzar), zonas, "otro sorteo, otras zonas");
  assert.equal(nombreZona(27), "Z28");
});

test("fixture: todos contra todos una vez y nadie juega dos veces en la misma fecha", async () => {
  const { fixtureTodosContraTodos } = await import("../src/services/torneos/zona_reglas.js");
  for (const n of [2, 3, 4, 5, 6]) {
    const ids = Array.from({ length: n }, (_, i) => i + 1);
    const partidos = fixtureTodosContraTodos(ids);
    assert.equal(partidos.length, (n * (n - 1)) / 2, `n=${n}`);
    const claves = partidos.map(([a, b]) => [a, b].sort().join("-"));
    assert.equal(new Set(claves).size, claves.length, "sin repetidos");
    const porFecha = Math.floor(n / 2);
    for (let i = 0; i < partidos.length; i += porFecha) {
      const fecha = partidos.slice(i, i + porFecha).flat();
      assert.equal(new Set(fecha).size, fecha.length, `n=${n}: alguien juega dos veces en la fecha ${i / porFecha + 1}`);
    }
  }
});

test("posiciones: ganados, diferencia de sets, de games, entre ellas; clasificados al terminar la zona", async () => {
  const { tablaDeZona } = await import("../src/services/torneos/zona_reglas.js");
  const p = (pareja1_id, pareja2_id, sets, formato = "mejor_de_3") => ({
    pareja1_id, pareja2_id, sets, formato, ganador_id: sets.filter(([a, b]) => a > b).length > sets.length / 2 ? pareja1_id : pareja2_id,
  });
  // 1 gana todo; 2 y 3 ganan uno cada una con la misma diferencia de sets: decide la de games.
  let tabla = tablaDeZona([1, 2, 3], [p(1, 2, [[6, 0], [6, 0]]), p(1, 3, [[6, 4], [6, 4]]), p(2, 3, [[6, 3], [6, 4]])], 2);
  assert.equal(tabla.completa, true);
  assert.deepEqual(tabla.filas.map((f) => [f.inscripcion_id, f.pg, f.posicion, f.clasificado]), [[1, 2, 1, true], [2, 1, 2, true], [3, 0, 3, false]]);
  assert.deepEqual([tabla.filas[0].sets_favor, tabla.filas[0].games_favor, tabla.filas[0].games_contra], [4, 24, 8]);

  // Empate total entre dos (mismos ganados, sets y games): manda el partido entre ellas.
  tabla = tablaDeZona([1, 2, 3, 4], [
    p(1, 3, [[6, 4], [6, 4]]), p(2, 4, [[6, 4], [6, 4]]),
    p(2, 1, [[6, 4], [6, 4]]), p(3, 4, [[6, 0], [6, 0]]),
    p(1, 4, [[6, 4], [6, 4]]), p(3, 2, [[6, 4], [6, 4]]),
  ], 2);
  const [primera, segunda] = tabla.filas;
  assert.deepEqual([primera.pg, segunda.pg], [2, 2]);
  assert.ok(tabla.filas.slice(0, 3).every((f) => f.pg === 2), "triple empate en ganados");

  const dos = tablaDeZona([5, 6, 7], [p(5, 6, [[6, 4]], "un_set_6"), p(6, 7, [[6, 4]], "un_set_6"), p(7, 5, [[6, 4]], "un_set_6")], 1);
  assert.equal(new Set(dos.filas.map((f) => f.pg)).size, 1, "triangular: todas ganan una");

  const directo = tablaDeZona([8, 9, 10], [p(8, 10, [[6, 2]], "un_set_6"), p(9, 10, [[6, 2]], "un_set_6"), p(9, 8, [[6, 2]], "un_set_6")], 1);
  assert.deepEqual(directo.filas.map((f) => f.inscripcion_id), [9, 8, 10]);
  // A=1, B=2, C=3, D=4 (un set). A, B y C ganan 2; C tiene mejor diferencia de games (+5).
  // A y B quedan iguales en todo (sets +1, games +4): B le ganó a A, va adelante.
  const empatadas = tablaDeZona([1, 2, 3, 4], [
    p(2, 1, [[6, 4]], "un_set_6"), p(1, 3, [[6, 3]], "un_set_6"), p(1, 4, [[6, 3]], "un_set_6"),
    p(3, 2, [[6, 4]], "un_set_6"), p(2, 4, [[6, 2]], "un_set_6"), p(3, 4, [[6, 0]], "un_set_6"),
  ], 2);
  assert.deepEqual(empatadas.filas.map((f) => [f.inscripcion_id, f.pg, f.games_favor - f.games_contra]), [[3, 2, 5], [2, 2, 4], [1, 2, 4], [4, 0, -13]]);
  assert.deepEqual(empatadas.filas.filter((f) => f.clasificado).map((f) => f.inscripcion_id), [3, 2]);

  // Super tie-break: cuenta como set y como un solo game.
  const stb = tablaDeZona([1, 2], [p(1, 2, [[6, 4], [3, 6], [10, 8]], "mejor_de_3_stb")], 1);
  assert.deepEqual([stb.filas[0].sets_favor, stb.filas[0].games_favor, stb.filas[0].games_contra], [2, 10, 10]);

  const incompleta = tablaDeZona([1, 2, 3], [p(1, 2, [[6, 0]], "un_set_6")], 2);
  assert.equal(incompleta.completa, false);
  assert.ok(incompleta.filas.every((f) => !f.clasificado), "sin zona terminada no hay clasificados");
});

test("inscripciones: nombres completos, teléfono limpio, nota acotada y cabeza de serie solo si es true", async () => {
  const { validarInscripcionOnline, validarParejaOrganizador } = await import("../src/services/torneos/inscripcion_reglas.js");
  assert.deepEqual(validarInscripcionOnline({ categoria_id: "7", jugador2_nombre: "  Juan   Pérez ", telefono: "+54 9 370 400-0000", usuario_id: 1, estado: "confirmada" }).datos,
    { categoria_id: 7, jugador2_nombre: "Juan Pérez", telefono: "+54 9 370 400-0000", nota: null }, "estado y dueño no se aceptan del cuerpo");
  assert.match(validarInscripcionOnline({ categoria_id: 7, jugador2_nombre: "J" }).error, /compañero/);
  assert.match(validarInscripcionOnline({ jugador2_nombre: "Juan Pérez" }).error, /categoría/);
  assert.match(validarInscripcionOnline({ categoria_id: 7, jugador2_nombre: "Juan Pérez", telefono: "<script>" }).error, /teléfono/);
  const pareja = validarParejaOrganizador({ categoria_id: 3, jugador1_nombre: "Ana Gómez", jugador2_nombre: "Bea Ruiz", cabeza_de_serie: "true" }).datos;
  assert.equal(pareja.cabeza_de_serie, false, "solo el booleano true marca cabeza de serie");
  assert.equal(validarParejaOrganizador({ jugador1_nombre: "Ana Gómez", jugador2_nombre: "Bea Ruiz", cabeza_de_serie: true }, { editar: true }).datos.categoria_id, undefined, "al editar no se cambia la categoría");
  assert.match(validarParejaOrganizador({ categoria_id: 3, jugador1_nombre: "Ana Gómez" }).error, /Jugador 2/);
});


test("llave: siembra clásica, 1ºA contra 2ºB y los de la misma zona en mitades opuestas", async () => {
  const { ordenDeSiembra, armarLlave, nombreRonda } = await import("../src/services/torneos/llave_reglas.js");
  assert.deepEqual(ordenDeSiembra(4), [1, 4, 2, 3]);
  assert.deepEqual(ordenDeSiembra(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  // Zona A: 1º=101, 2º=102; zona B: 1º=201, 2º=202.
  const { tamanio, slots } = armarLlave([{ nombre: "A", clasificados: [101, 102] }, { nombre: "B", clasificados: [201, 202] }]);
  assert.equal(tamanio, 4);
  assert.deepEqual(slots, [101, 202, 201, 102], "semis: 1ºA-2ºB y 1ºB-2ºA");
  assert.deepEqual([nombreRonda(1), nombreRonda(2), nombreRonda(4), nombreRonda(8), nombreRonda(32)], ["Final", "Semifinal", "Cuartos de final", "Octavos de final", "Ronda de 64"]);
  assert.match(armarLlave([{ nombre: "A", clasificados: [1] }]).error, /al menos 2/);
});

test("llave: con 6 clasificados los 1º de A y B pasan sin jugar y nadie cruza a su zona en primera ronda", async () => {
  const { armarLlave, partidosDeLlave } = await import("../src/services/torneos/llave_reglas.js");
  const zonas = ["A", "B", "C"].map((nombre, i) => ({ nombre, clasificados: [(i + 1) * 100 + 1, (i + 1) * 100 + 2] }));
  const llave = armarLlave(zonas);
  assert.equal(llave.tamanio, 8);
  const partidos = partidosDeLlave(llave);
  const primera = partidos.filter((p) => p.ronda === 1);
  assert.equal(primera.length, 2, "6 parejas en un cuadro de 8: 2 partidos y 2 pases");
  const segunda = partidos.filter((p) => p.ronda === 2);
  const conPase = segunda.flatMap((p) => [p.pareja1, p.pareja2]).filter(Boolean);
  assert.deepEqual(conPase.sort(), [101, 201], "los pases son para los 1º de A y B");
  for (const p of primera) assert.notEqual(Math.floor(p.pareja1 / 100), Math.floor(p.pareja2 / 100), "misma zona en primera ronda");
  assert.equal(partidos.filter((p) => p.ronda === 3).length, 1, "una final");
});

test("lista pública: filtros con allowlist y resumen de la tarjeta", async () => {
  const { normalizarFiltros, resumirTorneo } = await import("../src/services/torneos/publico_reglas.js");
  assert.deepEqual(normalizarFiltros({ q: "  Copa  ", estado: "en_juego", rama: "mixto", nivel: "5" }), { busqueda: "Copa", estado: "en_juego", rama: "mixto", nivel: 5 });
  assert.deepEqual(normalizarFiltros({ estado: "borrador", rama: "otra", nivel: "9", q: "" }), { busqueda: null, estado: null, rama: null, nivel: null }, "lo desconocido se ignora: nunca muestra borradores");
  assert.equal(normalizarFiltros({ q: "50%_off" }).busqueda, "50\\%\\_off", "escapa los comodines del ILIKE");
  assert.equal(normalizarFiltros({ q: ["a"] }).busqueda, null);

  const cat = (id, extra) => ({ id, nivel: 5, rama: "mixto", nombre_personalizado: null, cupo_parejas: 12, parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", ...extra });
  const confirmadas = new Map([[1, 9], [2, 12]]);
  const r = resumirTorneo({ id: 4, descripcion: "x ".repeat(200) }, [cat(1), cat(2, { nivel: null, rama: null, nombre_personalizado: "Suma 13" })], confirmadas, "Paletas");
  assert.deepEqual(r.categorias, [{ nombre: "5ta Mixto", rama: "mixto" }, { nombre: "Suma 13", rama: null }]);
  assert.deepEqual(r.ramas, ["mixto"]);
  assert.deepEqual(r.formato, { parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6" });
  assert.deepEqual([r.parejas, r.lugares_libres, r.premio_campeon], [21, 3, "Paletas"]);
  assert.ok(r.descripcion.length <= 161 && r.descripcion.endsWith("…"));
  const mezcla = resumirTorneo({ id: 5, descripcion: null }, [cat(1), cat(3, { cupo_parejas: null, formato_zona: "mejor_de_3" })], confirmadas, undefined);
  assert.deepEqual([mezcla.formato, mezcla.lugares_libres, mezcla.premio_campeon, mezcla.descripcion], [null, null, null, null], "formatos distintos o una sin cupo: no se inventa un total");
});

test("cobro de la inscripción: monto, CBU/CVU y alias del torneo; cuándo la pareja puede mandar el comprobante", async () => {
  const { validarDatosTorneo, validarCategoria, validarMonto } = await import("../src/services/torneos/torneo_reglas.js");
  const { motivoParaNoSubirComprobante } = await import("../src/services/torneos/inscripcion_reglas.js");
  assert.deepEqual(validarDatosTorneo({ monto_inscripcion: "15000", cobro_titular: " Club Norte ", cobro_banco: "Banco EJEMPLO", cobro_cbu: "0000 0031 0000 0000 0000 01", cobro_alias: "mipadel.ejemplo" }).datos,
    { monto_inscripcion: 15000, cobro_titular: "Club Norte", cobro_banco: "Banco EJEMPLO", cobro_cbu: "0000003100000000000001", cobro_alias: "mipadel.ejemplo" });
  assert.deepEqual(validarDatosTorneo({ monto_inscripcion: "", cobro_cbu: "", cobro_alias: "" }).datos, { monto_inscripcion: null, cobro_cbu: null, cobro_alias: null }, "vacío = sin cobro");
  assert.match(validarDatosTorneo({ cobro_cbu: "123" }).error, /22 números/);
  assert.match(validarDatosTorneo({ cobro_alias: "con espacio" }).error, /alias/);
  assert.match(validarDatosTorneo({ monto_inscripcion: "-5" }).error, /monto/);
  assert.match(validarMonto("10.555").error, /monto/, "hasta 2 decimales");
  assert.equal(validarMonto("12500.50").valor, 12500.5);
  assert.equal(validarCategoria({ nivel: "6", rama: "mixto", monto_inscripcion: "20000" }).datos.monto_inscripcion, 20000);

  const base = { torneo: { estado: "inscripcion" }, categoria: { monto_inscripcion: "20000.00" }, inscripcion: { estado: "pendiente", pago_estado: null } };
  assert.equal(motivoParaNoSubirComprobante(base), null);
  assert.equal(motivoParaNoSubirComprobante({ ...base, inscripcion: { estado: "esperando", pago_estado: "rechazado" } }), null, "se reemplaza uno rechazado, aunque el compañero no haya aceptado");
  assert.match(motivoParaNoSubirComprobante({ ...base, categoria: { monto_inscripcion: null } }), /no cobra/);
  assert.match(motivoParaNoSubirComprobante({ ...base, torneo: { estado: "en_juego" } }), /inscripción abierta/);
  assert.match(motivoParaNoSubirComprobante({ ...base, inscripcion: { estado: "pendiente", pago_estado: "en_revision" } }), /revisando/);
  assert.match(motivoParaNoSubirComprobante({ ...base, inscripcion: { estado: "confirmada", pago_estado: null } }), /pendiente/);
});

test("avisos por correo: textos con enlace, datos escapados y sin escribir a dominios de prueba", async () => {
  const { armarAviso, destinoValido } = await import("../src/services/common/avisos_reglas.js");
  const nueva = armarAviso("nueva_inscripcion", { torneo: "Copa <Verano>", torneoId: 4, categoria: "6ta Mixto", pareja: "Ana / Beto", estado: "pendiente" }, "https://mipadelcup.vercel.app/");
  assert.equal(nueva.subject, "MiPadel · Nueva inscripción en Copa <Verano>");
  assert.match(nueva.text, /Ana \/ Beto se anotó en 6ta Mixto\.\nQuedó pendiente/);
  assert.match(nueva.text, /https:\/\/mipadelcup\.vercel\.app\/mis-torneos\/4$/);
  const conEtiquetas = armarAviso("nueva_inscripcion", { torneo: "X", torneoId: 1, categoria: "C", pareja: "<script>x</script> / Beto", estado: "pendiente" }, "");
  assert.ok(conEtiquetas.html.includes("&lt;script&gt;") && !conEtiquetas.html.includes("<script>"), "el HTML no lleva etiquetas que escribió un usuario");
  assert.match(armarAviso("nueva_inscripcion", { torneo: "X", torneoId: 1, categoria: "C", pareja: "P", estado: "esperando" }, "").text, /Falta que el compañero acepte/);
  assert.match(armarAviso("nuevo_organizador", { nombre: "Eva Pérez", email: "eva@correo.com" }, "http://localhost:5173").text, /Eva Pérez \(eva@correo\.com\) activó su cuenta de organizador/);
  assert.throws(() => armarAviso("inventado", {}, ""), /desconocido/);
  assert.ok(destinoValido("organizador@gmail.com"));
  for (const prueba of ["organizacion.demo@example.test", "x@example.com", "a@b.test", "", null, "sin-arroba"]) assert.equal(destinoValido(prueba), false, String(prueba));
});

test("duplicar: solo los campos elegidos, nombre con tope y sin fechas", async () => {
  const { copiaDeTorneo, copiaDeCategoria } = await import("../src/services/torneos/torneo_reglas.js");
  const copia = copiaDeTorneo({ id: 4, nombre: "x".repeat(118), estado: "finalizado", fecha_inicio: "2026-07-10", sede: "Club", organizador_id: 9, campo_nuevo_privado: "no" });
  assert.equal(copia.nombre.length, 120);
  assert.deepEqual([copia.estado, copia.fecha_inicio, copia.fecha_fin, copia.sede], ["borrador", null, null, "Club"]);
  for (const campo of ["id", "organizador_id", "campo_nuevo_privado"]) assert.equal(campo in copia, false, campo);
  assert.equal("torneo_id" in copiaDeCategoria({ id: 1, torneo_id: 4, nivel: 5 }), false);
});

test("avisos al jugador: lo que guarda la campanita (título, detalle con tope y a dónde lleva)", async () => {
  const { avisoParaCampanita, armarAviso } = await import("../src/services/common/avisos_reglas.js");
  const rechazo = avisoParaCampanita("comprobante_rechazado", { torneo: "Copa", categoria: "6ta Mixto", motivo: "No se ve el monto", inscripcionId: 7 });
  assert.deepEqual([rechazo.tipo, rechazo.titulo, rechazo.ruta], ["comprobante_rechazado", "Revisá el comprobante de Copa", "/mis-inscripciones?pagar=7"]);
  assert.match(rechazo.detalle, /Motivo: No se ve el monto/);
  assert.ok(avisoParaCampanita("horarios_torneo", { torneo: "Copa", torneoId: 3, partidos: Array(40).fill("Ana / Bea vs Eli / Flor: sáb 05/12 · 18:30 · Cancha 2") }).detalle.length <= 300);
  assert.match(armarAviso("inscripcion_confirmada", { torneo: "Copa", categoria: "6ta Mixto", pago: true }, "https://web.test").text, /quedó confirmada \(pago aprobado\)/);
  assert.throws(() => avisoParaCampanita("inventado", {}), /desconocido/);
});

test("cronograma automático: turnos, sin superponer parejas, con descanso, llave después de las zonas y lo manual se respeta", async () => {
  const { validarConfigCronograma, turnosDe, armarCronograma } = await import("../src/services/torneos/cronograma_reglas.js");
  const { fixtureTodosContraTodos } = await import("../src/services/torneos/zona_reglas.js");
  const config = validarConfigCronograma({ dias: ["2026-12-06", "2026-12-05"], desde: "18:00", hasta: "23:00", minutos: 60, canchas: 2, descanso: 1 }).datos;
  assert.deepEqual(config.dias, ["2026-12-05", "2026-12-06"], "los días se ordenan");
  assert.deepEqual(turnosDe(config).slice(0, 5).map((x) => x.hora), ["18:00", "19:00", "20:00", "21:00", "22:00"]);
  assert.equal(turnosDe(config).length, 10);
  assert.match(validarConfigCronograma({ ...config, hasta: "18:30" }).error, /no entra ni un turno/);
  assert.match(validarConfigCronograma({ ...config, dias: [] }).error, /días/);
  assert.match(validarConfigCronograma({ ...config, canchas: 0 }).error, /canchas/);

  // Dos categorías: zonas de 3 (todos contra todos) y una llave de 4 (semis + final).
  let id = 0;
  const zonaDe = (categoria, zona, parejas) => fixtureTodosContraTodos(parejas).map(([a, b], orden) => ({ id: ++id, categoria_id: categoria, fase: "zona", zona_id: zona, orden, parejas: [a, b] }));
  const llaveDe = (categoria) => [
    { id: ++id, categoria_id: categoria, fase: "llave", ronda: 1, orden: 0, parejas: [null, null] },
    { id: ++id, categoria_id: categoria, fase: "llave", ronda: 1, orden: 1, parejas: [null, null] },
    { id: ++id, categoria_id: categoria, fase: "llave", ronda: 2, orden: 0, parejas: [null, null] },
  ];
  const partidos = [...zonaDe(1, 10, [1, 2, 3]), ...zonaDe(1, 11, [4, 5, 6]), ...zonaDe(2, 20, [7, 8, 9]), ...llaveDe(1)];
  const turno = (a) => turnosDe(config).findIndex((x) => x.fecha === a.fecha && x.hora === a.hora);
  const r = armarCronograma({ partidos: structuredClone(partidos), config });
  assert.deepEqual(r.sinLugar, []);
  assert.equal(r.asignados.length, partidos.length);
  const porId = new Map(r.asignados.map((a) => [a.id, a]));
  const ultimo = new Map();
  for (const a of [...r.asignados].sort((x, y) => turno(x) - turno(y))) {
    for (const p of partidos.find((x) => x.id === a.id).parejas.filter(Boolean)) {
      assert.ok(!ultimo.has(p) || turno(a) - ultimo.get(p) >= 2, `pareja ${p}: descanso de un turno`);
      ultimo.set(p, turno(a));
    }
  }
  assert.equal(new Set(r.asignados.map((a) => `${turno(a)}|${a.cancha}`)).size, r.asignados.length, "una cancha por turno");
  const finZonas = Math.max(...partidos.filter((p) => p.fase === "zona" && p.categoria_id === 1).map((p) => turno(porId.get(p.id))));
  const semis = partidos.filter((p) => p.fase === "llave" && p.ronda === 1).map((p) => turno(porId.get(p.id)));
  const final = turno(porId.get(partidos.at(-1).id));
  assert.ok(Math.min(...semis) > finZonas + 1, "la llave espera las zonas y el descanso");
  assert.ok(final > Math.max(...semis) + 1, "la final después de las semis");
  assert.deepEqual(armarCronograma({ partidos: structuredClone(partidos), config }), r, "siempre da lo mismo");

  // Lo cargado a mano se respeta: esa cancha y turno quedan tomados y la pareja 1 descansa.
  const conManual = armarCronograma({ partidos: structuredClone(partidos), config, ocupados: [{ fecha: "2026-12-05", hora: "18:00", cancha: "Cancha 1", parejas: [1, 4], categoria_id: 1, fase: "zona" }] });
  assert.ok(!conManual.asignados.some((a) => a.fecha === "2026-12-05" && a.hora === "18:00" && a.cancha === "Cancha 1"));
  assert.ok(conManual.asignados.filter((a) => partidos.find((p) => p.id === a.id).parejas.includes(1)).every((a) => turno(a) >= 2));

  // Sin lugar suficiente: lo que no entra queda listado.
  const chico = validarConfigCronograma({ dias: ["2026-12-05"], desde: "18:00", hasta: "20:00", minutos: 60, canchas: 1, descanso: 0 }).datos;
  const corto = armarCronograma({ partidos: structuredClone(partidos), config: chico });
  assert.equal(corto.asignados.length, 2);
  assert.equal(corto.sinLugar.length, partidos.length - 2);
  assert.equal(armarCronograma({ partidos: structuredClone(partidos), config: { ...config, incluir_llave: false } }).asignados.length, partidos.length - 3, "sin llave");
});

test("programación del partido: día, hora y cancha opcionales y validados", async () => {
  const { validarProgramacion } = await import("../src/services/torneos/zona_reglas.js");
  assert.deepEqual(validarProgramacion({ fecha: "2026-12-05", hora: "18:30", cancha: " Cancha 2 " }).datos, { fecha: "2026-12-05", hora: "18:30", cancha: "Cancha 2" });
  assert.deepEqual(validarProgramacion({}).datos, { fecha: null, hora: null, cancha: null }, "vacío borra la programación");
  assert.deepEqual(validarProgramacion({ fecha: "", hora: "", cancha: "" }).datos, { fecha: null, hora: null, cancha: null });
  assert.match(validarProgramacion({ fecha: "2026-02-30" }).error, /fecha válida/);
  assert.match(validarProgramacion({ hora: "24:00" }).error, /HH:MM/);
  assert.match(validarProgramacion({ hora: "9:30" }).error, /HH:MM/);
  assert.match(validarProgramacion({ cancha: "x".repeat(41) }).error, /40 caracteres/);
  assert.match(validarProgramacion({ cancha: 3 }).error, /texto/);
});

test("desempate: games a favor y después el sorteo guardado; los mejores terceros por promedio", async () => {
  const { tablaDeZona, mejoresDelPuesto, clasificacionDeCategoria } = await import("../src/services/torneos/zona_reglas.js");
  const p = (pareja1_id, pareja2_id, sets) => ({ pareja1_id, pareja2_id, sets, formato: "un_set_6", ganador_id: sets[0][0] > sets[0][1] ? pareja1_id : pareja2_id });
  // Triangular perfecto: cada una gana 6-4 y pierde 4-6. Todo igual, games a favor iguales: decide el sorteo.
  const triangular = [p(1, 2, [[6, 4]]), p(2, 3, [[6, 4]]), p(3, 1, [[6, 4]])];
  const porSorteo = tablaDeZona([1, 2, 3], triangular, 2, new Map([[1, 50], [2, 10], [3, 30]]));
  assert.deepEqual(porSorteo.filas.map((f) => [f.inscripcion_id, f.desempate]), [[2, "sorteo"], [3, "sorteo"], [1, "sorteo"]]);
  assert.deepEqual(tablaDeZona([1, 2, 3], triangular, 2, new Map([[1, 50], [2, 10], [3, 30]])).filas.map((f) => f.inscripcion_id), [2, 3, 1], "la tabla da siempre lo mismo");

  // Triangular con la misma diferencia de games (0) pero distintos games a favor: 1 y 3 hicieron 10, 2 hizo 9.
  // Entre 1 y 3 sigue el empate y decide el sorteo; 2 queda tercera por games a favor. (La tabla no valida marcadores.)
  const conGames = tablaDeZona([1, 2, 3], [p(1, 2, [[6, 3]]), p(2, 3, [[6, 3]]), p(3, 1, [[7, 4]])], 1, new Map([[1, 5], [3, 1]]));
  assert.deepEqual(conGames.filas.map((f) => [f.inscripcion_id, f.games_favor, f.desempate]), [[3, 10, "sorteo"], [1, 10, "sorteo"], [2, 9, "games_favor"]]);

  // Dos zonas de 3 (6 + 2 terceros, cuadro de 8 → con 2 zonas y clasifican 2 no faltan): probamos el ranking directo.
  const tercero = (id, pg, sf, sc, gf, gc, pj = 2) => ({ inscripcion_id: id, pg, pj, sets_favor: sf, sets_contra: sc, games_favor: gf, games_contra: gc });
  const tablas = [
    { filas: [tercero(11, 2, 2, 0, 12, 4), tercero(12, 1, 1, 1, 9, 9), tercero(13, 0, 0, 2, 4, 12)] },
    { filas: [tercero(21, 2, 2, 0, 12, 4), tercero(22, 1, 1, 1, 9, 9), tercero(23, 0, 0, 2, 6, 12)] },
    { filas: [tercero(31, 3, 3, 0, 18, 6, 3), tercero(32, 2, 2, 1, 15, 10, 3), tercero(33, 1, 1, 2, 9, 15, 3), tercero(34, 0, 0, 3, 3, 18, 3)] },
  ];
  // El tercero de la zona de 4 ganó 1 de 3 (promedio 0,33): supera a los de zonas de 3 que no ganaron.
  assert.deepEqual(mejoresDelPuesto(tablas, 3).map((m) => [m.id, m.zona]), [[33, 2], [23, 1], [13, 0]]);
  assert.equal(mejoresDelPuesto(tablas, 3)[1].desempate, null, "23 y 13 se separan por dif. de games, no hace falta desempate");

  // Categoría completa: 3 zonas de 3, clasifican 2 → 6 directos + 2 mejores terceros.
  const zona = (a, b, c, resultados) => ({ parejas: [a, b, c], partidos: [p(a, b, resultados[0]), p(a, c, resultados[1]), p(b, c, resultados[2])] });
  const categoria = clasificacionDeCategoria([
    zona(1, 2, 3, [[[6, 1]], [[6, 2]], [[6, 3]]]), zona(4, 5, 6, [[[6, 1]], [[6, 2]], [[6, 0]]]), zona(7, 8, 9, [[[6, 1]], [[6, 4]], [[6, 4]]]),
  ], 2);
  assert.equal(categoria.cupoMejores, 2);
  assert.deepEqual(categoria.mejores.map((m) => m.id), [9, 3], "los terceros que perdieron por menos");
  assert.ok(categoria.tablas[2].filas.find((f) => f.inscripcion_id === 9).mejor);
  assert.equal(categoria.tablas[1].filas.find((f) => f.inscripcion_id === 6).clasificado, false);
  const incompleta = clasificacionDeCategoria([zona(1, 2, 3, [[[6, 1]], [[6, 2]], [[6, 3]]]), { parejas: [4, 5, 6], partidos: [] }, zona(7, 8, 9, [[[6, 1]], [[6, 4]], [[6, 4]]])], 2);
  assert.deepEqual([incompleta.cupoMejores, incompleta.mejores], [2, []], "los mejores terceros se definen con todas las zonas terminadas");
});

test("llave con mejores terceros: entran en las últimas semillas y nadie cruza a su zona en primera ronda", async () => {
  const { armarLlave, partidosDeLlave } = await import("../src/services/torneos/llave_reglas.js");
  // 7 zonas: 14 directos + 2 mejores terceros = octavos completos.
  const zonas = Array.from({ length: 7 }, (_, z) => ({ nombre: String(z), clasificados: [(z + 1) * 100 + 1, (z + 1) * 100 + 2] }));
  const mejores = [{ id: 303, zona: 2 }, { id: 603, zona: 5 }];
  const llave = armarLlave(zonas, mejores);
  assert.equal(llave.tamanio, 16);
  assert.equal(llave.slots.filter((x) => x === null).length, 0, "sin pases");
  const zonaDe = (id) => Math.floor(id / 100);
  for (const partido of partidosDeLlave(llave).filter((x) => x.ronda === 1)) {
    assert.notEqual(zonaDe(partido.pareja1), zonaDe(partido.pareja2), `${partido.pareja1} vs ${partido.pareja2}`);
  }
  // Los terceros enfrentan a los dos mejores primeros (semillas 15 y 16 contra 2 y 1).
  const rivalDe = (id) => { const i = llave.slots.indexOf(id); return llave.slots[i ^ 1]; };
  assert.deepEqual([rivalDe(303), rivalDe(603)].sort(), [101, 201]);
});

test("cálculo de la llave: lo que ve el organizador coincide con el sorteo y la llave reales", async () => {
  const { planDeLlave, zonasIguales, cuposConZonasIguales, llaveJusta } = await import("../../torneo_config.js");
  const { armarZonas } = await import("../src/services/torneos/zona_reglas.js");
  const { armarLlave, partidosDeLlave } = await import("../src/services/torneos/llave_reglas.js");
  assert.deepEqual(planDeLlave(20, 3, 2), { zonas: [4, 4, 3, 3, 3, 3], clasificados: 12, llave: { tamanio: 16, mejores: 4, pases: 0, puestoMejores: 3, primeraRonda: "Octavos de final" } });
  assert.deepEqual(planDeLlave(21, 3, 2).llave, { tamanio: 16, mejores: 2, pases: 0, puestoMejores: 3, primeraRonda: "Octavos de final" }, "21: los 2 mejores terceros completan los octavos");
  assert.ok(llaveJusta(planDeLlave(24, 3, 2)), "24 parejas llenan los octavos justos");
  assert.deepEqual(planDeLlave(15, 3, 2).llave, { tamanio: 16, mejores: 5, pases: 1, puestoMejores: 3, primeraRonda: "Octavos de final" }, "si no alcanzan los terceros, queda un pase");
  assert.equal(planDeLlave(9, 3, 1).llave.puestoMejores, 2, "clasifica 1: completan los mejores segundos");
  assert.equal(planDeLlave(27, 3, 2).llave.primeraRonda, "16avos de final");
  assert.equal(planDeLlave(5, 3, 1).llave, null, "una sola zona y clasifica 1: no hay llave");
  assert.equal(planDeLlave(1, 3, 2), null);
  assert.equal(zonasIguales(planDeLlave(20, 3, 2)), false, "20 en zonas de 3: quedan 2 de 4");
  assert.deepEqual(cuposConZonasIguales(3, 5), [6, 9, 12, 15]);
  for (const ppz of [3, 4, 5]) {
    for (const n of cuposConZonasIguales(ppz)) assert.ok(zonasIguales(planDeLlave(n, ppz, 2)), `${n} en zonas de ${ppz}`);
  }
  for (let n = 2; n <= 60; n += 1) {
    for (const ppz of [3, 4, 5]) {
      for (const c of [1, 2]) {
        const plan = planDeLlave(n, ppz, c);
        const parejas = Array.from({ length: n }, (_, i) => ({ id: i + 1, cabeza_de_serie: false }));
        const zonas = armarZonas(parejas, ppz, () => 0.5);
        assert.deepEqual(zonas.map((z) => z.parejas.length).sort(), [...plan.zonas].sort(), `${n}/${ppz}/${c}: zonas`);
        const mejores = zonas.map((z, zona) => ({ id: z.parejas[c], zona })).filter((m) => m.id).slice(0, plan.llave?.mejores ?? 0);
        const llave = armarLlave(zonas.map((z) => ({ nombre: z.nombre, clasificados: z.parejas.slice(0, c) })), mejores);
        assert.equal(plan.llave?.tamanio ?? null, llave.tamanio ?? null, `${n}/${ppz}/${c}: tamaño de la llave`);
        if (plan.llave) assert.equal(llave.slots.filter((x) => x === null).length, plan.llave.pases, `${n}/${ppz}/${c}: pases`);
        if (llave.slots && zonas.length > 1) {
          const zonaDe = new Map(zonas.flatMap((z, i) => z.parejas.map((id) => [id, i])));
          for (const x of partidosDeLlave(llave).filter((m) => m.ronda === 1 && m.pareja1 && m.pareja2)) {
            assert.notEqual(zonaDe.get(x.pareja1), zonaDe.get(x.pareja2), `${n}/${ppz}/${c}: misma zona en primera ronda`);
          }
        }
      }
    }
  }
});

test("llave: de 1 a 8 zonas, con 1 o 2 clasificados, todos entran una vez y ningún 2º cruza a su 1º en primera ronda", async () => {
  const { armarLlave, partidosDeLlave, potenciaDeDos } = await import("../src/services/torneos/llave_reglas.js");
  for (let cantidadZonas = 1; cantidadZonas <= 8; cantidadZonas += 1) {
    for (const clasifican of [1, 2]) {
      if (cantidadZonas * clasifican < 2) continue;
      const zonas = Array.from({ length: cantidadZonas }, (_, z) => ({ nombre: String(z), clasificados: Array.from({ length: clasifican }, (_, k) => (z + 1) * 100 + k + 1) }));
      const llave = armarLlave(zonas);
      const etiqueta = `${cantidadZonas} zonas × ${clasifican}`;
      assert.equal(llave.tamanio, potenciaDeDos(cantidadZonas * clasifican), etiqueta);
      assert.deepEqual(llave.slots.filter(Boolean).sort((a, b) => a - b), zonas.flatMap((z) => z.clasificados).sort((a, b) => a - b), `${etiqueta}: están todos`);
      const zonaDe = (id) => Math.floor(id / 100);
      for (const p of partidosDeLlave(llave).filter((x) => x.ronda === 1)) {
        if (cantidadZonas > 1) assert.notEqual(zonaDe(p.pareja1), zonaDe(p.pareja2), `${etiqueta}: misma zona en primera ronda`);
      }
      // Con zonas en cantidad par, el 1º y el 2º de cada zona quedan en mitades opuestas (solo se cruzan en la final).
      if (clasifican === 2 && cantidadZonas % 2 === 0) {
        const mitad = (id) => (llave.slots.indexOf(id) < llave.tamanio / 2 ? 0 : 1);
        for (const z of zonas) assert.notEqual(mitad(z.clasificados[0]), mitad(z.clasificados[1]), `${etiqueta}: zona ${z.nombre}`);
      }
      // Los pases van a los 1º en orden de zona.
      const pases = llave.tamanio - cantidadZonas * clasifican;
      const conPase = [];
      for (let i = 0; i < llave.tamanio; i += 2) if (!llave.slots[i] || !llave.slots[i + 1]) conPase.push(llave.slots[i] ?? llave.slots[i + 1]);
      assert.equal(conPase.length, pases, etiqueta);
      // Si hay más pases que zonas, sobran para algunos 2º; los 1º los reciben todos primero.
      for (const z of zonas.slice(0, Math.min(pases, cantidadZonas))) assert.ok(conPase.includes(z.clasificados[0]), `${etiqueta}: el 1º de ${z.nombre} pasa sin jugar`);
    }
  }
});

test("llave: el ganador avanza al lugar correcto y el podio sale de la final y las semis", async () => {
  const { destinoDelGanador, podio } = await import("../src/services/torneos/llave_reglas.js");
  assert.deepEqual(destinoDelGanador({ ronda: 1, orden: 0 }, 3), { ronda: 2, orden: 0, lado: "pareja1_id" });
  assert.deepEqual(destinoDelGanador({ ronda: 1, orden: 3 }, 3), { ronda: 2, orden: 1, lado: "pareja2_id" });
  assert.deepEqual(destinoDelGanador({ ronda: 2, orden: 1 }, 3), { ronda: 3, orden: 0, lado: "pareja2_id" });
  assert.equal(destinoDelGanador({ ronda: 3, orden: 0 }, 3), null, "la final no avanza");
  const partidos = [
    { ronda: 2, orden: 0, pareja1_id: 1, pareja2_id: 4, ganador_id: 1 },
    { ronda: 2, orden: 1, pareja1_id: 2, pareja2_id: 3, ganador_id: 3 },
    { ronda: 3, orden: 0, pareja1_id: 1, pareja2_id: 3, ganador_id: 3 },
  ];
  assert.deepEqual(podio(partidos, 3), { campeon: 3, subcampeon: 1, semifinalistas: [4, 2] });
  assert.deepEqual(podio(partidos.slice(0, 2), 3), { campeon: null, subcampeon: null, semifinalistas: [4, 2] }, "sin final jugada no hay campeón");
});

test("código de jugador: formato MP-XXXXX sin letras confusas y se acepta escrito de varias formas", async () => {
  const { generarCodigoJugador, normalizarCodigoJugador } = await import("../src/services/common/codigo_jugador.js");
  for (let i = 0; i < 200; i += 1) assert.match(generarCodigoJugador(), /^MP-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}$/);
  assert.equal(generarCodigoJugador(() => 0), "MP-22222", "el azar es inyectable");
  for (const escrito of ["MP-7K3QX", "mp-7k3qx", " 7k3qx ", "MP7K3QX", "mp 7k3qx"]) assert.equal(normalizarCodigoJugador(escrito), "MP-7K3QX", escrito);
  for (const malo of ["MP-7K3Q", "MP-7K3QXX", "MP-0O1IL", "7K3Q!", "", null, 12345]) assert.equal(normalizarCodigoJugador(malo), null, String(malo));
});

test("inscripción online: con nombre del compañero o con su código (que se normaliza)", async () => {
  const { validarInscripcionOnline } = await import("../src/services/torneos/inscripcion_reglas.js");
  assert.deepEqual(validarInscripcionOnline({ categoria_id: 3, codigo_companiero: "mp-7k3qx", jugador2_nombre: "Ignorado" }).datos,
    { categoria_id: 3, codigo_companiero: "MP-7K3QX", telefono: null, nota: null }, "con código se ignora el nombre");
  assert.match(validarInscripcionOnline({ categoria_id: 3, codigo_companiero: "XYZ" }).error, /MP-XXXXX/);
  assert.equal(validarInscripcionOnline({ categoria_id: 3, codigo_companiero: "", jugador2_nombre: "Juan Pérez" }).datos.jugador2_nombre, "Juan Pérez");
});

test("historial: puesto alcanzado por ronda de llave y resumen con títulos, finales y mejor puesto", async () => {
  const { puestoAlcanzado, resumirHistorial } = await import("../src/services/jugadores/jugador_reglas.js");
  assert.equal(puestoAlcanzado({ rondas: 3, alcanzada: 3, campeon: true }), "campeon");
  assert.equal(puestoAlcanzado({ rondas: 3, alcanzada: 3, campeon: false }), "final");
  assert.equal(puestoAlcanzado({ rondas: 3, alcanzada: 2, campeon: false }), "semifinal");
  assert.equal(puestoAlcanzado({ rondas: 3, alcanzada: 1, campeon: false }), "cuartos");
  assert.equal(puestoAlcanzado({ rondas: 5, alcanzada: 1, campeon: false }), "llave", "en llaves grandes, más allá de octavos");
  assert.equal(puestoAlcanzado({ rondas: 3, alcanzada: null, campeon: false }), "zona", "no llegó a la llave");
  assert.equal(puestoAlcanzado({ rondas: null, alcanzada: null, campeon: false }), "zona", "la categoría todavía no tiene llave");
  const resumen = resumirHistorial([
    { torneo_id: 1, puesto: "semifinal" }, { torneo_id: 1, puesto: "campeon" }, { torneo_id: 2, puesto: "final" }, { torneo_id: 3, puesto: "zona" },
  ]);
  assert.deepEqual(resumen, { torneos: 3, titulos: 1, finales: 2, mejor_puesto: "campeon" }, "dos categorías del mismo torneo cuentan un torneo");
  assert.deepEqual(resumirHistorial([]), { torneos: 0, titulos: 0, finales: 0, mejor_puesto: null });
});
