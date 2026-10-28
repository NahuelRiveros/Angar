import { test, expect } from "@playwright/test";

const FICHA = {
  id: 4, nombre: "Copa Amigos", estado: "inscripcion", sede: "Club Norte", direccion: null, localidad: null, fecha_inicio: "2026-12-05", fecha_fin: null,
  contacto: null, descripcion: null, reglamento: null, inscripcion_abierta: true,
  categorias: [{ id: 41, nombre: "5ta Mixto", cupo_parejas: null, confirmadas: 1, lugares_libres: null, premios: [] }],
};
const PARTICIPANTES = [{
  id: 41, nombre: "5ta Mixto",
  parejas: [{
    id: 1,
    jugador1: { nombre: "Ana Prueba", codigo: "MP-7K3QX", resumen: { torneos: 3, titulos: 2, finales: 2, mejor_puesto: "campeon" } },
    jugador2: { nombre: "Invitado Sin Cuenta", codigo: null, resumen: null },
  }],
}];
const PERFIL = {
  codigo: "MP-7K3QX", nombre: "Ana Prueba",
  resumen: { torneos: 3, titulos: 2, finales: 2, mejor_puesto: "campeon" },
  historial: [
    { torneo_id: 9, torneo: "Copa Final", fecha_inicio: "2026-11-20", torneo_estado: "finalizado", categoria: "4ta Mixto", puesto: "campeon" },
    { torneo_id: 8, torneo: "Abierto de Otoño", fecha_inicio: "2026-10-10", torneo_estado: "finalizado", categoria: "5ta Mixto", puesto: "semifinal" },
  ],
};

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

/** Sesión opcional; `rutas` responde por "MÉTODO /ruta" (función o JSON). */
async function api(page, { conSesion = true, rutas = {} } = {}) {
  if (conSesion) await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  const pedidos = [];
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const clave = `${request.method()} ${new URL(request.url()).pathname.replace(/^\/api/, "")}`;
    let body = null;
    try { body = request.postDataJSON(); } catch { /* sin cuerpo */ }
    pedidos.push({ clave, body });
    if (clave === "GET /auth/me") return conSesion ? route.fulfill({ json: { ok: true, usuario: { usuario_id: 8, nombre: "Eva", roles: ["jugador"], permisos: [] } } }) : route.fulfill({ status: 401, json: { ok: false } });
    const respuesta = rutas[clave];
    if (typeof respuesta === "function") return respuesta(route, body);
    if (respuesta) return route.fulfill({ json: respuesta });
    return route.fulfill({ json: { ok: true, data: [], textos: {}, pilares: [], contactos: [] } });
  });
  return pedidos;
}

test("anotarse invitando al compañero por su código", async ({ page }, info) => {
  const pedidos = await api(page, { rutas: {
    "GET /publico/torneos/4": { ok: true, data: FICHA },
    "GET /publico/torneos/4/participantes": { ok: true, data: PARTICIPANTES },
    "POST /inscripciones": (route) => route.fulfill({ status: 201, json: { ok: true, mensaje: "¡Listo! Tu inscripción quedó pendiente: el organizador la va a confirmar." } }),
  } });
  await page.goto("/torneos/4");
  await page.getByText("Tiene cuenta: lo invito con su código").click();
  await page.getByLabel("Código de tu compañero").fill("hola");
  await page.getByRole("button", { name: "Anotarme" }).click();
  await expect(page.getByText("El código tiene la forma MP-XXXXX")).toBeVisible();
  await page.getByLabel("Código de tu compañero").fill("mp-7k3qx");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("anotarme_codigo.png"), fullPage: true });
  await page.getByRole("button", { name: "Anotarme" }).click();
  await expect(page.getByText("Tu inscripción quedó pendiente")).toBeVisible();
  expect(pedidos.find((p) => p.clave === "POST /inscripciones").body).toEqual({ torneo_id: 4, categoria_id: 41, codigo_companiero: "mp-7k3qx", telefono: "", nota: "" });
});

