import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => {
    const config = new URL(route.request().url()).pathname.endsWith("/home/config");
    return route.fulfill({ json: config ? { ok: true, textos: {}, pilares: [], contactos: [] } : { ok: true, data: [] } });
  });
});

test("jugadores: rota cada dos segundos, completa el ciclo y permite pausar", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const selector = page.getByRole("group", { name: "Elegir jugador destacado" });
  const jugador = (name) => selector.getByRole("button", { name, exact: true });
  await expect(jugador("Tapia")).toHaveAttribute("aria-pressed", "true");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await jugador("Tapia").click();
  await page.getByRole("heading", { level: 1 }).click();
  await page.clock.runFor(1999);
  await expect(jugador("Tapia")).toHaveAttribute("aria-pressed", "true");
  await page.clock.runFor(1);
  await expect(jugador("Delfi Brea")).toHaveAttribute("aria-pressed", "true");
  for (const nombre of ["Stupa", "Chingotto", "Tapia"]) {
    await page.clock.runFor(2000);
    await expect(jugador(nombre)).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Pausar carrusel de jugadores" }).click();
  await page.getByRole("heading", { level: 1 }).click();
  await page.clock.runFor(6000);
  await expect(jugador("Tapia")).toHaveAttribute("aria-pressed", "true");
  await jugador("Stupa").click();
  await expect(jugador("Stupa")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reanudar carrusel de jugadores" }).click();
  await page.getByRole("heading", { level: 1 }).click();
  await page.clock.runFor(2000);
  await expect(jugador("Chingotto")).toHaveAttribute("aria-pressed", "true");
});

test("jugadores: respeta movimiento reducido y permite elegir manualmente", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const tapia = page.getByRole("button", { name: "Tapia", exact: true });
  await expect(tapia).toHaveAttribute("aria-pressed", "true");
  await page.clock.runFor(6000);
  await expect(tapia).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Delfi Brea", exact: true }).click();
  await expect(page.getByRole("button", { name: "Delfi Brea", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("navbar: marca, navegación y cierre accesible en mobile", async ({ page }, info) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navegación principal", exact: true });
  await expect(nav.getByRole("link", { name: "MiPadelCup", exact: true })).toBeVisible();
  await expect(page).toHaveTitle(/MiPadelCup/);
  if (info.project.name !== "desktop") {
    const abrir = page.getByRole("button", { name: "Abrir menú" });
    await abrir.click();
    const dialog = page.getByRole("dialog", { name: "Menú de navegación" });
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: info.outputPath("menu-mobile.png") });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(abrir).toBeFocused();
    await abrir.click();
    await page.getByRole("navigation", { name: "Navegación móvil" }).getByRole("link", { name: "Torneos", exact: true }).click();
    await expect(dialog).not.toBeVisible();
  } else {
    await nav.getByRole("link", { name: "Torneos", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/torneos$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("navbar: tamaños intermedios sin enlaces recortados", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Cobertura de tamaños desde desktop.");
  await page.goto("/");
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const nav = page.getByRole("navigation", { name: "Navegación principal", exact: true });
    await expect(nav.getByRole("link", { name: "MiPadelCup", exact: true })).toBeVisible();
    if (width >= 1024) {
      await expect(nav.getByRole("link", { name: "Torneos", exact: true })).toBeVisible();
      await expect(nav.getByRole("button", { name: "Abrir menú" })).not.toBeVisible();
    } else {
      await expect(nav.getByRole("button", { name: "Abrir menú" })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    if ([320, 1024, 1440].includes(width)) await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: false, animations: "disabled" });
  }
});
