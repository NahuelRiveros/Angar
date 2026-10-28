import { Buffer } from "node:buffer";
import { test, expect } from "@playwright/test";
import { permisosConfig, permisosEfectivos } from "../../../permisos_config.js";

const porDefecto = (rol) => permisosConfig.permisos.filter((p) => p.porDefecto.includes(rol)).map((p) => p.codigo);
const conPermisos = (usuario) => ({ ...usuario, permisos: permisosEfectivos(usuario.roles, usuario.roles.flatMap(porDefecto)) });
const SOLO_MP = { mercadopago: true, transferencia: null };
const DATOS_BANCO = { titular: "Titular EJEMPLO", banco: "Banco EJEMPLO", cbu: "0000003100000000000001", alias: "MIPADEL.EJEMPLO", cuit: "20-00000000-0" };
const PLAN_BASE = { es_organizador: true, fecha_inicio: "2026-10-01", en_prueba: false, vigente: true, precio_mensual: 15000, dias_por_pago: 30, medios_pago: SOLO_MP, ultima_transferencia: null };
const PLAN_POR_VENCER = { ...PLAN_BASE, fecha_vencimiento: "2026-10-31", estado: "por_vencer", dias_restantes: 5, mensaje: "Tu plan vence en 5 días. Renovalo para no quedar en solo lectura." };

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

/** Sesión iniciada con esos roles; `rutas` responde por "MÉTODO /ruta" y el resto devuelve vacío. */
async function entrarComo(page, roles, rutas = {}) {
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  const pedidos = [];
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const clave = `${request.method()} ${url.pathname.replace(/^\/api/, "")}`;
    let body = null;
    try { body = request.postDataJSON(); } catch { /* multipart (comprobante): no es JSON */ }
    pedidos.push({ clave, query: Object.fromEntries(url.searchParams), body });
    if (clave === "GET /auth/me") return route.fulfill({ json: { ok: true, usuario: conPermisos({ usuario_id: 8, nombre: "Eva", roles: typeof roles === "function" ? roles() : roles }) } });
    const respuesta = rutas[clave];
    if (respuesta) return typeof respuesta === "function" ? respuesta(route, request) : route.fulfill({ json: respuesta });
    return route.fulfill({ json: { ok: true, data: [], textos: {}, pilares: [], contactos: [] } });
  });
  return pedidos;
}

test("un jugador activa su cuenta de organizador y empieza la prueba de 14 días", async ({ page }, info) => {
  let roles = ["jugador"];
  let plan = { es_organizador: false, dias_prueba: 14, precio_mensual: 15000, dias_por_pago: 30 };
  const pedidos = await entrarComo(page, () => roles, {
    "GET /suscripcion/mia": () => ({ ok: true, data: plan }),
    "POST /suscripcion/empezar": (route) => {
      roles = ["jugador", "organizador"];
      plan = { ...PLAN_BASE, en_prueba: true, fecha_vencimiento: "2026-11-09", estado: "prueba", dias_restantes: 14, mensaje: "Prueba gratis: te quedan 14 días." };
      return route.fulfill({ status: 201, json: { ok: true, mensaje: "¡Listo! Empezó tu prueba gratis.", data: plan } });
    },
  });
  // Las respuestas que dependen del momento se calculan en cada pedido.
  await page.route("**/api/suscripcion/mia", (route) => route.fulfill({ json: { ok: true, data: plan } }));

  await page.goto("/");
  // En escritorio está en el menú "Mi cuenta"; en celular, en el menú ☰.
  await page.getByRole("button", { name: info.project.name === "desktop" ? "Mi cuenta" : "Abrir menú" }).click();
  await page.getByRole("link", { name: "Organizar torneos" }).locator("visible=true").first().click();
  await expect(page).toHaveURL(/\/mi-suscripcion$/);
  await expect(page.getByRole("heading", { name: "Organizá tus torneos" })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("empezar.png"), fullPage: true });

  await page.getByRole("button", { name: "Empezar prueba gratis de 14 días" }).click();
  await expect(page.getByText("Prueba gratis", { exact: true })).toBeVisible();
  await expect(page.getByText("Prueba gratis: te quedan 14 días.")).toBeVisible();
  await expect(page.getByText("09/11/2026")).toBeVisible();
  await expect(page.getByText("Todavía no hay pagos")).toBeVisible();
  expect(pedidos.filter((p) => p.clave === "POST /suscripcion/empezar")).toHaveLength(1);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("prueba.png"), fullPage: true });
});

