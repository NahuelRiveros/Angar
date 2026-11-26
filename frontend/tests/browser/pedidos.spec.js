import { expect, test } from "@playwright/test";
import { projectModules } from "../../../proyecto/gate_config.js";

// Navegador con API simulada: datos sintéticos, sin servidor ni base. Solo corre donde el módulo está prendido.
test.skip(!projectModules.pedidos, "Este proyecto no tiene prendido pedidos.");

const variante = (id, nombre, extra) => ({ id, nombre, codigo: null, precio: "1000.00", precio_anterior: null, disponible: true, ...extra });
const FICHA = {
  id: 1, nombre: "Casco", slug: "casco", descripcion: null, fotos: [], precio: "1000.00", precio_anterior: null, desde: true, disponible: true, con_opciones: true,
  categorias: [{ nombre: "Cascos", slug: "cascos" }], variantes: [variante(11, "M"), variante(12, "L", { precio: "1500.50" }), variante(13, "XL", { precio: null })],
};
const TARJETA = { id: 2, nombre: "Cadena", slug: "cadena", foto: null, categoria: "Repuestos", precio: "300.00", precio_anterior: null, desde: false, disponible: true, con_opciones: false, variante_id: 21 };
const SEGUIMIENTO = {
  numero: 7, clave: "c".repeat(24), estado: "confirmado", nombre: "Ana", entrega: "retiro", total: "2000.00", creado_en: "2026-11-25T13:00:00Z",
  items: [{ producto_nombre: "Casco", variante_nombre: "M", precio: "1000.00", cantidad: 2, subtotal: "2000.00" }],
  historial: [{ estado: "recibido", creado_en: "2026-11-25T13:00:00Z" }, { estado: "confirmado", creado_en: "2026-11-25T14:00:00Z" }],
};
const DETALLE = {
  id: 7, numero: 7, estado: "recibido", version: 3, nombre: "Ana Gómez", celular: "1123456789", entrega: "envio", direccion: "Calle 1", localidad: "Centro", nota: null, usuario_id: null,
  total: "2000.00", creado_en: "2026-11-25T13:00:00Z", items: [{ id: 1, producto_nombre: "Casco", variante_nombre: "M", codigo: null, precio: "1000.00", cantidad: 2, subtotal: "2000.00" }],
  historial: [{ de: null, a: "recibido", motivo: null, persona: null, creado_en: "2026-11-25T13:00:00Z" }],
  siguientes: [{ estado: "confirmado", tipo: "avanzar", pideMotivo: false }, { estado: "cancelado", tipo: "cancelar", pideMotivo: true }],
};

async function simular(page, { permisos = null, responder = {} } = {}) {
  const llamadas = [];
  const pagina = (items) => ({ items, paginacion: { page: 1, totalPages: 1, total: items.length } });
  const base = {
    "GET /banners": { carrusel: [], cinta: [] },
    "GET /catalogo/categorias": [{ id: 1, padre_id: null, nombre: "Cascos", slug: "cascos" }], "GET /catalogo/destacados": [],
    "GET /catalogo/productos": pagina([TARJETA]), "GET /catalogo/productos/casco": FICHA,
    "POST /pedidos": { numero: 7, clave: SEGUIMIENTO.clave, total: "2000.00" }, [`GET /pedidos/seguir/${SEGUIMIENTO.clave}`]: SEGUIMIENTO,
    "GET /pedidos/panel": { ...pagina([{ numero: 7, estado: "recibido", nombre: "Ana Gómez", celular: "1123456789", entrega: "envio", total: "2000.00", unidades: 2, creado_en: "2026-11-25T13:00:00Z" }]), por_estado: { recibido: 1, entregado: 4 } },
    "GET /pedidos/panel/7": DETALLE, "PATCH /pedidos/panel/7/estado": DETALLE,
  };
  if (permisos) await page.addInitScript(() => localStorage.setItem("token", "sesion-de-prueba"));
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE" };
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const pedido = route.request();
    if (pedido.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(pedido.url());
    const clave = `${pedido.method()} ${url.pathname.replace(/^\/api/, "")}`;
    llamadas.push({ clave, query: Object.fromEntries(url.searchParams), cuerpo: pedido.postDataJSON?.() ?? null });
    if (clave === "GET /auth/me") return route.fulfill({ status: permisos ? 200 : 401, headers: cors, json: permisos ? { ok: true, usuario: { id: 1, nombre: "Eva", apellido: "Prueba", roles: ["supervisor"], permisos } } : { ok: false } });
    const especial = responder[clave];
    if (especial) {
      const respuesta = typeof especial === "function" ? await especial(llamadas.filter((l) => l.clave === clave).length) : especial;
      if (respuesta) return route.fulfill({ headers: cors, ...respuesta });
    }
    return route.fulfill({ headers: cors, json: { ok: true, mensaje: "Hecho.", data: base[clave] ?? [] } });
  });
  return { de: (clave) => llamadas.filter((l) => l.clave === clave) };
}

