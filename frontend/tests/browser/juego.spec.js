import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { EDICION_POR_ESTADO, TRANSICIONES } from "../../../torneo_config.js";

const PLAN = { es_organizador: true, vigente: true, estado: "activo", dias_restantes: 20, mensaje: "Plan activo.", medios_pago: { mercadopago: false, transferencia: null } };

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

/** Sesión opcional; `rutas` responde por "MÉTODO /ruta" (función o JSON). */
async function api(page, { roles = null, rutas = {} } = {}) {
  if (roles) await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  const pedidos = [];
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const clave = `${request.method()} ${new URL(request.url()).pathname.replace(/^\/api/, "")}`;
    let body = null;
    try { body = request.postDataJSON(); } catch { /* sin cuerpo */ }
    pedidos.push({ clave, body, autenticado: Boolean(request.headers().authorization) });
    if (clave === "GET /auth/me") return roles ? route.fulfill({ json: { ok: true, usuario: { usuario_id: 8, nombre: "Eva", roles, permisos: [] } } }) : route.fulfill({ status: 401, json: { ok: false } });
    if (clave === "GET /suscripcion/mia") return route.fulfill({ json: { ok: true, data: PLAN } });
    const respuesta = rutas[clave];
    if (typeof respuesta === "function") return respuesta(route, body);
    if (respuesta) return route.fulfill({ json: respuesta });
    return route.fulfill({ json: { ok: true, data: [], textos: {}, pilares: [], contactos: [] } });
  });
  return pedidos;
}

const FICHA = {
  id: 5, nombre: "Abierto de Verano", estado: "inscripcion", sede: "Club Norte", direccion: null, localidad: "Formosa",
  fecha_inicio: "2026-12-05", fecha_fin: "2026-12-06", contacto: "WhatsApp EJEMPLO", descripcion: "Torneo de verano.", reglamento: "Zonas a un set.",
  inscripcion_abierta: true,
  categorias: [
    { id: 51, nombre: "4ta Caballeros", cupo_parejas: 16, confirmadas: 10, lugares_libres: 6, premios: [{ puesto: "campeon", etiqueta: null, descripcion: "Trofeo" }] },
    { id: 52, nombre: "Suma 13", cupo_parejas: 8, confirmadas: 8, lugares_libres: 0, premios: [] },
  ],
};

// Como la lista pública: lo que cuenta la tarjeta sale de las categorías del torneo.
const TARJETA = {
  id: 5, nombre: "Abierto de Verano", estado: "inscripcion", sede: "Club Norte", localidad: "Formosa", fecha_inicio: "2026-12-05", fecha_fin: "2026-12-06",
  descripcion: "Torneo de verano con zonas y llaves, cancha techada.",
  categorias: [{ nombre: "4ta Caballeros", rama: "caballeros" }, { nombre: "Suma 13", rama: null }], ramas: ["caballeros"],
  formato: { parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6" }, parejas: 18, lugares_libres: 6, premio_campeon: "Trofeo",
};
const EN_JUEGO = { ...TARJETA, id: 6, nombre: "Copa Damas", estado: "en_juego", descripcion: null, categorias: [{ nombre: "6ta Damas", rama: "damas" }], ramas: ["damas"], formato: null, lugares_libres: null, premio_campeon: null, parejas: 9 };

test("lista de torneos: la tarjeta cuenta qué se juega, y se busca y filtra desde la dirección", async ({ page }, info) => {
  const pedidos = [];
  await api(page, { rutas: {
    "GET /publico/torneos": (route) => {
      const filtros = Object.fromEntries(new URL(route.request().url()).searchParams);
      pedidos.push(filtros);
      const data = [TARJETA, EN_JUEGO].filter((t) => (!filtros.q || t.nombre.toLowerCase().includes(filtros.q.toLowerCase())) && (!filtros.estado || t.estado === filtros.estado));
      return route.fulfill({ json: { ok: true, page: 1, limit: 12, total: data.length, totalPages: 1, data } });
    },
  } });
  await page.goto("/torneos");
  const tarjeta = page.getByRole("link", { name: /Abierto de Verano/ });
  await expect(tarjeta.getByText("Zonas de 3, clasifican 2 y llave · Un set a 6 games")).toBeVisible();
  await expect(tarjeta.getByText("Campeón: Trofeo")).toBeVisible();
  await expect(tarjeta.getByText("Quedan 6 lugares")).toBeVisible();
  await expect(tarjeta.getByRole("list", { name: "Categorías" }).getByRole("listitem")).toHaveText(["4ta Caballeros", "Suma 13"]);
  await expect(tarjeta.getByText("Anotarme")).toBeVisible();
  const enJuego = page.getByRole("link", { name: /Copa Damas/ });
  await expect(enJuego.getByText("Formato según la categoría")).toBeVisible();
  await expect(enJuego.getByText("9 parejas")).toBeVisible();
  await expect(enJuego.getByText("Ver resultados")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("lista_torneos.png"), fullPage: true });

  await page.getByRole("searchbox", { name: "Buscar torneo" }).fill("copa");
  await expect(page).toHaveURL(/[?&]q=copa/);
  await expect(page.getByText("1 torneo con esos filtros")).toBeVisible();
  await expect(tarjeta).toHaveCount(0);
  await page.getByLabel("Estado").selectOption("inscripcion");
  await expect(page.getByText("No encontramos torneos con esos filtros")).toBeVisible();
  expect(pedidos.at(-1)).toMatchObject({ q: "copa", estado: "inscripcion" });

  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page).toHaveURL(/\/torneos$/);
  await expect(page.getByText("2 torneos")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar torneo" })).toHaveValue("");
});

