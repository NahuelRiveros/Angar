import { test, expect } from "@playwright/test";
import { EDICION_POR_ESTADO, TRANSICIONES } from "../../../torneo_config.js";

const PLAN = { es_organizador: true, vigente: true, estado: "activo", dias_restantes: 20, mensaje: "Plan activo.", medios_pago: { mercadopago: false, transferencia: null } };
const TORNEO = {
  id: 9, nombre: "Copa Club", estado: "en_juego", sede: "Club Sur", fecha_inicio: "2026-12-05", fecha_fin: null, descripcion: null, direccion: null, localidad: null, contacto: null, reglamento: null,
  edicion: EDICION_POR_ESTADO.en_juego, transiciones: TRANSICIONES.en_juego,
  categorias: [{ id: 91, nombre: "6ta Damas", nivel: 6, rama: "damas", nombre_personalizado: null, cupo_parejas: null, parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", formato_llave: "un_set_6", premios: [] }],
};
const P = { 11: "Ana / Bea", 12: "Caro / Dani", 21: "Eli / Flor", 22: "Gabi / Hebe" };
const pareja = (id) => (id ? { id, nombre: P[id] } : null);

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

/** Llave simulada de 4 (semis 1ºA-2ºB y 1ºB-2ºA + final) que avanza como el servidor. */
async function servidor(page, { zonasCompletas = true } = {}) {
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  let partidos = [];
  const pedidos = [];
  const detalle = () => {
    const final = partidos.find((p) => p.ronda === 2);
    const perdedor = (p) => (p.ganador_id === p.pareja1_id ? p.pareja2_id : p.pareja1_id);
    const vista = (p) => ({ id: p.id, orden: p.orden, formato: "un_set_6", pareja1: pareja(p.pareja1_id), pareja2: pareja(p.pareja2_id), sets: p.sets, ganador_id: p.ganador_id });
    return {
      categoria_id: 91, formato_llave: "un_set_6", armada: partidos.length > 0, con_resultados: partidos.some((p) => p.sets),
      zonas_completas: zonasCompletas, zonas_pendientes: zonasCompletas ? [] : ["B"],
      rondas: partidos.length ? [{ ronda: 1, nombre: "Semifinal", partidos: partidos.filter((p) => p.ronda === 1).map(vista) }, { ronda: 2, nombre: "Final", partidos: [vista(final)] }] : [],
      podio: {
        campeon: pareja(final?.ganador_id), subcampeon: final?.ganador_id ? pareja(perdedor(final)) : null,
        semifinalistas: final?.ganador_id ? partidos.filter((p) => p.ronda === 1).map((p) => pareja(perdedor(p))) : [],
      },
    };
  };
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const clave = `${request.method()} ${new URL(request.url()).pathname.replace(/^\/api/, "")}`;
    let body = null;
    try { body = request.postDataJSON(); } catch { /* sin cuerpo */ }
    pedidos.push({ clave, body });
    const ok = (mensaje) => route.fulfill({ json: { ok: true, mensaje, data: detalle() } });
    if (clave === "GET /auth/me") return route.fulfill({ json: { ok: true, usuario: { usuario_id: 8, nombre: "Eva", roles: ["organizador"], permisos: [] } } });
    if (clave === "GET /suscripcion/mia") return route.fulfill({ json: { ok: true, data: PLAN } });
    if (clave === "GET /torneos/9") return route.fulfill({ json: { ok: true, data: TORNEO } });
    if (clave === "GET /torneos/9/categorias/91/llave") return route.fulfill({ json: { ok: true, data: detalle() } });
    if (clave === "POST /torneos/9/categorias/91/llave/armar") {
      partidos = [
        { id: 1, ronda: 1, orden: 0, pareja1_id: 11, pareja2_id: 22, sets: null, ganador_id: null },
        { id: 2, ronda: 1, orden: 1, pareja1_id: 21, pareja2_id: 12, sets: null, ganador_id: null },
        { id: 3, ronda: 2, orden: 0, pareja1_id: null, pareja2_id: null, sets: null, ganador_id: null },
      ];
      return ok("Llave armada.");
    }
    if (clave === "POST /torneos/9/categorias/91/llave/deshacer") { partidos = []; return ok("Llave deshecha: ya podés corregir las zonas."); }
    const resultado = /^PUT \/torneos\/9\/partidos\/(\d+)\/resultado$/.exec(clave);
    if (resultado) {
      const p = partidos.find((x) => x.id === Number(resultado[1]));
      const [a, b] = body.sets[0];
      const ganador = a > b ? p.pareja1_id : p.pareja2_id;
      const final = partidos.find((x) => x.ronda === 2);
      if (p.ronda === 1) {
        const lado = p.orden === 0 ? "pareja1_id" : "pareja2_id";
        if (final.sets && final[lado] !== ganador) return route.fulfill({ status: 409, json: { ok: false, mensaje: "El partido siguiente ya tiene resultado: borralo antes de cambiar quién ganó este." } });
        final[lado] = ganador;
      }
      Object.assign(p, { sets: body.sets, ganador_id: ganador });
      return ok("Resultado guardado.");
    }
    return route.fulfill({ json: { ok: true, data: [] } });
  });
  return pedidos;
}