const sinDesborde = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
const carrito = (items) => ({ actualizado: Date.now(), items });
const conCarrito = (page, items) => page.addInitScript((valor) => { if (!sessionStorage.getItem("listo")) { localStorage.setItem("tienda_carrito", valor); sessionStorage.setItem("listo", "1"); } }, JSON.stringify(carrito(items)));
const LINEA_M = { variante_id: 11, producto: "Casco", opcion: "M", precio: "1000.00", foto: null, slug: "casco", cantidad: 2 };
const LINEA_CADENA = { variante_id: 21, producto: "Cadena", opcion: null, precio: "300.00", foto: null, slug: "cadena", cantidad: 1 };

async function completarDatos(page) {
  await page.getByLabel("Nombre y apellido").fill("Ana Gómez");
  await page.getByLabel("Celular").fill("11 2345-6789");
}

test("MPE-01 y MCA-03: se agrega desde la ficha y la tarjeta; el carrito sigue ahí al recargar", async ({ page }) => {
  await simular(page);
  await page.goto("/catalogo/casco");
  await page.getByRole("button", { name: "L", exact: true }).click();
  await page.getByRole("button", { name: "Aumentar cantidad" }).click();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByText("Agregaste 2 al carrito.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Carrito: 2 unidades" })).toBeVisible();
  await page.getByRole("button", { name: "XL" }).click();
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
  await page.goto("/catalogo");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("link", { name: "Carrito: 3 unidades" })).toBeVisible();
  await page.goto("/carrito");
  await expect(page.getByText("$ 3.301")).toBeVisible();
  await page.getByRole("button", { name: "Quitar Cadena" }).click();
  await expect(page.getByText("$ 3.001").first()).toBeVisible();
  await sinDesborde(page);
});

test("MPE-02 y MPE-12: manda solo variante y cantidad; el envío pide dirección; al terminar va al seguimiento", async ({ page }) => {
  const api = await simular(page);
  await conCarrito(page, [LINEA_M]);
  await page.goto("/carrito");
  await completarDatos(page);
  await page.getByLabel("Envío a coordinar").check();
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByText("Escribí la dirección de entrega.")).toBeVisible();
  expect(api.de("POST /pedidos")).toHaveLength(0);
  await page.getByLabel("Dirección").fill("Calle 1");
  await page.getByLabel("Localidad").fill("Centro");
  await sinDesborde(page);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page).toHaveURL(new RegExp(`/pedido/${SEGUIMIENTO.clave}\\?nuevo=1$`));
  await expect(page.getByText("¡Recibimos tu pedido, Ana!")).toBeVisible();
  const [{ cuerpo }] = api.de("POST /pedidos");
  expect(cuerpo).toMatchObject({ nombre: "Ana Gómez", entrega: "envio", direccion: "Calle 1", localidad: "Centro", items: [{ variante_id: 11, cantidad: 2, precio_visto: "1000.00" }] });
  expect(Object.keys(cuerpo.items[0]).sort()).toEqual(["cantidad", "precio_visto", "variante_id"]);
  await expect(page.getByRole("link", { name: "Carrito vacío" })).toBeVisible();
});

test("MPE-03: si cambió algo, el carrito se corrige, se explica qué pasó y no se pierde lo escrito", async ({ page }) => {
  const cambios = [{ variante_id: 11, tipo: "precio", nombre: "Casco (M)", precio: "1200.00" }, { variante_id: 21, tipo: "no_disponible", nombre: "Cadena" }];
  await simular(page, { responder: { "POST /pedidos": (n) => (n === 1 ? { status: 409, json: { ok: false, codigo: "CARRITO_CAMBIO", mensaje: "x", datos: { cambios } } } : null) } });
  await conCarrito(page, [LINEA_M, LINEA_CADENA]);
  await page.goto("/carrito");
  await completarDatos(page);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("alert")).toContainText("Casco (M): ahora cuesta $ 1.200.");
  await expect(page.getByRole("alert")).toContainText("Cadena ya no está disponible");
  await expect(page.getByRole("button", { name: "Quitar Cadena" })).toHaveCount(0);
  await expect(page.getByText("$ 2.400").first()).toBeVisible();
  await expect(page.getByLabel("Celular")).toHaveValue("11 2345-6789");
});