test("un visitante ve los torneos y la ficha; para anotarse le pide ingresar", async ({ page }, info) => {
  await api(page, { rutas: {
    "GET /publico/torneos": { ok: true, page: 1, limit: 12, total: 1, totalPages: 1, data: [TARJETA] },
    "GET /publico/torneos/5": { ok: true, data: FICHA },
  } });
  await page.goto("/");
  if (info.project.name !== "desktop") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Torneos" }).locator("visible=true").first().click();
  await page.getByRole("link", { name: /Abierto de Verano/ }).click();
  await expect(page.getByRole("heading", { name: "Abierto de Verano" })).toBeVisible();
  await expect(page.getByText("6 lugares")).toBeVisible();
  await expect(page.getByText("Cupo completo")).toBeVisible();
  await expect(page.getByText("Campeón: Trofeo")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ingresar para anotarme" })).toHaveAttribute("href", "/login?returnTo=%2Ftorneos%2F5");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("ficha_publica.png"), fullPage: true });
});

test("un jugador se anota con su compañero en una categoría con lugar", async ({ page }) => {
  const pedidos = await api(page, { roles: ["jugador"], rutas: {
    "GET /publico/torneos/5": { ok: true, data: FICHA },
    "POST /inscripciones": (route) => route.fulfill({ status: 201, json: { ok: true, mensaje: "¡Listo! Tu inscripción quedó pendiente: el organizador la va a confirmar." } }),
  } });
  await page.goto("/torneos/5");
  const categoria = page.getByLabel("Categoría", { exact: true });
  await expect(categoria.locator("option", { hasText: "Suma 13" })).toHaveCount(0, { timeout: 5000 });
  await expect(categoria).toHaveValue("51", { timeout: 5000 });
  await page.getByRole("button", { name: "Anotarme" }).click();
  await expect(page.getByText("Nombre y apellido de tu compañero (mínimo 3 caracteres).")).toBeVisible();
  await page.getByLabel("Nombre y apellido de tu compañero").fill("Pedro Gómez");
  await page.getByLabel("Tu teléfono (opcional)").fill("370 400-0000");
  await page.getByRole("button", { name: "Anotarme" }).click();
  await expect(page.getByText("Tu inscripción quedó pendiente")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mis inscripciones" }).last()).toBeVisible();
  expect(pedidos.find((p) => p.clave === "POST /inscripciones").body).toEqual({ torneo_id: 5, categoria_id: 51, jugador2_nombre: "Pedro Gómez", telefono: "370 400-0000", nota: "" });
});

test("mis inscripciones: pestañas Activas, Jugadas y Bajas; lo que pide acción va primero y bajarse la pasa a Bajas", async ({ page }, info) => {
  const torneo = (id, nombre, estado, fecha_inicio = "2026-12-05") => ({ id, nombre, estado, sede: "Club Norte", fecha_inicio });
  let lista = [
    { id: 1, rol: "anoto", estado: "confirmada", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Pedro Gómez", categoria: "4ta Caballeros", zona_id: null, motivo_rechazo: null, monto_inscripcion: null, torneo: torneo(5, "Abierto de Verano", "inscripcion", "2026-11-01") },
    { id: 2, rol: "anoto", estado: "rechazada", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Luis Díaz", categoria: "Suma 13", zona_id: null, motivo_rechazo: "No pagó la inscripción", torneo: torneo(6, "Copa Otoño", "inscripcion") },
    { id: 3, rol: "anoto", estado: "pendiente", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Juan Paz", categoria: "6ta Mixto", zona_id: null, motivo_rechazo: null, monto_inscripcion: 20000, pago_estado: null, torneo: { ...torneo(7, "Copa Invierno", "inscripcion", "2026-12-20"), ...COBRO } },
    { id: 4, rol: "anoto", estado: "confirmada", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Ana Ruiz", categoria: "5ta Mixto", zona_id: 3, motivo_rechazo: null, torneo: torneo(8, "Copa Primavera", "finalizado", "2026-09-10") },
  ];
  const pedidos = await api(page, { roles: ["jugador"], rutas: {
    "GET /inscripciones/mias": (route) => route.fulfill({ json: { ok: true, data: lista } }),
    "POST /inscripciones/1/cancelar": (route) => { lista = lista.map((i) => (i.id === 1 ? { ...i, estado: "cancelada" } : i)); return route.fulfill({ json: { ok: true, mensaje: "Te bajaste del torneo." } }); },
  } });
  await page.goto("/mis-inscripciones");
  await expect(page.getByRole("tab", { name: "Activas (2)" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Jugadas (1)" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Bajas (1)" })).toBeVisible();
  await expect(page.getByText("Motivo: No pagó la inscripción")).toHaveCount(0);
  // Lo que pide acción va primero aunque el torneo sea más tarde.
  const tarjetas = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: /^Copa|^Abierto/ }) });
  await expect(tarjetas.first()).toContainText("Copa Invierno");
  await expect(tarjetas.first()).toContainText("Mandá el comprobante para confirmar tu lugar.");
  await expect(page.getByText("Confirmada: ya tenés tu lugar.")).toBeVisible();
  await expect(page.getByText("Tenés 1 cosa para hacer: están primero.")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("mis_inscripciones.png"), fullPage: true });

  await page.getByRole("listitem").filter({ hasText: "Abierto de Verano" }).getByRole("button", { name: "Bajarme del torneo" }).click();
  await page.getByRole("button", { name: "Bajarme", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Activas (1)" })).toBeVisible();
  await expect(page.getByText("Abierto de Verano")).toHaveCount(0);

  await page.getByRole("tab", { name: "Bajas (2)" }).click();
  await expect(page).toHaveURL(/\/mis-inscripciones\?ver=bajas$/);
  await expect(page.getByText("Motivo: No pagó la inscripción")).toBeVisible();
  await expect(page.getByText("Te diste de baja.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bajarme del torneo" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Jugadas (1)" }).click();
  await expect(page.getByRole("link", { name: /Ver resultados y podio/ })).toHaveAttribute("href", "/torneos/8");
  expect(pedidos.some((p) => p.clave === "POST /inscripciones/1/cancelar")).toBe(true);
});

const detalle = (estado) => ({
  id: 9, nombre: "Copa Club", estado, sede: "Club Sur", fecha_inicio: "2026-12-05", fecha_fin: null, descripcion: null, direccion: null, localidad: null, contacto: null, reglamento: null,
  edicion: EDICION_POR_ESTADO[estado], transiciones: TRANSICIONES[estado],
  categorias: [{ id: 91, nombre: "6ta Damas", nivel: 6, rama: "damas", nombre_personalizado: null, cupo_parejas: null, parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", premios: [] }],
});

// Cobro de la inscripción: datos de EJEMPLO, no son una cuenta real.
const COBRO = { cobro_titular: "Club Norte EJEMPLO", cobro_banco: "Banco EJEMPLO", cobro_cbu: "0000003100000000000001", cobro_alias: "club.norte.ejemplo" };
const PDF_FALSO = { name: "comprobante.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 comprobante de prueba") };

test("visitante: la ficha muestra el monto por pareja y la cuenta para transferir, con CBU y alias para copiar", async ({ page, context }, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const ficha = { ...FICHA, ...COBRO, categorias: FICHA.categorias.map((c, i) => ({ ...c, monto_inscripcion: i === 0 ? 20000 : null })) };
  await api(page, { rutas: { "GET /publico/torneos/5": { ok: true, data: ficha } } });
  await page.goto("/torneos/5");
  await expect(page.getByText("Inscripción: $ 20.000 por pareja")).toBeVisible();
  await expect(page.getByText("club.norte.ejemplo")).toBeVisible();
  await page.getByRole("button", { name: "Copiar Alias" }).click();
  await expect(page.getByText("Alias copiado")).toBeVisible();
  if (info.project.name === "desktop") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("club.norte.ejemplo");
  await noOverflow(page);
});

test("jugador: al anotarse en una categoría que cobra lo lleva directo a transferir y mandar el comprobante", async ({ page }, info) => {
  const ficha = { ...FICHA, ...COBRO, categorias: FICHA.categorias.map((c, i) => ({ ...c, monto_inscripcion: i === 0 ? 20000 : null })) };
  let mias = [];
  const pedidos = await api(page, { roles: ["jugador"], rutas: {
    "GET /publico/torneos/5": { ok: true, data: ficha },
    "POST /inscripciones": (route) => {
      mias = [{ id: 7, rol: "anoto", estado: "pendiente", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Pedro Gómez", categoria: "4ta Caballeros", zona_id: null, motivo_rechazo: null,
        monto_inscripcion: 20000, pago_estado: null, pago_motivo_rechazo: null, pago_comprobante_formato: null, torneo: { id: 5, nombre: "Abierto de Verano", estado: "inscripcion", sede: "Club Norte", fecha_inicio: "2026-12-05", ...COBRO } }];
      return route.fulfill({ status: 201, json: { ok: true, mensaje: "¡Listo! Tu inscripción quedó pendiente: el organizador la va a confirmar.", data: { id: 7, estado: "pendiente" } } });
    },
    "GET /inscripciones/mias": (route) => route.fulfill({ json: { ok: true, data: mias } }),
    "POST /inscripciones/7/comprobante": { ok: true, mensaje: "¡Comprobante enviado! La organización lo revisa y confirma tu inscripción." },
  } });
  await page.goto("/torneos/5");
  await expect(page.getByText("Esta categoría cobra $ 20.000 por pareja. Al anotarte te llevamos a los datos para transferir y a mandar el comprobante.")).toBeVisible();
  await page.getByLabel("Nombre y apellido de tu compañero").fill("Pedro Gómez");
  await page.getByRole("button", { name: "Anotarme" }).click();
  await expect(page).toHaveURL(/\/mis-inscripciones\?pagar=7&nueva=1$/);
  await expect(page.getByText("¡Te anotaste!")).toBeVisible();
  const mandar = page.getByRole("button", { name: "Mandar comprobante" });
  await expect(mandar).toBeInViewport();
  await expect(page.getByText(COBRO.cobro_alias)).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("anotado_a_pagar.png") });
  await page.getByLabel("Comprobante de la transferencia").setInputFiles(PDF_FALSO);
  await expect(page.getByText("¡Comprobante enviado!")).toBeVisible();
  expect(pedidos.filter((x) => x.clave === "POST /inscripciones/7/comprobante")).toHaveLength(1);
});

test("campanita: avisa invitaciones y comprobantes pendientes; el aviso lleva al pago y baja al mandarlo", async ({ page }, info) => {
  const torneo = { id: 5, nombre: "Abierto de Verano", estado: "inscripcion", sede: "Club Norte", fecha_inicio: "2026-12-05", ...COBRO };
  const base = { zona_id: null, motivo_rechazo: null, pago_motivo_rechazo: null, pago_comprobante_formato: null, torneo };
  let mias = [
    { ...base, id: 7, rol: "anoto", estado: "pendiente", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Pedro Gómez", categoria: "4ta Caballeros", monto_inscripcion: 20000, pago_estado: null },
    { ...base, id: 8, rol: "invitado", estado: "esperando", jugador1_nombre: "Ana Prueba", jugador2_nombre: "Eva Prueba", categoria: "5ta Mixto", monto_inscripcion: null, pago_estado: null },
    { ...base, id: 9, rol: "anoto", estado: "confirmada", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Luz Paz", categoria: "6ta Damas", monto_inscripcion: 20000, pago_estado: "aprobado" },
  ];
  await api(page, { roles: ["jugador"], rutas: {
    "GET /inscripciones/mias": (route) => route.fulfill({ json: { ok: true, data: mias } }),
    "POST /inscripciones/7/comprobante": (route) => {
      mias = mias.map((i) => (i.id === 7 ? { ...i, pago_estado: "en_revision", pago_comprobante_formato: "pdf" } : i));
      return route.fulfill({ json: { ok: true, mensaje: "¡Comprobante enviado! La organización lo revisa y confirma tu inscripción." } });
    },
  } });
  await page.goto("/torneos");
  const campana = page.getByRole("button", { name: "Avisos: 2 pendientes" });
  await campana.click();
  await expect(page.getByRole("link", { name: /Ana Prueba te invitó a jugar en pareja/ })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("campanita.png") });
  await page.getByRole("link", { name: /Falta mandar el comprobante de la inscripción/ }).click();
  await expect(page).toHaveURL(/\/mis-inscripciones\?pagar=7$/);
  await expect(page.getByText("Tenés 2 cosas para hacer: están primero.")).toBeVisible();
  await expect(page.getByText("¡Te anotaste!")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mandar comprobante" })).toBeInViewport();
  await page.getByLabel("Comprobante de la transferencia").setInputFiles(PDF_FALSO);
  await expect(page.getByText("¡Comprobante enviado!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Avisos: 1 pendiente" })).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Avisos: 1 pendiente" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Ver mis inscripciones" })).toHaveCount(0);
});

test("campanita: las novedades (confirmación, horario) se ven con punto, se marcan leídas al abrir y llevan a su lugar", async ({ page }, info) => {
  let datos = { no_leidos: 2, avisos: [
    { id: 31, tipo: "inscripcion_confirmada", titulo: "Estás confirmado en Copa Club", detalle: "Tu inscripción en 6ta Damas quedó confirmada.", ruta: "/mis-inscripciones", leido_en: null, creado_en: "2026-10-28T21:00:00Z" },
    { id: 30, tipo: "horario_partido", titulo: "Horario de tu partido en Copa Club", detalle: "Ana / Bea vs Eli / Flor: sáb 05/12 · 18:30 · Cancha 2.", ruta: "/torneos/9", leido_en: null, creado_en: "2026-10-28T20:00:00Z" },
    { id: 20, tipo: "inscripcion_rechazada", titulo: "Tu inscripción en Copa Vieja fue rechazada", detalle: null, ruta: "/mis-inscripciones?ver=bajas", leido_en: "2026-10-20T10:00:00Z", creado_en: "2026-10-19T10:00:00Z" },
  ] };
  const pedidos = await api(page, { roles: ["jugador"], rutas: {
    "GET /inscripciones/mias": { ok: true, data: [] },
    "GET /avisos": (route) => route.fulfill({ json: { ok: true, data: datos } }),
    "POST /avisos/leidos": (route) => { datos = { ...datos, no_leidos: 0, avisos: datos.avisos.map((a) => ({ ...a, leido_en: a.leido_en ?? "2026-10-29T10:00:00Z" })) }; return route.fulfill({ json: { ok: true, data: { marcados: 2 } } }); },
  } });
  await page.goto("/torneos");
  await page.getByRole("button", { name: "Avisos: 2 pendientes" }).click();
  const novedades = page.getByRole("list", { name: "Novedades" });
  await expect(novedades.getByRole("link", { name: /Nueva: Estás confirmado en Copa Club/ })).toBeVisible();
  await expect(novedades.getByRole("link", { name: /Nueva: Horario de tu partido/ })).toContainText("sáb 05/12 · 18:30 · Cancha 2");
  await expect(novedades.getByRole("link", { name: /Copa Vieja/ })).not.toContainText("Nueva:");
  await expect.poll(() => pedidos.filter((x) => x.clave === "POST /avisos/leidos").length).toBe(1);
  await expect(page.getByRole("button", { name: "Avisos: nada pendiente" })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("campanita_novedades.png") });
  await novedades.getByRole("link", { name: /Horario de tu partido/ }).click();
  await expect(page).toHaveURL(/\/torneos\/9$/);
});

test("mi perfil: el jugador apaga los avisos por mail", async ({ page }) => {
  const pedidos = await api(page, { roles: ["jugador"], rutas: {
    "GET /jugadores/yo": { ok: true, data: { codigo: "MP-7K3QX", nombre: "Eva Prueba", recibir_mails: true, resumen: { torneos: 0, titulos: 0, finales: 0, mejor_puesto: null }, historial: [] } },
    "PUT /avisos/preferencias": (route, body) => route.fulfill({ json: { ok: true, data: { recibir_mails: body.recibir_mails } } }),
  } });
  await page.goto("/mi-perfil");
  const interruptor = page.getByRole("switch", { name: /Recibir avisos por mail/ });
  await expect(interruptor).toBeChecked();
  await interruptor.click();
  await expect(page.getByText("Listo: ya no te mandamos mails.")).toBeVisible();
  await expect(interruptor).not.toBeChecked();
  expect(pedidos.find((x) => x.clave === "PUT /avisos/preferencias").body).toEqual({ recibir_mails: false });
});

test("campanita: un visitante sin sesión no la ve", async ({ page }) => {
  await api(page, { rutas: {} });
  await page.goto("/torneos");
  await expect(page.getByRole("heading", { name: "Torneos" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Avisos/ })).toHaveCount(0);
});

test("campanita: sin pendientes lo dice", async ({ page }) => {
  await api(page, { roles: ["jugador"], rutas: { "GET /inscripciones/mias": { ok: true, data: [] } } });
  await page.goto("/torneos");
  await page.getByRole("button", { name: "Avisos: nada pendiente" }).click();
  await expect(page.getByText("No tenés nada pendiente.")).toBeVisible();
});

test("jugador: en una categoría sin cobro se queda en la ficha, como antes", async ({ page }) => {
  await api(page, { roles: ["jugador"], rutas: {
    "GET /publico/torneos/5": { ok: true, data: FICHA },
    "POST /inscripciones": { ok: true, mensaje: "¡Listo! Tu inscripción quedó pendiente: el organizador la va a confirmar.", data: { id: 8, estado: "pendiente" } },
  } });
  await page.goto("/torneos/5");
  await page.getByLabel("Nombre y apellido de tu compañero").fill("Pedro Gómez");
  await page.getByRole("button", { name: "Anotarme" }).click();
  await expect(page.getByText("Tu inscripción quedó pendiente")).toBeVisible();
  await expect(page).toHaveURL(/\/torneos\/5$/);
});

test("jugador: ve la cuenta, manda el comprobante; si se lo rechazan ve el motivo y manda otro", async ({ page }, info) => {
  let inscripcion = { id: 7, rol: "anoto", estado: "pendiente", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Pedro Gómez", categoria: "4ta Caballeros", zona_id: null, motivo_rechazo: null,
    monto_inscripcion: 20000, pago_estado: "rechazado", pago_motivo_rechazo: "No se ve el monto", pago_comprobante_formato: "jpg",
    torneo: { id: 5, nombre: "Abierto de Verano", estado: "inscripcion", sede: "Club Norte", fecha_inicio: "2026-12-05", ...COBRO } };
  const pedidos = await api(page, { roles: ["jugador"], rutas: {
    "GET /inscripciones/mias": (route) => route.fulfill({ json: { ok: true, data: [inscripcion] } }),
    "POST /inscripciones/7/comprobante": (route) => {
      inscripcion = { ...inscripcion, pago_estado: "en_revision", pago_motivo_rechazo: null, pago_comprobante_formato: "pdf" };
      return route.fulfill({ json: { ok: true, mensaje: "¡Comprobante enviado! La organización lo revisa y confirma tu inscripción." } });
    },
  } });
  await page.goto("/mis-inscripciones");
  await expect(page.getByText("Inscripción: $ 20.000 por pareja")).toBeVisible();
  await expect(page.getByText("Motivo: No se ve el monto. Mandá otro comprobante.")).toBeVisible();
  await expect(page.getByText("0000003100000000000001")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("pago_inscripcion.png"), fullPage: true });

  await page.getByLabel("Comprobante de la transferencia").setInputFiles(PDF_FALSO);
  await expect(page.getByText("¡Comprobante enviado!")).toBeVisible();
  await expect(page.getByText("Comprobante en revisión")).toBeVisible();
  await expect(page.getByRole("button", { name: /Mandar/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ver mi comprobante" })).toBeVisible();
  expect(pedidos.filter((x) => x.clave === "POST /inscripciones/7/comprobante")).toHaveLength(1);
});

test("organizador: carga la cuenta en Datos, ve el comprobante y aprueba uno (queda confirmada) o rechaza otro con motivo", async ({ page, context }) => {
  const torneo = detalle("inscripcion");
  torneo.categorias[0].monto_inscripcion = 20000;
  let inscripciones = [
    { id: 1, categoria_id: 91, jugador1_nombre: "Ana Gómez", jugador2_nombre: "Bea Ruiz", telefono: null, nota: null, origen: "online", estado: "pendiente", motivo_rechazo: null, cabeza_de_serie: false, zona_id: null, pago_estado: "en_revision", pago_comprobante_formato: "pdf", pago_motivo_rechazo: null },
    { id: 2, categoria_id: 91, jugador1_nombre: "Caro López", jugador2_nombre: "Dani Paz", telefono: null, nota: null, origen: "online", estado: "pendiente", motivo_rechazo: null, cabeza_de_serie: false, zona_id: null, pago_estado: "en_revision", pago_comprobante_formato: "jpg", pago_motivo_rechazo: null },
  ];
  const cambiar = (id, extra) => { inscripciones = inscripciones.map((i) => (i.id === id ? { ...i, ...extra } : i)); };
  const pedidos = await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: torneo },
    "PATCH /torneos/9": (route, body) => route.fulfill({ json: { ok: true, mensaje: "Cambios guardados.", data: { ...torneo, ...body } } }),
    "GET /torneos/9/inscripciones": (route) => route.fulfill({ json: { ok: true, data: inscripciones } }),
    "GET /torneos/9/inscripciones/1/comprobante": { ok: true, data: { url: "https://res.cloudinary.test/firmado/insc1.pdf", formato: "pdf" } },
    "POST /torneos/9/inscripciones/1/pago/aprobar": (route) => { cambiar(1, { estado: "confirmada", pago_estado: "aprobado" }); return route.fulfill({ json: { ok: true, mensaje: "Pago aprobado: la inscripción quedó confirmada." } }); },
    "POST /torneos/9/inscripciones/2/pago/rechazar": (route, body) => { cambiar(2, { pago_estado: "rechazado", pago_motivo_rechazo: body.motivo }); return route.fulfill({ json: { ok: true, mensaje: "Comprobante rechazado." } }); },
  } });
  await context.route("https://res.cloudinary.test/**", (route) => route.fulfill({ contentType: "text/plain", body: "comprobante" }));
  await page.goto("/mis-torneos/9");

  await page.getByLabel("CBU o CVU").fill("123");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("El CBU o CVU tiene 22 números.")).toBeVisible();
  await page.getByLabel("Monto por pareja").fill("20000");
  await page.getByLabel("Titular de la cuenta").fill(COBRO.cobro_titular);
  await page.getByLabel("CBU o CVU").fill(COBRO.cobro_cbu);
  await page.getByLabel("Alias").fill(COBRO.cobro_alias);
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  expect(pedidos.find((x) => x.clave === "PATCH /torneos/9").body).toMatchObject({ monto_inscripcion: "20000", cobro_titular: COBRO.cobro_titular, cobro_cbu: COBRO.cobro_cbu, cobro_alias: COBRO.cobro_alias });

  await page.getByRole("tab", { name: "Inscripciones" }).click();
  const ana = page.getByRole("listitem").filter({ hasText: "Ana Gómez" });
  await expect(ana.getByText("Comprobante en revisión")).toBeVisible();
  const pestania = context.waitForEvent("page");
  await ana.getByRole("button", { name: "Ver comprobante de Ana Gómez / Bea Ruiz" }).click();
  await expect(await pestania).toHaveURL("https://res.cloudinary.test/firmado/insc1.pdf");
  await expect(ana.getByRole("button", { name: "Confirmar", exact: true })).toHaveCount(0);
  await ana.getByRole("button", { name: "Aprobar pago y confirmar" }).click();
  await expect(page.getByText("Pago aprobado: la inscripción quedó confirmada.")).toBeVisible();
  await expect(ana.getByText("Pago aprobado")).toBeVisible();

  await page.getByRole("listitem").filter({ hasText: "Caro López" }).getByRole("button", { name: "Rechazar comprobante" }).click();
  const modal = page.getByRole("dialog", { name: /Rechazar comprobante · Caro López/ });
  await modal.getByLabel("Motivo").fill("El monto no coincide");
  await modal.getByRole("button", { name: "Rechazar comprobante" }).click();
  await expect(page.getByText("Motivo: El monto no coincide")).toBeVisible();
  expect(pedidos.find((x) => x.clave === "POST /torneos/9/inscripciones/2/pago/rechazar").body).toEqual({ motivo: "El monto no coincide" });
});

