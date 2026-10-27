import { test, expect } from "@playwright/test";

const pareja = (id, nombre) => ({ id, nombre, cabeza_de_serie: false });
const [ana, caro, eli, gabi] = [pareja(11, "Ana / Bea"), pareja(12, "Caro / Dani"), pareja(21, "Eli / Flor"), pareja(22, "Gabi / Hebe")];
const fila = (p, posicion, pg, clasificado) => ({ inscripcion_id: p.id, posicion, pg, pj: 1, pp: 1 - pg, sets_favor: pg, sets_contra: 1 - pg, games_favor: 6, games_contra: 4, clasificado, pareja: p });

const FICHA = {
  id: 5, nombre: "Abierto de Verano", estado: "en_juego", sede: "Club Norte", direccion: null, localidad: null, fecha_inicio: "2026-12-05", fecha_fin: null,
  contacto: null, descripcion: null, reglamento: null, inscripcion_abierta: false,
  categorias: [{ id: 51, nombre: "4ta Caballeros", cupo_parejas: null, confirmadas: 4, lugares_libres: null, premios: [] }, { id: 52, nombre: "Suma 13", cupo_parejas: null, confirmadas: 0, lugares_libres: null, premios: [] }],
};
const CUARTA = {
  categoria_id: 51, nombre: "4ta Caballeros", formato: { parejas_por_zona: 3, clasifican_por_zona: 1, formato_zona: "un_set_6" },
  zonas: [
    { id: 1, nombre: "A", completa: true, parejas: [ana, caro], tabla: [fila(ana, 1, 1, true), fila(caro, 2, 0, false)], partidos: [{ id: 1, formato: "un_set_6", pareja1: ana, pareja2: caro, sets: [[6, 4]], ganador_id: 11 }] },
    { id: 2, nombre: "B", completa: false, parejas: [eli, gabi], tabla: [fila(eli, 1, 0, false), fila(gabi, 2, 0, false)], partidos: [{ id: 2, formato: "un_set_6", pareja1: eli, pareja2: gabi, sets: null, ganador_id: null }] },
  ],
  llave: { armada: true, formato_llave: "un_set_6", rondas: [{ ronda: 1, nombre: "Final", partidos: [{ id: 9, pareja1: ana, pareja2: eli, sets: [[6, 3]], ganador_id: 11 }] }], podio: { campeon: ana, subcampeon: eli, semifinalistas: [] } },
};
const SUMA = { categoria_id: 52, nombre: "Suma 13", formato: CUARTA.formato, zonas: [], llave: { armada: false, rondas: [], podio: { campeon: null, subcampeon: null, semifinalistas: [] } } };

async function api(page) {
  const pedidos = [];
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const clave = `${request.method()} ${new URL(request.url()).pathname.replace(/^\/api/, "")}`;
    pedidos.push({ clave, autenticado: Boolean(request.headers().authorization) });
    if (clave === "GET /publico/torneos/5") return route.fulfill({ json: { ok: true, data: FICHA } });
    if (clave === "GET /publico/torneos/5/categorias/51") return route.fulfill({ json: { ok: true, data: CUARTA } });
    if (clave === "GET /publico/torneos/5/categorias/52") return route.fulfill({ json: { ok: true, data: SUMA } });
    if (clave === "GET /auth/me") return route.fulfill({ status: 401, json: { ok: false } });
    return route.fulfill({ json: { ok: true, data: [], textos: {}, pilares: [], contactos: [] } });
  });
  return pedidos;
}

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

test("sin cuenta se siguen la llave, las zonas y los resultados de cada categoría", async ({ page }, info) => {
  const pedidos = await api(page);
  await page.goto("/torneos/5");
  // Con la llave armada, se abre en la llave y muestra a los campeones.
  await expect(page.getByText("Campeones: Ana / Bea")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Final", exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("llave_publica.png"), fullPage: true });

  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByRole("heading", { name: "Zona A" })).toBeVisible();
  await expect(page.getByText("Por jugar")).toBeVisible();
  await expect(page.getByRole("table", { name: "Posiciones de la zona A" }).getByText("Clasifica")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("zonas_publicas.png"), fullPage: true });

  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect.poll(() => pedidos.filter((p) => p.clave === "GET /publico/torneos/5/categorias/51").length).toBe(2);

  await page.getByRole("tab", { name: "Suma 13" }).click();
  await expect(page.getByText("Las zonas todavía no se armaron.")).toBeVisible();
  expect(pedidos.filter((p) => p.clave.startsWith("GET /publico")).every((p) => !p.autenticado), "la vista pública no manda la sesión").toBe(true);
});

test("compartir copia el link del torneo", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "en celular abre el menú del sistema para compartir");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await api(page);
  await page.goto("/torneos/5");
  await page.evaluate(() => { delete Navigator.prototype.share; });
  await page.getByRole("button", { name: "Compartir" }).click();
  await expect(page.getByText("Link copiado")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/torneos\/5$/);
});