test("plan por vencer: aviso en el sitio, se cierra, y pagar lleva a MercadoPago", async ({ page }, info) => {
  const pedidos = await entrarComo(page, ["jugador", "organizador"], {
    "GET /suscripcion/mia": { ok: true, data: PLAN_POR_VENCER },
    "GET /suscripcion/mia/pagos": { ok: true, data: [{ id: 1, origen: "mercadopago", estado: "aprobado", monto: "15000.00", dias: 30, vencimiento_anterior: "2026-10-01", vencimiento_nuevo: "2026-10-31", nota: null, creado_en: "2026-10-01T23:30:00.000Z" }] },
    "POST /suscripcion/pagar": { ok: true, data: { preference_id: "pref-1", url_pago: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-1" } },
  });
  await page.route("https://www.mercadopago.com.ar/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Checkout de prueba</h1>" }));

  await page.goto("/");
  const aviso = page.getByRole("status").filter({ hasText: "Tu plan vence en 5 días" });
  await expect(aviso).toBeVisible();
  await noOverflow(page);
  await aviso.getByRole("button", { name: "Cerrar aviso" }).click();
  await expect(aviso).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Tu plan vence en 5 días")).toHaveCount(0);

  await page.goto("/mi-suscripcion");
  await expect(page.getByText("Por vencer", { exact: true })).toBeVisible();
  await expect(page.getByText("$ 15.000").first()).toBeVisible();
  // 23:30 UTC del 01/10 es el 01/10 en Argentina, no el 02/10.
  await expect(page.getByText(/^01\/10\/2026 · \+30 días/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("por_vencer.png"), fullPage: true });
  await page.getByRole("button", { name: "Pagar con MercadoPago" }).click();
  await expect(page).toHaveURL(/mercadopago\.com\.ar\/checkout/);
  expect(pedidos.filter((p) => p.clave === "POST /suscripcion/pagar")).toHaveLength(1);
});

test("la vuelta de MercadoPago informa el resultado y un error al pagar se muestra sin salir de la página", async ({ page }) => {
  await entrarComo(page, ["organizador"], {
    "GET /suscripcion/mia": { ok: true, data: { ...PLAN_POR_VENCER, estado: "vencido", vigente: false, dias_restantes: 0, mensaje: "Tu plan venció: podés ver tus torneos pero no crear ni editar. Renovalo para seguir organizando." } },
    "POST /suscripcion/pagar": (route) => route.fulfill({ status: 503, json: { ok: false, codigo: "PAGOS_NO_CONFIGURADOS", mensaje: "Los pagos con MercadoPago todavía no están habilitados. Escribinos para renovar." } }),
  });
  await page.goto("/mi-suscripcion?pago=rechazado");
  await expect(page.getByText("El pago no se completó. No se te cobró nada")).toBeVisible();
  await expect(page.getByText("Venció el")).toBeVisible();
  await page.getByRole("button", { name: "Pagar con MercadoPago" }).click();
  await expect(page.getByRole("alert")).toContainText("todavía no están habilitados");
  await expect(page).toHaveURL(/\/mi-suscripcion/);
});

test("si no carga el plan, se puede reintentar", async ({ page }) => {
  let fallar = true;
  await entrarComo(page, ["jugador"], {
    "GET /suscripcion/mia": (route) => (fallar ? route.fulfill({ status: 500, json: { ok: false, mensaje: "No pudimos cargar tu plan." } })
      : route.fulfill({ json: { ok: true, data: { es_organizador: false, dias_prueba: 14, precio_mensual: 15000, dias_por_pago: 30 } } })),
  });
  await page.goto("/mi-suscripcion");
  await expect(page.getByRole("alert")).toContainText("No pudimos cargar tu plan.");
  fallar = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("heading", { name: "Organizá tus torneos" })).toBeVisible();
});