test("organizador: descarga la lista de inscriptos para Excel (acentos, teléfono, pago y sin fórmulas)", async ({ page }) => {
  const torneo = detalle("inscripcion");
  torneo.categorias[0].monto_inscripcion = 20000;
  const inscripciones = [
    { id: 1, categoria_id: 91, jugador1_nombre: "Ana Gómez", jugador2_nombre: "Bea \"La Rápida\" Ruiz", telefono: "3704000000", nota: null, origen: "online", estado: "confirmada", motivo_rechazo: null, cabeza_de_serie: true, zona_id: null, pago_estado: "aprobado", creado_en: "2026-10-20T15:00:00Z" },
    { id: 2, categoria_id: 91, jugador1_nombre: "=HYPERLINK(\"http://malo\")", jugador2_nombre: "Dani Paz", telefono: null, nota: "Pagamos en el club", origen: "organizador", estado: "pendiente", motivo_rechazo: null, cabeza_de_serie: false, zona_id: null, pago_estado: null, creado_en: "2026-10-21T15:00:00Z" },
  ];
  await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: torneo },
    "GET /torneos/9/inscripciones": { ok: true, data: inscripciones },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Inscripciones" }).click();
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar Excel" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^inscriptos-.+\.csv$/);
  const texto = await readFile(await archivo.path(), "utf8");
  expect(texto.startsWith("﻿")).toBe(true);
  const [encabezado, primera, segunda] = texto.slice(1).split("\r\n");
  expect(encabezado).toBe('"Categoría";"Jugador 1";"Jugador 2";"Teléfono";"Estado";"Pago";"Cabeza de serie";"Cómo se anotó";"Anotada el";"Nota";"Motivo de rechazo"');
  expect(primera).toContain('"Ana Gómez";"Bea ""La Rápida"" Ruiz";"3704000000";"Confirmada";"Pago aprobado";"Sí";"Online";"20/10/2026"');
  expect(segunda).toContain(`"'=HYPERLINK(""http://malo"")"`);
  expect(segunda).toContain('"Sin comprobante"');
});

