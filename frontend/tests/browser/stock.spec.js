import { expect, test } from "@playwright/test";
import { projectModules } from "../../../proyecto/gate_config.js";

// Navegador con API simulada: datos sintéticos, sin servidor ni base. Solo corre donde el módulo está prendido.
test.skip(!projectModules.stock, "Este proyecto no tiene prendido stock.");

const fila = (variante_id, opcion, extra) => ({ variante_id, producto_id: 1, producto: "Casco", opcion, codigo: null, disponible: true, controla: true, cantidad: 5, minimo: 2, estado: "ok", ...extra });
const LISTA = [fila(1, "L", { cantidad: 0, estado: "agotado", disponible: false }), fila(2, "M", { cantidad: 2, estado: "bajo" }), fila(3, "XL", { controla: false, cantidad: null, minimo: null, estado: null })];
const MOVIMIENTOS = [{ id: 9, tipo: "pedido", cantidad: -3, saldo: 0, motivo: "Pedido #7", pedido_id: 7, persona: "Eva Prueba", creado_en: "2026-11-25T13:00:00Z" }, { id: 8, tipo: "inicio", cantidad: 3, saldo: 3, motivo: "Inicio del control de stock", pedido_id: null, persona: null, creado_en: "2026-11-25T12:00:00Z" }];
const PRODUCTO = { id: 1, nombre: "Casco", categoria_id: 1, descripcion: null, destacado: false, activo: true, version: 1, fotos: [], variantes: [
  { id: 1, nombre: "L", codigo: null, precio: "100.00", precio_anterior: null, disponible: false, disponible_por: "stock" },
  { id: 3, nombre: "XL", codigo: null, precio: "100.00", precio_anterior: null, disponible: true, disponible_por: null },
] };

async function simular(page, { permisos = ["stock.mover"], responder = {} } = {}) {
  const llamadas = [];
  const pagina = (items) => ({ items, paginacion: { page: 1, totalPages: 1, total: items.length } });
  const base = {
    "GET /stock": pagina(LISTA), "GET /stock/1/movimientos": pagina(MOVIMIENTOS),
    "GET /catalogo/panel/categorias": [{ id: 1, padre_id: null, nombre: "Cascos", slug: "cascos", orden: 0, activo: true }], "GET /catalogo/panel/productos/1": PRODUCTO,
  };
  await page.addInitScript(() => localStorage.setItem("token", "sesion-de-prueba"));
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE" };
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => {
    const pedido = route.request();
    if (pedido.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(pedido.url());
    const clave = `${pedido.method()} ${url.pathname.replace(/^\/api/, "")}`;
    llamadas.push({ clave, query: Object.fromEntries(url.searchParams), cuerpo: pedido.postDataJSON?.() ?? null });
    if (clave === "GET /auth/me") return route.fulfill({ headers: cors, json: { ok: true, usuario: { id: 1, nombre: "Eva", apellido: "Prueba", roles: ["supervisor"], permisos } } });
    if (responder[clave]) return route.fulfill({ headers: cors, ...responder[clave] });
    return route.fulfill({ headers: cors, json: { ok: true, mensaje: "Guardado.", data: base[clave] ?? [] } });
  });
  return { de: (clave) => llamadas.filter((l) => l.clave === clave) };
}

const sinDesborde = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

test("MST-06: muestra cantidades con su marca y filtra lo que hay que reponer", async ({ page }) => {
  const api = await simular(page);
  await page.goto("/admin/stock");
  await expect(page.getByText("Agotado", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Bajo", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Controlar stock de Casco (XL)" })).toBeVisible();
  await page.getByRole("button", { name: "Para reponer" }).click();
  await expect.poll(() => api.de("GET /stock").at(-1).query.estado).toBe("reponer");
  await sinDesborde(page);
});

test("MST-02 y MST-03: mover manda tipo, cantidad y motivo; el error del servidor queda en su campo", async ({ page }) => {
  const api = await simular(page, { responder: { "POST /stock/2/movimientos": { status: 400, json: { ok: false, mensaje: "Escribí el motivo.", errores: [{ campo: "motivo", mensaje: "Escribí el motivo." }] } } } });
  await page.goto("/admin/stock");
  await page.getByRole("button", { name: "Mover stock de Casco (M)" }).click();
  await page.getByLabel("Salida").check();
  await page.getByLabel("Cantidad", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(page.getByRole("dialog").getByText("Escribí el motivo.")).toBeVisible();
  expect(api.de("POST /stock/2/movimientos")[0].cuerpo).toEqual({ tipo: "salida", cantidad: "1", motivo: "" });
  await sinDesborde(page);
});

test("MST-01: controlar una opción manda lo que hay hoy y el mínimo", async ({ page }) => {
  const api = await simular(page);
  await page.goto("/admin/stock");
  await page.getByRole("button", { name: "Controlar stock de Casco (XL)" }).click();
  await page.getByLabel("¿Cuántas hay hoy?").fill("4");
  await page.getByRole("button", { name: "Empezar a controlar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(api.de("POST /stock/3/control")[0].cuerpo).toEqual({ cantidad: "4", minimo: 0 });
});

test("MST-02: los movimientos se ven con signo, saldo, motivo y persona", async ({ page }) => {
  await simular(page);
  await page.goto("/admin/stock");
  await page.getByRole("button", { name: "Movimientos de Casco (L)" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("-3")).toBeVisible();
  await expect(dialogo.getByText("Pedido #7")).toBeVisible();
  await expect(dialogo.getByText(/Eva Prueba/)).toBeVisible();
});

test("MOD-17: en el producto, la opción que controla stock no tiene casilla", async ({ page }) => {
  await simular(page, { permisos: ["catalogo.editar"] });
  await page.goto("/admin/catalogo/productos/1");
  await expect(page.getByText("Sin stock: lo calcula Stock con la cantidad cargada.")).toBeVisible();
  await expect(page.locator("[name='variantes.0.disponible']")).toHaveCount(0);
  await expect(page.locator("[name='variantes.1.disponible']")).toBeVisible();
});

test("MST-07: sin «Mover stock» no se entra", async ({ page }) => {
  await simular(page, { permisos: ["catalogo.editar"] });
  await page.goto("/admin/stock");
  await expect(page.getByRole("heading", { name: "Stock" })).toHaveCount(0);
});
