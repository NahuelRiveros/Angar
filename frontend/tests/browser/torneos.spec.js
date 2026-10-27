import { test, expect } from "@playwright/test";
import { EDICION_POR_ESTADO, TRANSICIONES, nombreCategoria } from "../../../torneo_config.js";

const PLAN_VIGENTE = { es_organizador: true, vigente: true, estado: "activo", dias_restantes: 20, mensaje: "Plan activo: te quedan 20 días.", fecha_vencimiento: "2026-11-16", medios_pago: { mercadopago: false, transferencia: null } };
const PLAN_VENCIDO = { ...PLAN_VIGENTE, vigente: false, estado: "vencido", dias_restantes: 0, mensaje: "Tu plan venció: podés ver tus torneos pero no crear ni editar. Renovalo para seguir organizando." };

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

/** Servidor de torneos en memoria: aplica los cambios y devuelve el detalle como la API real. */
async function servidorFalso(page, { roles = ["jugador", "organizador"], plan = PLAN_VIGENTE, torneos = [] } = {}) {
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  const pedidos = [];
  let proximoId = 100;
  const detalle = (t) => ({
    ...t, edicion: EDICION_POR_ESTADO[t.estado], transiciones: TRANSICIONES[t.estado],
    categorias: t.categorias.map((c) => ({ ...c, nombre: nombreCategoria(c) })),
  });
  const responder = (route, t, mensaje, status = 200) => route.fulfill({ status, json: { ok: true, mensaje, data: detalle(t) } });
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const ruta = new URL(request.url()).pathname.replace(/^\/api/, "");
    let body = null;
    try { body = request.postDataJSON(); } catch { /* sin cuerpo */ }
    pedidos.push({ metodo: request.method(), ruta, body });
    const [, , id, sub, catId, subcat] = ruta.split("/");
    const torneo = torneos.find((t) => t.id === Number(id));

    if (ruta === "/auth/me") return route.fulfill({ json: { ok: true, usuario: { usuario_id: 8, nombre: "Eva", roles, permisos: [] } } });
    if (ruta === "/suscripcion/mia") return route.fulfill({ json: { ok: true, data: plan } });
    if (ruta === "/torneos" && request.method() === "GET") {
      const data = torneos.map(({ categorias, ...t }) => ({ ...t, cantidad_categorias: categorias.length }));
      return route.fulfill({ json: { ok: true, data, page: 1, limit: 20, total: data.length, totalPages: 1 } });
    }
    if (ruta === "/torneos" && request.method() === "POST") {
      const nuevo = { id: proximoId++, estado: "borrador", categorias: [], descripcion: null, direccion: null, localidad: null, contacto: null, reglamento: null, ...body };
      for (const k of ["fecha_inicio", "fecha_fin", "sede"]) nuevo[k] ||= null;
      torneos.push(nuevo);
      return responder(route, nuevo, "Torneo creado en borrador.", 201);
    }
    if (!torneo) return route.fulfill({ status: 404, json: { ok: false, codigo: "TORNEO_INEXISTENTE", mensaje: "No encontramos ese torneo." } });
    if (!sub && request.method() === "GET") return route.fulfill({ json: { ok: true, data: detalle(torneo) } });
    if (!sub && request.method() === "PATCH") { Object.assign(torneo, body); return responder(route, torneo, "Cambios guardados."); }
    if (sub === "estado") {
      if (body.estado === "inscripcion" && (!torneo.sede || !torneo.categorias.length)) {
        return route.fulfill({ status: 409, json: { ok: false, codigo: "FALTAN_DATOS", mensaje: "Para abrir la inscripción falta cargar al menos una categoría." } });
      }
      torneo.estado = body.estado;
      return responder(route, torneo, "Estado actualizado.");
    }
    if (sub === "categorias" && request.method() === "POST") {
      torneo.categorias.push({ id: proximoId++, nivel: null, rama: null, nombre_personalizado: null, premios: [], ...body });
      return responder(route, torneo, "Categoría agregada.", 201);
    }
    const categoria = torneo.categorias.find((c) => c.id === Number(catId));
    if (subcat === "premios") { categoria.premios = body.premios.map((p, i) => ({ ...p, id: i + 1, orden: i })); return responder(route, torneo, "Premios guardados."); }
    if (sub === "categorias" && request.method() === "DELETE") { torneo.categorias = torneo.categorias.filter((c) => c !== categoria); return responder(route, torneo, "Categoría quitada."); }
    return route.fulfill({ status: 500, json: { ok: false, mensaje: `Sin simular: ${request.method()} ${ruta}` } });
  });
  return pedidos;
}