test("organizador: arma el cronograma automático, ve cómo queda y lo guarda", async ({ page }, info) => {
  const VISTA = { ya_programados: 1, sin_lugar: [{ id: 103, categoria: "6ta Damas", etapa: "Zona A", partido: "Ana / Bea vs Caro / Dani" }], asignados: [
    { id: 101, fecha: "2026-12-05", hora: "18:00", cancha: "Cancha 1", categoria: "6ta Damas", etapa: "Zona A", partido: "Ana / Bea vs Eli / Flor" },
    { id: 102, fecha: "2026-12-05", hora: "19:00", cancha: "Cancha 2", categoria: "6ta Damas", etapa: "Zona A", partido: "Caro / Dani vs Eli / Flor" },
  ] };
  const pedidos = await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("inscripcion") },
    "GET /torneos/9/categorias/91/zonas": { ok: true, data: ZONAS_ARMADAS },
    "POST /torneos/9/cronograma/previsualizar": (route, body) => (body.canchas === 9
      ? route.fulfill({ status: 400, json: { ok: false, mensaje: "Las canchas van de 1 a 20." } })
      : route.fulfill({ json: { ok: true, data: VISTA } })),
    "POST /torneos/9/cronograma": { ok: true, mensaje: "Cronograma guardado: 2 partidos con horario. Les avisamos a los jugadores.", data: VISTA },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await page.getByRole("button", { name: "Armar cronograma" }).click();
  const modal = page.getByRole("dialog", { name: "Armar cronograma" });
  await expect(modal.getByLabel("Día 1")).toHaveValue("2026-12-05");
  await modal.getByLabel("Canchas").fill("9");
  await modal.getByRole("button", { name: "Ver cómo queda" }).click();
  await expect(modal.getByText("Las canchas van de 1 a 20.")).toBeVisible();
  await modal.getByLabel("Canchas").fill("2");
  await modal.getByRole("button", { name: "Ver cómo queda" }).click();
  const vista = modal.getByRole("region", { name: "Vista previa del cronograma" });
  await expect(vista.getByText("2 partidos con horario · 1 ya tenían horario y se respetan")).toBeVisible();
  await expect(vista.getByText("1 partido no entró")).toBeVisible();
  await expect(vista.getByText("18:00 · C1")).toBeVisible();
  await noOverflow(page);
  await modal.screenshot({ path: info.outputPath("cronograma.png") });
  expect(pedidos.filter((x) => x.clave === "POST /torneos/9/cronograma/previsualizar").at(-1).body)
    .toEqual({ dias: ["2026-12-05"], desde: "18:00", hasta: "23:00", canchas: 2, minutos: 60, descanso: 1, incluir_llave: true });
  await modal.getByRole("button", { name: "Guardar cronograma" }).click();
  await expect(page.getByText("Cronograma guardado: 2 partidos con horario.")).toBeVisible();
  await expect(modal).toHaveCount(0);
  expect(pedidos.some((x) => x.clave === "POST /torneos/9/cronograma")).toBe(true);
});