test("con zonas sin terminar la llave no se puede armar y dice qué falta", async ({ page }) => {
  await servidor(page, { zonasCompletas: false });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Llave" }).click();
  await expect(page.getByText("Faltan resultados en la zona B.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Armar llave" })).toBeDisabled();
});

test("organizador arma la llave, carga semis y final, y ve el podio", async ({ page }, info) => {
  const pedidos = await servidor(page);
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Llave" }).click();
  await page.getByRole("button", { name: "Armar llave" }).click();
  await expect(page.getByRole("heading", { name: "Semifinal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Final", exact: true })).toBeVisible();
  await expect(page.getByText("A definir")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Deshacer llave" })).toBeVisible();

  await page.getByRole("button", { name: "Cargar resultado de Ana / Bea contra Gabi / Hebe" }).click();
  let modal = page.getByRole("dialog", { name: "Resultado del partido" });
  await modal.getByLabel("Set: games de Ana / Bea").fill("6");
  await modal.getByLabel("Set: games de Gabi / Hebe").fill("2");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText("A definir")).toHaveCount(1, { timeout: 5000 });
  await expect(page.getByRole("button", { name: "Deshacer llave" })).toHaveCount(0, { timeout: 5000 });

  await page.getByRole("button", { name: "Cargar resultado de Eli / Flor contra Caro / Dani" }).click();
  modal = page.getByRole("dialog", { name: "Resultado del partido" });
  await modal.getByLabel("Set: games de Eli / Flor").fill("4");
  await modal.getByLabel("Set: games de Caro / Dani").fill("6");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal).toHaveCount(0);

  await page.getByRole("button", { name: "Cargar resultado de Ana / Bea contra Caro / Dani" }).click();
  modal = page.getByRole("dialog", { name: "Resultado del partido" });
  await modal.getByLabel("Set: games de Ana / Bea").fill("7");
  await modal.getByLabel("Set: games de Caro / Dani").fill("5");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(page.getByRole("heading", { name: "Campeones: Ana / Bea" })).toBeVisible();
  await expect(page.getByText("Subcampeones: Caro / Dani")).toBeVisible();
  await expect(page.getByText("Semifinalistas: Gabi / Hebe · Eli / Flor")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("llave.png"), fullPage: true });

  // Cambiar quién ganó una semi con la final jugada: el error se ve en el modal.
  await page.getByRole("button", { name: /Corregir resultado de Ana \/ Bea contra Gabi \/ Hebe/ }).click();
  modal = page.getByRole("dialog", { name: "Resultado del partido" });
  await modal.getByLabel("Set: games de Ana / Bea").fill("3");
  await modal.getByLabel("Set: games de Gabi / Hebe").fill("6");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal.getByRole("alert")).toContainText("borralo antes de cambiar quién ganó");
  expect(pedidos.filter((p) => p.clave.startsWith("PUT")).length).toBe(4);
});

test("deshacer la llave sin resultados vuelve a dejarla para armar", async ({ page }) => {
  const pedidos = await servidor(page);
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Llave" }).click();
  await page.getByRole("button", { name: "Armar llave" }).click();
  await page.getByRole("button", { name: "Deshacer llave" }).click();
  await page.getByRole("button", { name: "Deshacer llave" }).last().click();
  await expect(page.getByRole("button", { name: "Armar llave" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Final", exact: true })).toHaveCount(0);
  expect(pedidos.some((p) => p.clave === "POST /torneos/9/categorias/91/llave/deshacer")).toBe(true);
});
