import { expect, test } from "@playwright/test";
import { projectModules } from "../../../proyecto/gate_config.js";

// Navegador con API simulada: datos sintéticos, sin servidor ni base. Solo corre donde el módulo está prendido.
test.skip(!projectModules.catalogo, "Este proyecto no tiene prendido el catálogo.");

const CATEGORIAS = [{ id: 1, padre_id: null, nombre: "Accesorios", slug: "accesorios" }, { id: 2, padre_id: 1, nombre: "Cascos", slug: "cascos" }];
const tarjeta = (extra) => ({ id: 1, nombre: "Casco", slug: "casco", foto: null, categoria: "Cascos", precio: "90000.00", precio_anterior: null, desde: false, disponible: true, con_opciones: false, variante_id: 1, ...extra });
const variante = (id, nombre, extra) => ({ id, nombre, codigo: null, precio: "90000.00", precio_anterior: null, disponible: true, ...extra });
const FICHA = {
  id: 1, nombre: "Casco", slug: "casco", descripcion: "Muy liviano.", fotos: [], precio: "90000.00", precio_anterior: null, desde: true, disponible: true, con_opciones: true,
  categorias: [{ nombre: "Accesorios", slug: "accesorios" }], variantes: [variante(1, "M", { disponible: false }), variante(2, "L", { codigo: "C-L" }), variante(3, "XL", { precio: null })],
};
const PANEL = { id: 7, nombre: "Casco", categoria_id: 2, descripcion: null, destacado: false, activo: true, version: 4, fotos: ["https://x.test/1.jpg", "https://x.test/2.jpg"], variantes: [variante(9, null, { precio: "100.50" })] };

async function simular(page, { permisos = null, responder = {} } = {}) {
  const llamadas = [];
  const pagina = (items) => ({ items, paginacion: { page: 1, totalPages: 1, total: items.length } });
  const base = {
    "GET /banners": { carrusel: [], cinta: [] },
    "GET /catalogo/categorias": CATEGORIAS, "GET /catalogo/destacados": [tarjeta()],
    "GET /catalogo/productos": pagina([tarjeta(), tarjeta({ id: 2, nombre: "Guantes", slug: "guantes", precio: null, disponible: false })]), "GET /catalogo/productos/casco": FICHA,
    "GET /catalogo/panel/categorias": CATEGORIAS.map((c) => ({ ...c, orden: 0, activo: true })), "GET /catalogo/panel/productos": pagina([]), "GET /catalogo/panel/productos/7": PANEL,
  };
  if (permisos) await page.addInitScript(() => localStorage.setItem("token", "sesion-de-prueba"));
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE" };
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => {
    const pedido = route.request();
    if (pedido.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(pedido.url());
    const clave = `${pedido.method()} ${url.pathname.replace(/^\/api/, "")}`;
    llamadas.push({ clave, query: Object.fromEntries(url.searchParams), cuerpo: pedido.postDataJSON?.() ?? null });
    if (clave === "GET /auth/me") return route.fulfill({ status: permisos ? 200 : 401, headers: cors, json: permisos ? { ok: true, usuario: { id: 1, nombre: "Eva", apellido: "Prueba", roles: ["supervisor"], permisos } } : { ok: false } });
    if (responder[clave]) return route.fulfill({ headers: cors, ...responder[clave] });
    return route.fulfill({ headers: cors, json: { ok: true, mensaje: "Guardado.", data: base[clave] ?? [] } });
  });
  return { de: (clave) => llamadas.filter((l) => l.clave === clave) };
}

const sinDesborde = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

test("MCA-03 y MCA-06: la lista muestra precio, «Consultar precio» y «Sin stock»; filtra por categoría y subcategoría", async ({ page }) => {
  const api = await simular(page);
  await page.goto("/catalogo");
  await expect(page.getByText("$ 90.000")).toBeVisible();
  await expect(page.getByText("Consultar precio")).toBeVisible();
  await expect(page.getByText("Sin stock").first()).toBeVisible();
  await expect(page.getByText("IVA incluido")).toHaveCount(0);
  await page.getByRole("button", { name: "Accesorios" }).click();
  await page.getByRole("button", { name: "Cascos", exact: true }).click();
  await expect(page).toHaveURL(/categoria=cascos/);
  await expect.poll(() => api.de("GET /catalogo/productos").at(-1).query.categoria).toBe("cascos");
  await sinDesborde(page);
});