test("organizador: versión para imprimir con zonas y horarios, sin menús al imprimir", async ({ page }, info) => {
  const zonas = structuredClone(ZONAS_ARMADAS);
  zonas.zonas[0].partidos[0] = { ...zonas.zonas[0].partidos[0], fecha: "2026-12-05", hora: "18:30", cancha: "Cancha 2" };
  await page.addInitScript(() => { window.__impresiones = 0; window.print = () => { window.__impresiones += 1; }; });
  await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("en_juego") },
    "GET /torneos/9/categorias/91/zonas": { ok: true, data: zonas },
    "GET /torneos/9/categorias/91/llave": { ok: true, data: { armada: false, rondas: [], podio: {} } },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("link", { name: "Imprimir fixture y llave" }).click();
  await expect(page).toHaveURL(/\/mis-torneos\/9\/imprimir$/);
  await expect(page.getByRole("heading", { name: "6ta Damas" })).toBeVisible();
  await expect(page.getByText("sáb 05/12 · 18:30 · Cancha 2")).toBeVisible();
  await expect(page.getByText("La llave se arma cuando terminen las zonas.")).toBeVisible();
  await page.getByRole("button", { name: "Imprimir o guardar PDF" }).click();
  expect(await page.evaluate(() => window.__impresiones)).toBe(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Imprimir o guardar PDF" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Zona A" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("imprimir.png"), fullPage: true });
});