test("los participantes muestran el historial de los jugadores con cuenta y llevan a su perfil público", async ({ page }, info) => {
  await api(page, { conSesion: false, rutas: {
    "GET /publico/torneos/4": { ok: true, data: FICHA },
    "GET /publico/torneos/4/participantes": { ok: true, data: PARTICIPANTES },
    "GET /jugadores/MP-7K3QX": { ok: true, data: PERFIL },
  } });
  await page.goto("/torneos/4");
  const participantes = page.getByRole("region", { name: "Participantes" });
  await expect(participantes.getByText("3 torneos · mejor: Campeón")).toBeVisible();
  await expect(participantes.getByText("Invitado Sin Cuenta")).toBeVisible();
  await participantes.getByRole("link", { name: /Ana Prueba/ }).click();
  await expect(page).toHaveURL(/\/jugadores\/MP-7K3QX$/);
  await expect(page.getByRole("heading", { name: "Ana Prueba" })).toBeVisible();
  await expect(page.getByLabel("2 torneos ganados")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar mi código" })).toHaveCount(0, { timeout: 3000 });
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("perfil_publico.png"), fullPage: true });
});

test("mi perfil: mi código para copiar, números, copas, historial y el plan de organizador", async ({ page, context }, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await api(page, { rutas: {
    "GET /jugadores/yo": { ok: true, data: PERFIL },
    "GET /suscripcion/mia": { ok: true, data: { es_organizador: true, estado: "prueba", vigente: true, fecha_vencimiento: "2026-11-10", dias_restantes: 13 } },
  } });
  await page.goto("/");
  await page.getByRole("button", { name: info.project.name === "desktop" ? "Mi cuenta" : "Abrir menú" }).click();
  await page.getByRole("link", { name: "Mi perfil" }).locator("visible=true").first().click();
  await expect(page.getByText("MP-7K3QX")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Copas" })).toBeVisible();
  await expect(page.getByText("Copa Final")).toBeVisible();
  await expect(page.getByText("Semifinal", { exact: true })).toBeVisible();
  const organizar = page.getByRole("region", { name: "Organizar torneos" });
  await expect(organizar.getByText("Prueba gratis")).toBeVisible();
  await expect(organizar.getByText("Vence el 10/11/2026")).toBeVisible();
  await expect(organizar.getByRole("link", { name: "Mis torneos" })).toHaveAttribute("href", "/mis-torneos");
  await expect(page.getByText("¡Tu cuenta está lista!")).toHaveCount(0);
  await page.getByRole("button", { name: "Copiar mi código" }).click();
  await expect(page.getByText("Código copiado")).toBeVisible();
  if (info.project.name === "desktop") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("MP-7K3QX");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("mi_perfil.png"), fullPage: true });
});

test("mi perfil: si el plan no carga se puede reintentar sin perder el perfil", async ({ page }) => {
  let fallar = true;
  await api(page, { rutas: {
    "GET /jugadores/yo": { ok: true, data: PERFIL },
    "GET /suscripcion/mia": (route) => (fallar
      ? route.fulfill({ status: 500, json: { ok: false } })
      : route.fulfill({ json: { ok: true, data: { es_organizador: false, dias_prueba: 14 } } })),
  } });
  await page.goto("/mi-perfil");
  await expect(page.getByText("MP-7K3QX")).toBeVisible();
  await expect(page.getByText("No pudimos cargar tu plan.")).toBeVisible({ timeout: 15000 });
  fallar = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("Probalo gratis 14 días, sin tarjeta.")).toBeVisible();
});

test("el compañero invitado acepta la invitación desde Mis inscripciones", async ({ page }) => {
  let estado = "esperando";
  const pedidos = await api(page, { rutas: {
    "GET /inscripciones/mias": (route) => route.fulfill({ json: { ok: true, data: [
      { id: 7, rol: "invitado", estado, jugador1_nombre: "Ana Prueba", jugador2_nombre: "Eva Prueba", categoria: "5ta Mixto", zona_id: null, motivo_rechazo: null, torneo: { id: 4, nombre: "Copa Amigos", estado: "inscripcion", sede: "Club Norte", fecha_inicio: "2026-12-05" } },
    ] } }),
    "POST /inscripciones/7/invitacion": (route, body) => { estado = body.acepta ? "pendiente" : "cancelada"; return route.fulfill({ json: { ok: true, mensaje: "¡Aceptaste! Ahora la organización confirma la inscripción." } }); },
  } });
  await page.goto("/mis-inscripciones");
  await expect(page.getByText("Ana Prueba te invitó a jugar en pareja.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bajarme del torneo" })).toHaveCount(0);
  await page.getByRole("button", { name: "Aceptar" }).click();
  await expect(page.getByText("¡Aceptaste!")).toBeVisible();
  await expect(page.getByText("Pendiente", { exact: true })).toBeVisible();
  expect(pedidos.find((p) => p.clave === "POST /inscripciones/7/invitacion").body).toEqual({ acepta: true });
});