test("MCA-06: si el catálogo falla se puede reintentar; sin resultados ofrece ver todo", async ({ page }) => {
  const responder = { "GET /catalogo/productos": { status: 500, json: { ok: false, mensaje: "Error interno del servidor" } } };
  await simular(page, { responder });
  await page.goto("/catalogo?q=nada");
  const reintentar = page.getByRole("button", { name: "Reintentar" });
  await expect(reintentar).toBeVisible({ timeout: 20000 });
  responder["GET /catalogo/productos"] = { json: { ok: true, data: { items: [], paginacion: { page: 1, totalPages: 0, total: 0 } } } };
  await reintentar.click();
  await page.getByRole("button", { name: "Ver todos" }).click();
  await expect(page).not.toHaveURL(/q=/);
});

test("MCA-02: la ficha arranca en la primera opción disponible y cambia precio y código al elegir otra", async ({ page }) => {
  await simular(page);
  await page.goto("/catalogo/casco");
  await expect(page.getByRole("button", { name: "L", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Código: C-L")).toBeVisible();
  await page.getByRole("button", { name: "XL" }).click();
  await expect(page.getByText("Consultar precio")).toBeVisible();
  await page.getByRole("button", { name: "M (sin stock)" }).click();
  await expect(page.getByText("Sin stock por ahora")).toBeVisible();
  await sinDesborde(page);
});

test("MCA-08: un producto que ya no está lo dice y lleva al catálogo", async ({ page }) => {
  await simular(page, { responder: { "GET /catalogo/productos/viejo": { status: 404, json: { ok: false, mensaje: "Ese producto ya no está publicado." } } } });
  await page.goto("/catalogo/viejo");
  await expect(page.getByText("Este producto ya no está")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver el catálogo" })).toHaveAttribute("href", "/catalogo");
});

test("MCA-01: los destacados se ven en el inicio", async ({ page }) => {
  await simular(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Destacados" })).toBeVisible();
  await sinDesborde(page);
});

test("MCA-02, MCA-04 y MCA-09: editar conserva los datos, suma una opción, reordena fotos y manda la versión", async ({ page }) => {
  const api = await simular(page, { permisos: ["catalogo.editar"] });
  await page.goto("/admin/catalogo/productos/7");
  await expect(page.locator("[name='variantes.0.precio']")).toHaveValue("100.5");
  await expect(page.locator("[name=categoria_id]")).toHaveValue("2");
  await expect(page.locator("[name='variantes.0.nombre']")).toHaveCount(0);
  await page.getByRole("button", { name: /Agregar opción/ }).click();
  await page.locator("[name='variantes.0.nombre']").fill("M");
  await page.locator("[name='variantes.1.nombre']").fill("L");
  await page.getByRole("button", { name: "Mover foto 2 antes" }).click();
  await sinDesborde(page);
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page).toHaveURL(/\/admin\/catalogo\/productos$/);
  const [{ cuerpo }] = api.de("PUT /catalogo/panel/productos/7");
  expect(cuerpo).toMatchObject({ version: 4, categoria_id: "2", fotos: ["https://x.test/2.jpg", "https://x.test/1.jpg"], variantes: [{ id: 9, nombre: "M" }, { id: null, nombre: "L" }] });
});

test("MCA-09: los errores del servidor se ven en su campo y no se pierde lo escrito", async ({ page }) => {
  await simular(page, { permisos: ["catalogo.editar"], responder: { "POST /catalogo/panel/productos": { status: 400, json: { ok: false, mensaje: "x", errores: [{ campo: "variantes.0.precio", mensaje: "El precio no puede ser negativo." }] } } } });
  await page.goto("/admin/catalogo/productos/nuevo");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByText("Escribí el nombre del producto.")).toBeVisible();
  await page.locator("[name=nombre]").fill("Casco");
  await page.locator("[name='variantes.0.precio']").fill("-1");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByText("El precio no puede ser negativo.")).toBeVisible();
  await expect(page.locator("[name=nombre]")).toHaveValue("Casco");
});

test("MCA-05: las subcategorías se crean dentro de su categoría", async ({ page }) => {
  const api = await simular(page, { permisos: ["catalogo.editar"] });
  await page.goto("/admin/catalogo/categorias");
  await page.getByRole("button", { name: "Agregar subcategoría a Accesorios" }).click();
  await page.locator("[name=nombre]").fill("Guantes");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect.poll(() => api.de("POST /catalogo/panel/categorias").length).toBe(1);
  expect(api.de("POST /catalogo/panel/categorias")[0].cuerpo).toMatchObject({ nombre: "Guantes", padre_id: "1" });
});

test("MCA-09: sin el permiso no se entra al panel del catálogo ni se ve en el menú", async ({ page }) => {
  await simular(page, { permisos: ["usuarios.gestionar"] });
  await page.goto("/admin/catalogo/productos");
  await expect(page.getByRole("heading", { name: "Productos" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Categorías" })).toHaveCount(0);
});