test("organizador: confirma, rechaza con motivo y carga una pareja a mano", async ({ page }, info) => {
  let inscripciones = [
    { id: 1, categoria_id: 91, jugador1_nombre: "Ana Gómez", jugador2_nombre: "Bea Ruiz", telefono: "3704000000", nota: "Pagamos por transferencia", origen: "online", estado: "pendiente", motivo_rechazo: null, cabeza_de_serie: false, zona_id: null },
    { id: 2, categoria_id: 91, jugador1_nombre: "Caro López", jugador2_nombre: "Dani Paz", telefono: null, nota: null, origen: "online", estado: "pendiente", motivo_rechazo: null, cabeza_de_serie: false, zona_id: null },
  ];
  const cambiar = (id, estado, extra = {}) => { inscripciones = inscripciones.map((i) => (i.id === id ? { ...i, estado, ...extra } : i)); };
  const pedidos = await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("inscripcion") },
    "GET /torneos/9/inscripciones": (route) => route.fulfill({ json: { ok: true, data: inscripciones } }),
    "POST /torneos/9/inscripciones/1/confirmar": (route) => { cambiar(1, "confirmada"); return route.fulfill({ json: { ok: true, mensaje: "Inscripción confirmada." } }); },
    "POST /torneos/9/inscripciones/2/rechazar": (route, body) => { cambiar(2, "rechazada", { motivo_rechazo: body.motivo }); return route.fulfill({ json: { ok: true, mensaje: "Inscripción rechazada." } }); },
    "POST /torneos/9/inscripciones": (route, body) => { inscripciones.push({ id: 3, ...body, origen: "organizador", estado: "confirmada", motivo_rechazo: null, zona_id: null, nota: null }); return route.fulfill({ status: 201, json: { ok: true, mensaje: "Pareja agregada y confirmada." } }); },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Inscripciones" }).click();
  await expect(page.getByText("Tenés 2 inscripciones online para revisar.")).toBeVisible();
  await expect(page.getByRole("link", { name: "3704000000" })).toHaveAttribute("href", "https://wa.me/3704000000");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("inscripciones.png"), fullPage: true });

  await page.getByRole("listitem").filter({ hasText: "Ana Gómez" }).getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Ana Gómez" }).getByText("Confirmada")).toBeVisible();

  await page.getByRole("listitem").filter({ hasText: "Caro López" }).getByRole("button", { name: "Rechazar" }).click();
  const rechazo = page.getByRole("dialog", { name: /Rechazar · Caro López/ });
  await rechazo.getByLabel("Motivo").fill("No llegó el pago");
  await rechazo.getByRole("button", { name: "Rechazar inscripción" }).click();
  await expect(page.getByText("Rechazada: No llegó el pago")).toBeVisible();

  await page.getByRole("button", { name: "Agregar pareja" }).click();
  const alta = page.getByRole("dialog", { name: "Agregar pareja" });
  await alta.getByRole("button", { name: "Agregar pareja" }).click();
  await expect(alta.getByText("Nombre y apellido (mínimo 3 caracteres).").first()).toBeVisible();
  await alta.getByLabel("Jugador 1").fill("Eli Sosa");
  await alta.getByLabel("Jugador 2").fill("Flor Vera");
  await alta.getByLabel(/Cabeza de serie/).check();
  await alta.getByRole("button", { name: "Agregar pareja" }).click();
  await expect(page.getByText("Eli Sosa / Flor Vera")).toBeVisible();
  expect(pedidos.find((p) => p.clave === "POST /torneos/9/inscripciones").body).toEqual({ jugador1_nombre: "Eli Sosa", jugador2_nombre: "Flor Vera", telefono: "", cabeza_de_serie: true, categoria_id: 91 });
});