const LISTA = {
  ok: true, page: 1, limit: 20, total: 2, totalPages: 1,
  resumen: { vencido: 1, prueba: 0, por_vencer: 0, activo: 1 },
  data: [
    { usuario_id: 5, nombre: "Beto", apellido: "Pérez", email: "beto@example.test", fecha_inicio: "2026-09-01", fecha_vencimiento: "2026-10-20", en_prueba: false, estado: "vencido", vigente: false, dias_restantes: 0 },
    { usuario_id: 4, nombre: "Ana", apellido: "Gómez", email: "ana@example.test", fecha_inicio: "2026-09-01", fecha_vencimiento: "2026-12-10", en_prueba: false, estado: "activo", vigente: true, dias_restantes: 44 },
  ],
};

test("panel: el admin filtra organizadores, ve el historial y suma días con nota", async ({ page }, info) => {
  const pedidos = await entrarComo(page, ["admin"], {
    "GET /suscripcion/admin": LISTA,
    "GET /suscripcion/admin/5/pagos": { ok: true, data: [{ id: 3, origen: "manual", estado: "aprobado", monto: null, dias: 10, vencimiento_anterior: "2026-10-10", vencimiento_nuevo: "2026-10-20", nota: "Transferencia", creado_en: "2026-10-10T15:00:00Z" }] },
    "POST /suscripcion/admin/5/extender": { ok: true, mensaje: "Se sumaron 15 día(s). Vence el 2026-11-11.", data: {} },
  });
  await page.goto("/admin/suscripciones");
  await expect(page.getByRole("heading", { name: "Suscripciones" })).toBeVisible();
  await expect(page.getByText("beto@example.test").locator("visible=true").first()).toBeVisible();
  await page.getByRole("button", { name: "Vencido (1)" }).click();
  await expect.poll(() => pedidos.some((p) => p.clave === "GET /suscripcion/admin" && p.query.estado === "vencido")).toBeTruthy();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("suscripciones.png"), fullPage: true });

  await page.getByRole("button", { name: "Historial" }).locator("visible=true").first().click();
  const historial = page.getByRole("dialog", { name: /Historial · Beto Pérez/ });
  await expect(historial.getByText("Transferencia")).toBeVisible();
  await expect(historial.getByText("20/10/2026")).toBeVisible();
  await historial.getByRole("button", { name: "Cerrar" }).click();

  await page.getByRole("button", { name: "Sumar días" }).locator("visible=true").first().click();
  const modal = page.getByRole("dialog", { name: /Sumar días · Beto Pérez/ });
  await modal.getByLabel("Días a sumar").fill("0");
  await modal.getByRole("button", { name: "Sumar días" }).click();
  await expect(modal.getByText("Mínimo 1 día.")).toBeVisible();
  expect(pedidos.filter((p) => p.clave.startsWith("POST"))).toHaveLength(0);
  await modal.getByLabel("Días a sumar").fill("15");
  await modal.getByLabel("Nota (opcional)").fill("Transferencia del 27/10");
  await page.screenshot({ path: info.outputPath("sumar_dias.png") });
  await modal.getByRole("button", { name: "Sumar días" }).click();
  await expect(page.getByText("Se sumaron 15 día(s).")).toBeVisible();
  await expect(modal).toHaveCount(0);
  expect(pedidos.filter((p) => p.clave === "POST /suscripcion/admin/5/extender").map((p) => p.body)).toEqual([{ dias: 15, nota: "Transferencia del 27/10" }]);
});

test("panel: soporte ve las suscripciones pero no puede sumar días; un jugador no entra", async ({ page }) => {
  await entrarComo(page, ["soporte"], { "GET /suscripcion/admin": LISTA });
  await page.goto("/admin/suscripciones");
  await expect(page.getByText("ana@example.test").locator("visible=true").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Historial" }).locator("visible=true").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sumar días" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Fijar fecha" })).toHaveCount(0);
});

test("panel: un jugador que entra a /admin/suscripciones vuelve al inicio", async ({ page }) => {
  await entrarComo(page, ["jugador"]);
  await page.goto("/admin/suscripciones");
  await expect(page).not.toHaveURL(/\/admin\/suscripciones/);
});

const PDF = { name: "comprobante.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n%prueba\n") };