test("MPE-04: un reintento después de un error usa la misma clave; el doble clic manda uno solo", async ({ page }) => {
  let soltar;
  const espera = new Promise((listo) => { soltar = listo; });
  const api = await simular(page, { responder: { "POST /pedidos": async (n) => {
    if (n === 1) return { status: 500, json: { ok: false, mensaje: "Error interno del servidor" } };
    await espera;
    return null;
  } } });
  await conCarrito(page, [LINEA_M]);
  await page.goto("/carrito");
  await completarDatos(page);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByText("Error interno del servidor")).toBeVisible();
  await page.getByRole("button", { name: "Enviar pedido" }).dblclick();
  await expect(page.getByRole("button", { name: "Enviando…" })).toBeDisabled();
  soltar();
  await expect(page).toHaveURL(/\/pedido\//);
  const envios = api.de("POST /pedidos");
  expect(envios).toHaveLength(2);
  expect(envios[1].cuerpo.clave_envio).toBe(envios[0].cuerpo.clave_envio);
});

test("MPE-09: el seguimiento muestra los pasos; un link que no existe lo dice", async ({ page }) => {
  await simular(page, { responder: { [`GET /pedidos/seguir/${"x".repeat(24)}`]: { status: 404, json: { ok: false, mensaje: "No encontramos ese pedido." } } } });
  await page.goto(`/pedido/${SEGUIMIENTO.clave}`);
  await expect(page.getByRole("heading", { name: "Pedido #7" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Estado: Confirmado" }).locator("[aria-current=step]")).toContainText("Confirmado");
  await expect(page.getByText("¡Recibimos tu pedido")).toHaveCount(0);
  await sinDesborde(page);
  await page.goto(`/pedido/${"x".repeat(24)}`);
  await expect(page.getByRole("heading", { name: "No encontramos ese pedido" })).toBeVisible();
});

test("MPE-10: el panel lista por estado con sus cantidades y busca", async ({ page }) => {
  const api = await simular(page, { permisos: ["pedidos.ver"] });
  await page.goto("/admin/pedidos");
  await expect(page.getByRole("button", { name: "Todos 5" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Entregado 4" }).click();
  await expect.poll(() => api.de("GET /pedidos/panel").at(-1).query.estado).toBe("entregado");
  await page.getByRole("searchbox", { name: "Buscar pedidos" }).fill("Ana");
  await expect.poll(() => api.de("GET /pedidos/panel").at(-1).query).toMatchObject({ q: "Ana", estado: "entregado" });
  await sinDesborde(page);
});

test("MPE-07 y MPE-08: avanzar manda la versión; cancelar pide motivo; si otro lo cambió, ofrece actualizar", async ({ page }) => {
  const api = await simular(page, { permisos: ["pedidos.ver", "pedidos.gestionar"], responder: {
    "PATCH /pedidos/panel/7/estado": (n) => (n === 2 ? { status: 409, json: { ok: false, codigo: "CAMBIO_SIMULTANEO", mensaje: "Otra persona cambió este pedido recién. Actualizalo para ver cómo quedó." } } : null),
  } });
  await page.goto("/admin/pedidos/7");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect.poll(() => api.de("PATCH /pedidos/panel/7/estado").length).toBe(1);
  expect(api.de("PATCH /pedidos/panel/7/estado")[0].cuerpo).toEqual({ estado: "confirmado", motivo: null, version: 3 });
  await page.getByRole("button", { name: "Cancelar pedido" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar pedido" }).click();
  await expect(page.getByText("Escribí el motivo.")).toBeVisible();
  await page.getByLabel("Motivo").fill("No contesta");
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar pedido" }).click();
  await expect(page.getByRole("alert")).toContainText("Otra persona cambió este pedido");
  await expect(page.getByRole("button", { name: "Confirmar" })).toHaveCount(0);
  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect(page.getByRole("button", { name: "Confirmar" })).toBeVisible();
  await sinDesborde(page);
});

test("MPE-10: con «Ver pedidos» no hay botones para cambiar; sin permisos no se entra", async ({ page }) => {
  await simular(page, { permisos: ["pedidos.ver"] });
  await page.goto("/admin/pedidos/7");
  await expect(page.getByRole("heading", { name: "Pedido #7" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar" })).toHaveCount(0);
});

test("MPE-10: sin permisos de pedidos no se ve el panel de pedidos", async ({ page }) => {
  await simular(page, { permisos: ["catalogo.editar"] });
  await page.goto("/admin/pedidos");
  await expect(page.getByRole("heading", { name: "Pedidos" })).toHaveCount(0);
});