const pareja = (id, nombre, cabeza = false) => ({ id, nombre, cabeza_de_serie: cabeza });
const ZONAS_ARMADAS = {
  categoria_id: 91, formato: { parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6" }, sin_zona: [],
  zonas: [{
    id: 1, nombre: "A", completa: false,
    parejas: [pareja(11, "Ana / Bea", true), pareja(12, "Caro / Dani"), pareja(13, "Eli / Flor")],
    partidos: [
      { id: 101, orden: 0, formato: "un_set_6", pareja1: pareja(11, "Ana / Bea", true), pareja2: pareja(13, "Eli / Flor"), sets: null, ganador_id: null },
      { id: 102, orden: 1, formato: "un_set_6", pareja1: pareja(12, "Caro / Dani"), pareja2: pareja(13, "Eli / Flor"), sets: null, ganador_id: null },
    ],
    tabla: [11, 12, 13].map((id, i) => ({ inscripcion_id: id, posicion: i + 1, pg: 0, pj: 0, pp: 0, sets_favor: 0, sets_contra: 0, games_favor: 0, games_contra: 0, clasificado: false, pareja: pareja(id, ["Ana / Bea", "Caro / Dani", "Eli / Flor"][i], i === 0) })),
  }],
};

test("organizador: antes de sortear ve qué zonas y llave salen, con aviso si quedan desparejas, y puede sortear igual", async ({ page }) => {
  const confirmadas = Array.from({ length: 7 }, (_, i) => pareja(20 + i, `Pareja ${i + 1}`));
  await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("en_juego") },
    "GET /torneos/9/categorias/91/zonas": { ok: true, data: { ...ZONAS_ARMADAS, zonas: [], sin_zona: confirmadas } },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("Con 7 parejas: 2 zonas (1 de 4 y 1 de 3), clasifican 4. Llave de 4: empieza en semifinal, justa.")).toBeVisible();
  await expect(page.getByText("en las zonas de 4 cada pareja juega 3 partidos y en las de 3, 2. Podés sortear igual")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sortear zonas" })).toBeEnabled();
});

test("zonas terminadas: muestra los mejores terceros que completan la llave y qué desempate definió cada lugar", async ({ page }, info) => {
  const fila = (id, nombre, posicion, extra = {}) => ({ inscripcion_id: id, posicion, pg: 3 - posicion, pj: 2, pp: posicion - 1, sets_favor: 0, sets_contra: 0, games_favor: 0, games_contra: 0, clasificado: posicion <= 2, desempate: null, pareja: pareja(id, nombre), ...extra });
  const zona = (id, letra, base, extra3 = {}) => ({
    id, nombre: letra, completa: true, partidos: [],
    parejas: [1, 2, 3].map((n) => pareja(base + n, `${letra}${n}`)),
    tabla: [fila(base + 1, `${letra}1`, 1, { desempate: base === 30 ? "sorteo" : null }), fila(base + 2, `${letra}2`, 2, { desempate: base === 30 ? "sorteo" : null }), fila(base + 3, `${letra}3`, 3, extra3)],
  });
  const datos = { ...ZONAS_ARMADAS, mejores: { puesto: 3, cupo: 2, definidos: true }, zonas: [
    zona(1, "A", 10, { clasificado: true, mejor: true }), zona(2, "B", 20, { clasificado: true, mejor: true, desempate_mejor: "sorteo" }), zona(3, "C", 30),
  ] };
  await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("en_juego") },
    "GET /torneos/9/categorias/91/zonas": { ok: true, data: datos },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("Además clasifican los 2 mejores terceros de todas las zonas.")).toBeVisible();
  const zonaB = page.getByRole("region", { name: "Zona B" });
  await expect(zonaB.getByRole("row", { name: /B3/ }).getByText("Mejor 3º")).toBeVisible();
  await expect(zonaB.getByRole("row", { name: /B3/ }).getByText("Definido por sorteo")).toBeVisible();
  await expect(page.getByRole("region", { name: "Zona C" }).getByText("Definido por sorteo")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Zona C" }).getByText("Mejor 3º")).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("mejores_terceros.png"), fullPage: true });
});