test("el organizador crea un torneo, carga categorías y premios, y abre la inscripción", async ({ page }, info) => {
  const pedidos = await servidorFalso(page);
  await page.goto("/");
  if (info.project.name !== "desktop") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Mis torneos" }).locator("visible=true").first().click();
  await expect(page.getByText("Todavía no creaste ningún torneo")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo torneo" }).click();
  const alta = page.getByRole("dialog", { name: "Nuevo torneo" });
  await alta.getByRole("button", { name: "Crear torneo" }).click();
  await expect(alta.getByText("Mínimo 3 caracteres.")).toBeVisible();
  await alta.getByLabel("Nombre del torneo").fill("Abierto de Verano");
  await alta.getByLabel("Empieza (opcional)").fill("2026-12-05");
  await alta.getByLabel("Termina (opcional)").fill("2026-12-04");
  await alta.getByRole("button", { name: "Crear torneo" }).click();
  await expect(alta.getByText("No puede ser anterior al inicio.")).toBeVisible();
  await alta.getByLabel("Termina (opcional)").fill("2026-12-06");
  await alta.getByLabel("Sede (opcional)").fill("Club Norte");
  await alta.getByRole("button", { name: "Crear torneo" }).click();

  await expect(page).toHaveURL(/\/mis-torneos\/100$/);
  await expect(page.getByRole("heading", { name: "Abierto de Verano" })).toBeVisible();
  await expect(page.getByText("Borrador", { exact: true })).toBeVisible();
  await page.getByLabel("Contacto de la organización").fill("WhatsApp 0000-EJEMPLO");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  // Sin categorías no se abre la inscripción: el error del servidor se muestra en la página.
  await page.getByRole("button", { name: "Abrir inscripción" }).click();
  await page.getByRole("button", { name: "Abrir inscripción" }).last().click();
  await expect(page.getByRole("alert")).toContainText("al menos una categoría");

  await page.getByRole("tab", { name: /Categorías/ }).click();
  await page.getByRole("button", { name: "Agregar categoría" }).click();
  let modal = page.getByRole("dialog", { name: "Nueva categoría" });
  await modal.getByRole("button", { name: "Agregar categoría" }).click();
  await expect(modal.getByText("Elegí el nivel.")).toBeVisible();
  await modal.getByLabel("Nivel").selectOption("4");
  await modal.getByLabel("Rama").selectOption("caballeros");
  await modal.getByLabel("Cupo de parejas (opcional)").fill("16");
  await modal.getByRole("button", { name: "Agregar categoría" }).click();
  await expect(page.getByRole("heading", { name: "4ta Caballeros" })).toBeVisible();
  await expect(page.getByText("Cupo: 16 parejas")).toBeVisible();

  await page.getByRole("button", { name: "Agregar categoría" }).click();
  modal = page.getByRole("dialog", { name: "Nueva categoría" });
  await modal.getByText("Nombre propio").click();
  await modal.getByLabel("Nombre de la categoría").fill("Suma 13");
  await modal.getByRole("button", { name: "Agregar categoría" }).click();
  await expect(page.getByRole("heading", { name: "Suma 13" })).toBeVisible();

  await page.getByRole("listitem").filter({ hasText: "4ta Caballeros" }).getByRole("button", { name: "Premios" }).click();
  const premios = page.getByRole("dialog", { name: /Premios · 4ta Caballeros/ });
  await premios.getByRole("button", { name: "Agregar premio" }).click();
  await premios.getByLabel("Premio", { exact: true }).fill("$200.000 + trofeo");
  await premios.getByRole("button", { name: "Agregar premio" }).click();
  await expect(premios.getByLabel("Puesto").nth(1)).toHaveValue("subcampeon");
  await premios.getByLabel("Puesto").nth(1).selectOption("otro");
  await premios.getByLabel("Premio", { exact: true }).nth(1).fill("Paletas");
  await premios.getByRole("button", { name: "Guardar premios" }).click();
  await expect(premios.getByText("Poné el nombre del puesto.")).toBeVisible();
  await premios.getByLabel("Nombre del puesto").fill("Fair play");
  await page.screenshot({ path: info.outputPath("premios.png") });
  await premios.getByRole("button", { name: "Guardar premios" }).click();
  await expect(page.getByText("Campeón: $200.000 + trofeo")).toBeVisible();
  await expect(page.getByText("Fair play: Paletas")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("categorias.png"), fullPage: true });

  await expect(page.getByText("falta cargar al menos una categoría")).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir inscripción" }).first().click();
  await page.getByRole("button", { name: "Abrir inscripción" }).last().click();
  await expect(page.getByText("Inscripción", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Empezar a jugar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Borrar" })).toHaveCount(0, { timeout: 2000 });

  const premiosEnviados = pedidos.find((p) => p.ruta.endsWith("/premios")).body;
  expect(premiosEnviados).toEqual({ premios: [{ puesto: "campeon", etiqueta: "", descripcion: "$200.000 + trofeo" }, { puesto: "otro", etiqueta: "Fair play", descripcion: "Paletas" }] });
  expect(pedidos.find((p) => p.metodo === "POST" && p.ruta === "/torneos/100/categorias").body).toEqual({ nivel: 4, rama: "caballeros", cupo_parejas: 16, parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", formato_llave: "mejor_de_3_stb" });
});

const TORNEO_EN_JUEGO = {
  id: 7, nombre: "Copa Primavera", estado: "en_juego", sede: "Club Sur", fecha_inicio: "2026-10-20", fecha_fin: "2026-10-27",
  descripcion: null, direccion: null, localidad: null, contacto: null, reglamento: "Sets a 6 games.",
  categorias: [{ id: 70, nivel: 6, rama: "damas", nombre_personalizado: null, cupo_parejas: null, premios: [] }],
};

test("en juego no se agregan categorías pero sí premios; la lista muestra el torneo", async ({ page }) => {
  await servidorFalso(page, { torneos: [structuredClone(TORNEO_EN_JUEGO)] });
  await page.goto("/mis-torneos");
  await expect(page.getByText("1 categoría")).toBeVisible();
  await page.getByRole("link", { name: /Copa Primavera/ }).click();
  await page.getByRole("tab", { name: /Categorías/ }).click();
  await expect(page.getByRole("button", { name: "Agregar categoría" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Quitar 6ta Damas/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Premios" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalizar torneo" })).toBeVisible();
});

test("con el plan vencido se ve todo pero en solo lectura", async ({ page }, info) => {
  await servidorFalso(page, { plan: PLAN_VENCIDO, torneos: [structuredClone(TORNEO_EN_JUEGO)] });
  await page.goto("/mis-torneos");
  await expect(page.getByText("Tu plan venció: podés ver tus torneos")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo torneo" })).toBeDisabled();
  await page.getByRole("link", { name: /Copa Primavera/ }).click();
  await expect(page.getByRole("link", { name: "Renovar" })).toHaveCount(1, { timeout: 5000 });
  await expect(page.getByRole("link", { name: "Renovar" })).toBeVisible();
  await expect(page.getByLabel("Nombre del torneo")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Guardar datos" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Finalizar torneo" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Reglamento" }).click();
  await expect(page.getByLabel("Reglamento")).toHaveValue("Sets a 6 games.");
  await expect(page.getByLabel("Reglamento")).toBeDisabled();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("solo_lectura.png"), fullPage: true });
});

test("un torneo ajeno o inexistente muestra 'no encontramos' y vuelve a la lista", async ({ page }) => {
  await servidorFalso(page);
  await page.goto("/mis-torneos/999");
  await expect(page.getByRole("alert")).toContainText("No encontramos ese torneo.");
  await expect(page.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
  await page.getByRole("link", { name: "Volver a mis torneos" }).click();
  await expect(page).toHaveURL(/\/mis-torneos$/);
});

test("un jugador no ve 'Mis torneos' y si entra por la dirección vuelve al inicio", async ({ page }, info) => {
  await servidorFalso(page, { roles: ["jugador"], plan: { es_organizador: false, dias_prueba: 14 } });
  await page.goto("/");
  if (info.project.name !== "desktop") await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("link", { name: "Mis torneos" })).toHaveCount(0);
  await page.goto("/mis-torneos");
  await expect(page).not.toHaveURL(/mis-torneos/);
});