test("transferencia: el organizador ve los datos, copia el CBU y envía el comprobante; queda en revisión", async ({ page, context }, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  let plan = { ...PLAN_POR_VENCER, medios_pago: { mercadopago: false, transferencia: DATOS_BANCO } };
  const pedidos = await entrarComo(page, ["organizador"], {
    "POST /suscripcion/transferencia": (route) => {
      plan = { ...plan, ultima_transferencia: { id: 9, estado: "pendiente", motivo_rechazo: null, creado_en: "2026-10-27T15:00:00Z" } };
      return route.fulfill({ status: 201, json: { ok: true, mensaje: "¡Recibimos tu comprobante! Te avisamos apenas confirmemos la transferencia.", data: { id: 9, estado: "pendiente" } } });
    },
  });
  await page.route("**/api/suscripcion/mia", (route) => route.fulfill({ json: { ok: true, data: plan } }));
  await page.goto("/mi-suscripcion");
  await expect(page.getByRole("heading", { name: "Pagar por transferencia" })).toBeVisible();
  await expect(page.getByText("MIPADEL.EJEMPLO")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar con MercadoPago" })).toHaveCount(0);
  await page.getByRole("button", { name: "Copiar CBU / CVU" }).click();
  await expect(page.getByText("CBU / CVU copiado")).toBeVisible();
  if (info.project.name === "desktop") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(DATOS_BANCO.cbu);

  await page.getByRole("button", { name: "Enviar comprobante" }).click();
  await expect(page.getByText("Adjuntá el comprobante.")).toBeVisible();
  await page.getByLabel(/^Comprobante/).setInputFiles({ name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("hola") });
  await page.getByRole("button", { name: "Enviar comprobante" }).click();
  await expect(page.getByText("Tiene que ser una foto (JPG, PNG o WEBP) o un PDF.")).toBeVisible();
  expect(pedidos.filter((p) => p.clave === "POST /suscripcion/transferencia")).toHaveLength(0);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("transferencia.png"), fullPage: true });

  await page.getByLabel(/^Comprobante/).setInputFiles(PDF);
  await page.getByLabel("Nota (opcional)").fill("Desde la cuenta del club");
  const envio = page.waitForRequest((r) => r.url().endsWith("/api/suscripcion/transferencia"));
  await page.getByRole("button", { name: "Enviar comprobante" }).click();
  const cuerpo = (await envio).postDataBuffer().toString("latin1");
  expect(cuerpo).toContain(`name="comprobante"; filename="comprobante.pdf"`);
  expect(cuerpo).toContain("Desde la cuenta del club");
  await expect(page.getByText(/Recibimos tu comprobante del 27\/10\/2026/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar comprobante" })).toHaveCount(0);
});

test("transferencia rechazada: el organizador ve el motivo y puede mandar otro comprobante", async ({ page }) => {
  await entrarComo(page, ["organizador"], {
    "GET /suscripcion/mia": { ok: true, data: { ...PLAN_POR_VENCER, medios_pago: { mercadopago: false, transferencia: DATOS_BANCO }, ultima_transferencia: { id: 4, estado: "rechazado", motivo_rechazo: "El monto no coincide", creado_en: "2026-10-20T15:00:00Z" } } },
  });
  await page.goto("/mi-suscripcion");
  await expect(page.getByRole("alert")).toContainText("El monto no coincide");
  await expect(page.getByRole("button", { name: "Enviar comprobante" })).toBeVisible();
});

test("sin datos bancarios ni MercadoPago, el organizador ve que tiene que escribirnos", async ({ page }) => {
  await entrarComo(page, ["organizador"], { "GET /suscripcion/mia": { ok: true, data: { ...PLAN_POR_VENCER, medios_pago: { mercadopago: false, transferencia: null } } } });
  await page.goto("/mi-suscripcion");
  await expect(page.getByText("Los medios de pago todavía no están cargados")).toBeVisible();
});

const TRANSFERENCIAS = {
  ok: true, page: 1, limit: 20, total: 2, totalPages: 1, pendientes: 2,
  data: [
    { id: 31, usuario_id: 5, estado: "pendiente", monto: "15000.00", nota: "Desde Galicia", motivo_rechazo: null, comprobante_formato: "pdf", creado_en: "2026-10-26T13:00:00Z", nombre: "Beto", apellido: "Pérez", email: "beto@example.test", fecha_vencimiento: "2026-10-20" },
    { id: 32, usuario_id: 4, estado: "pendiente", monto: "15000.00", nota: null, motivo_rechazo: null, comprobante_formato: "jpg", creado_en: "2026-10-27T13:00:00Z", nombre: "Ana", apellido: "Gómez", email: "ana@example.test", fecha_vencimiento: "2026-12-10" },
  ],
};

test("inicio del panel: el admin ve organizadores por estado y revisa los comprobantes sin salir", async ({ page }, info) => {
  const pedidos = await entrarComo(page, ["admin"], {
    "GET /suscripcion/admin": LISTA,
    "GET /suscripcion/admin/transferencias": TRANSFERENCIAS,
    "POST /suscripcion/admin/transferencias/31/aprobar": { ok: true, mensaje: "Transferencia aprobada: el plan vence el 2026-11-25.", data: {} },
  });
  await page.goto("/panel");
  await expect(page.getByRole("link", { name: "Transferencias para revisar: 2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pagando al día: 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vencidos: 1" })).toBeVisible();
  const comprobantes = page.getByRole("region", { name: "Comprobantes de transferencia" });
  await expect(comprobantes.getByText("“Desde Galicia”")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("panel_inicio.png"), fullPage: true });

  await comprobantes.getByRole("listitem").filter({ hasText: "Beto Pérez" }).getByRole("button", { name: "Aprobar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("Transferencia aprobada")).toBeVisible();
  expect(pedidos.filter((x) => x.clave.startsWith("POST")).map((x) => x.clave)).toEqual(["POST /suscripcion/admin/transferencias/31/aprobar"]);

  await page.getByRole("link", { name: "Vencidos: 1" }).click();
  await expect(page).toHaveURL(/\/admin\/suscripciones\?estado=vencido$/);
  await expect.poll(() => pedidos.some((x) => x.clave === "GET /suscripcion/admin" && x.query.estado === "vencido")).toBeTruthy();
});

test("inicio del panel: el super admin ve cuántos usuarios hay y los últimos (solo nombre y fecha); un admin no", async ({ page, browser }, info) => {
  const REGISTRADOS = { ok: true, page: 1, limit: 10, total: 12, totalPages: 2, resumen: { total: 12, ultimos_7: 3, ultimos_30: 8 },
    data: [{ id: 40, nombre: "Lucía", apellido: "Gómez", creado_en: "2026-10-28T15:00:00Z" }, { id: 39, nombre: "Pedro", apellido: "Sosa", creado_en: "2026-10-27T13:00:00Z" }] };
  const pedidos = await entrarComo(page, ["super_admin"], { "GET /suscripcion/admin": LISTA, "GET /suscripcion/admin/transferencias": TRANSFERENCIAS, "GET /admin/registrados": REGISTRADOS });
  await page.goto("/panel");
  const usuarios = page.getByRole("region", { name: "Usuarios" });
  await expect(usuarios.getByLabel("Usuarios registrados: 12")).toBeVisible();
  await expect(usuarios.getByLabel("Nuevos en 7 días: 3")).toBeVisible();
  await expect(usuarios.getByText("Lucía Gómez")).toBeVisible();
  await expect(usuarios.getByText("28/10/2026")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("panel_registrados.png"), fullPage: true });
  await usuarios.getByRole("button", { name: "Siguiente" }).click();
  await expect.poll(() => pedidos.some((x) => x.clave === "GET /admin/registrados" && x.query.page === "2")).toBeTruthy();

  const otra = await browser.newPage();
  const pedidosAdmin = await entrarComo(otra, ["admin"], { "GET /suscripcion/admin": LISTA, "GET /suscripcion/admin/transferencias": TRANSFERENCIAS });
  await otra.goto("/panel");
  await expect(otra.getByRole("region", { name: "Organizadores y pagos" })).toBeVisible();
  await expect(otra.getByRole("region", { name: "Usuarios" })).toHaveCount(0);
  expect(pedidosAdmin.some((x) => x.clave === "GET /admin/registrados")).toBe(false);
  await otra.close();
});

test("inicio del panel: si no carga el resumen se puede reintentar", async ({ page }) => {
  let fallar = true;
  await entrarComo(page, ["admin"], {
    "GET /suscripcion/admin": (route) => (fallar ? route.fulfill({ status: 500, json: { ok: false, mensaje: "No pudimos cargar el resumen." } }) : route.fulfill({ json: LISTA })),
    "GET /suscripcion/admin/transferencias": TRANSFERENCIAS,
  });
  await page.goto("/panel");
  await expect(page.getByText("No pudimos cargar el resumen.").first()).toBeVisible({ timeout: 15000 });
  fallar = false;
  await page.getByRole("button", { name: "Reintentar" }).first().click();
  await expect(page.getByRole("link", { name: "Pagando al día: 1" })).toBeVisible();
});

test("panel: el admin abre el comprobante, aprueba una transferencia y rechaza otra con motivo", async ({ page, context }, info) => {
  const pedidos = await entrarComo(page, ["admin"], {
    "GET /suscripcion/admin": LISTA,
    "GET /suscripcion/admin/transferencias": TRANSFERENCIAS,
    "GET /suscripcion/comprobantes/31": { ok: true, data: { url: "https://res.cloudinary.test/firmado/31.pdf", formato: "pdf" } },
    "POST /suscripcion/admin/transferencias/31/aprobar": { ok: true, mensaje: "Transferencia aprobada: el plan vence el 2026-11-25.", data: {} },
    "POST /suscripcion/admin/transferencias/32/rechazar": { ok: true, mensaje: "Transferencia rechazada. El organizador ve el motivo en su plan." },
  });
  await context.route("https://res.cloudinary.test/**", (route) => route.fulfill({ contentType: "text/plain", body: "comprobante" }));
  await page.goto("/admin/suscripciones");
  await page.getByRole("tab", { name: "Transferencias (2)" }).click();
  await expect(page.getByText("“Desde Galicia”")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("transferencias.png"), fullPage: true });

  const tarjetaBeto = page.getByRole("listitem").filter({ hasText: "Beto Pérez" });
  const pestania = context.waitForEvent("page");
  await tarjetaBeto.getByRole("button", { name: "Ver comprobante" }).click();
  await expect(await pestania).toHaveURL("https://res.cloudinary.test/firmado/31.pdf");

  await tarjetaBeto.getByRole("button", { name: "Aprobar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("Transferencia aprobada")).toBeVisible();

  await page.getByRole("listitem").filter({ hasText: "Ana Gómez" }).getByRole("button", { name: "Rechazar" }).click();
  const modal = page.getByRole("dialog", { name: /Rechazar · Ana Gómez/ });
  await modal.getByRole("button", { name: "Rechazar transferencia" }).click();
  await expect(modal.getByText("Contale el motivo")).toBeVisible();
  await modal.getByLabel("Motivo").fill("No llegó el dinero");
  await modal.getByRole("button", { name: "Rechazar transferencia" }).click();
  await expect(page.getByText("Transferencia rechazada.")).toBeVisible();
  expect(pedidos.filter((p) => p.clave.startsWith("POST")).map((p) => [p.clave, p.body])).toEqual([
    ["POST /suscripcion/admin/transferencias/31/aprobar", null],
    ["POST /suscripcion/admin/transferencias/32/rechazar", { motivo: "No llegó el dinero" }],
  ]);
});

test("panel: soporte ve las transferencias y el comprobante, pero no aprueba ni rechaza", async ({ page }) => {
  await entrarComo(page, ["soporte"], { "GET /suscripcion/admin": LISTA, "GET /suscripcion/admin/transferencias": TRANSFERENCIAS });
  await page.goto("/admin/suscripciones");
  await page.getByRole("tab", { name: /Transferencias/ }).click();
  await expect(page.getByRole("button", { name: "Ver comprobante" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprobar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Rechazar" })).toHaveCount(0);
});