test("organizador: en Zonas ve cuántas parejas faltan para completar el cupo", async ({ page }, info) => {
  const torneo = detalle("inscripcion");
  torneo.categorias[0].cupo_parejas = 9;
  let confirmadas = 7;
  await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: torneo },
    "GET /torneos/9/categorias/91/zonas": (route) => route.fulfill({ json: { ok: true, data: { ...ZONAS_ARMADAS, zonas: [], sin_zona: Array.from({ length: confirmadas }, (_, i) => pareja(20 + i, `Pareja ${i + 1}`)) } } }),
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("Faltan 2 parejas para completar el cupo (7 de 9 confirmadas).")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("zonas_cupo.png"), fullPage: true });
  confirmadas = 9;
  await page.reload();
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("Cupo completo: 9 de 9 parejas confirmadas.")).toBeVisible();
});

test("organizador: con la inscripción abierta carga día, hora y cancha de un partido (el resultado recién en juego)", async ({ page }, info) => {
  let zonas = structuredClone(ZONAS_ARMADAS);
  const pedidos = await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("inscripcion") },
    "GET /torneos/9/categorias/91/zonas": (route) => route.fulfill({ json: { ok: true, data: zonas } }),
    "PUT /torneos/9/partidos/101/programacion": (route, body) => {
      zonas = structuredClone(zonas);
      Object.assign(zonas.zonas[0].partidos[0], { fecha: body.fecha || null, hora: body.hora || null, cancha: body.cancha || null });
      return route.fulfill({ json: { ok: true, mensaje: "Horario guardado.", data: { fase: "zona", ...zonas } } });
    },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByRole("button", { name: /^Cargar resultado de/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Horario de Ana / Bea contra Eli / Flor" }).click();
  const modal = page.getByRole("dialog", { name: "Horario del partido" });
  await modal.getByLabel("Día").fill("2026-12-05");
  await modal.getByLabel("Hora").fill("18:30");
  await modal.getByLabel("Cancha").fill("Cancha 2");
  await modal.getByRole("button", { name: "Guardar horario" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText("sáb 05/12 · 18:30 · Cancha 2")).toBeVisible();
  expect(pedidos.find((p) => p.clave === "PUT /torneos/9/partidos/101/programacion").body).toEqual({ fecha: "2026-12-05", hora: "18:30", cancha: "Cancha 2" });
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("horario_zona.png"), fullPage: true });

  await page.getByRole("button", { name: "Horario de Ana / Bea contra Eli / Flor" }).click();
  await expect(modal.getByLabel("Cancha")).toHaveValue("Cancha 2");
  await modal.getByRole("button", { name: "Quitar horario" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText("sáb 05/12 · 18:30 · Cancha 2")).toHaveCount(0);
});

test("organizador: sortea las zonas y carga un resultado (el servidor rechaza un marcador imposible)", async ({ page }, info) => {
  let zonas = { ...ZONAS_ARMADAS, zonas: [], sin_zona: ZONAS_ARMADAS.zonas[0].parejas };
  const pedidos = await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("en_juego") },
    "GET /torneos/9/categorias/91/zonas": (route) => route.fulfill({ json: { ok: true, data: zonas } }),
    "POST /torneos/9/categorias/91/zonas/generar": (route) => { zonas = ZONAS_ARMADAS; return route.fulfill({ json: { ok: true, mensaje: "Zonas armadas.", data: zonas } }); },
    "PUT /torneos/9/partidos/101/resultado": (route, body) => {
      if (body.sets[0][0] === 6 && body.sets[0][1] === 5) return route.fulfill({ status: 400, json: { ok: false, codigo: "RESULTADO_INVALIDO", mensaje: "El set 1 (6-5) no es un resultado válido para sets a 6 games." } });
      const z = structuredClone(ZONAS_ARMADAS);
      z.zonas[0].partidos[0] = { ...z.zonas[0].partidos[0], sets: body.sets, ganador_id: 11 };
      z.zonas[0].tabla[0] = { ...z.zonas[0].tabla[0], pg: 1, pj: 1, sets_favor: 1, games_favor: 6, games_contra: 3 };
      zonas = z;
      return route.fulfill({ json: { ok: true, mensaje: "Resultado guardado.", data: z } });
    },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("3 parejas confirmadas sin zona.")).toBeVisible();
  await page.getByRole("button", { name: "Sortear zonas" }).click();
  await expect(page.getByRole("heading", { name: "Zona A" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a sortear" })).toBeVisible();

  await page.getByRole("button", { name: "Cargar resultado de Ana / Bea contra Eli / Flor" }).click();
  const modal = page.getByRole("dialog", { name: "Resultado del partido" });
  await modal.getByLabel("Set: games de Ana / Bea").fill("6");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal.getByText("Completá los dos números del set 1.")).toBeVisible();
  await modal.getByLabel("Set: games de Eli / Flor").fill("5");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal.getByRole("alert").filter({ hasText: "no es un resultado válido" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("resultado.png") });
  await modal.getByLabel("Set: games de Eli / Flor").fill("3");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText("6-3")).toBeVisible();
  await expect(page.getByRole("button", { name: /Volver a sortear/ })).toBeDisabled();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("zonas.png"), fullPage: true });
  expect(pedidos.filter((p) => p.clave === "PUT /torneos/9/partidos/101/resultado").map((p) => p.body.sets)).toEqual([[[6, 5]], [[6, 3]]]);
});
