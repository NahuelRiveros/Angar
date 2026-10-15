import { test, expect } from "@playwright/test";
const product = { id: 1, nombre: "Arroz largo fino", marca: "Marca de prueba", categoria: { id: 1, nombre: "Almacén" }, variedades: [{ id: 11, nombre: "Paquete 1 kg", precio: 1200, controla_stock: true, cantidad: 200, iva_porcentaje: 21 }] };
// Reemplaza el script de Google: el botón falso entrega una credencial de prueba, sin internet.
const GOOGLE_FALSO = `window.google = { accounts: { id: {
  initialize(config) { window.__google = config; },
  renderButton(el) { const b = document.createElement("button"); b.type = "button"; b.textContent = "Continuar con Google";
    b.onclick = () => window.__google.callback({ credential: "credencial-de-prueba" }); el.replaceChildren(b); },
} } };`;
async function mockApi(page, initialCart = []) {
  await page.route("https://accounts.google.com/gsi/client", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: GOOGLE_FALSO }));
  let cart = initialCart;
  const updates = [];
  let submitted = [];
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method();
    const body = request.postDataJSON();
    let data = { ok: true, data: [] };
    if (path === "/distribuidora/productos") data = { ok: true, data: [{ ...product, id: url.searchParams.get("pagina") === "2" ? 2 : 1 }], total: 25, total_paginas: 2 };
    else if (path.startsWith("/distribuidora/productos/")) data = { ok: true, data: product };
    else if (path === "/distribuidora/catalogos/categorias") data = { ok: true, data: [{ id: 1, nombre: "Almacén", padre_id: null }] };
    else if (path === "/auth/login") data = { ok: true, token: "mock-session" };
    else if (path === "/auth/me") data = { ok: true, usuario: { usuario_id: 7, nombre: "Ana", apellido: "Cliente", roles: ["cliente"] } };
    else if (path === "/auth/register") data = { ok: true };
    else if (path === "/modulos/estado") data = { ok: true, modulos: { eccomerce_distribuidora: true } };
    else if (path === "/distribuidora/carrito/merge") {
      cart = body.items.map((i) => ({ ...i, item_id: 50, nombre: product.nombre, variante: "Paquete 1 kg", precio: 1200, precio_al_agregar: 1200, stock_disponible: 200, activo: true, variante_disponible: true }));
      data = { ok: true, data: cart };
    } else if (path === "/distribuidora/carrito") data = { ok: true, data: cart };
    else if (path.startsWith("/distribuidora/carrito/items/") && method === "PUT") {
      updates.push(body.cantidad);
      await new Promise((r) => setTimeout(r, 250));
      const id = Number(path.split("/").at(-1));
      cart = cart.map((i) => i.item_id === id ? ({ ...i, cantidad: body.cantidad }) : i); data = { ok: true, data: cart };
    } else if (path.startsWith("/distribuidora/carrito/items/") && method === "DELETE") { cart = cart.filter((i) => i.item_id !== Number(path.split("/").at(-1))); data = { ok: true, data: cart }; }
    else if (path === "/distribuidora/mi-perfil") data = { ok: true, data: { cuit: "20-12345678-9", direccion: "Av. Prueba 123", provincia: "Buenos Aires", localidad: "La Plata" } };
    else if (path === "/distribuidora/notas-pedido" && method === "POST") { submitted.push(body); cart = []; data = { ok: true, data: { id: 123, total: body.expectedItems[0].cantidad * 1200 } }; }
    else if (path === "/home/config") data = { ok: true, textos: {}, pilares: [], contactos: [] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });
  return { submitted, updates };
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}
test("catálogo público, paginación y carrito visibles", async ({ page }, info) => {
  await mockApi(page);
  await page.goto("/distribuidora/catalogo");
  await expect(page.getByRole("heading", { name: "Productos", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver carrito, 0 unidades" })).toBeVisible();
  await noOverflow(page);
  if (info.project.name !== "desktop") {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("link", { name: "Crear cuenta", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
  }
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByRole("link", { name: "Ver carrito, 1 unidades" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Ver carrito, 1 unidades" })).toBeVisible();
});
test("el cliente conserva carrito al registrarse y confirma la cantidad guardada", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/distribuidora/catalogo");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByRole("link", { name: "Ver carrito, 1 unidades" })).toBeVisible();
  await page.getByRole("link", { name: "Ver carrito, 1 unidades" }).click();
  await noOverflow(page);
  await expect(page.getByRole("button", { name: "Quitar Arroz largo fino" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar con el pedido" }).click();
  await expect(page).toHaveURL(/login\?returnTo=/);
  await page.getByRole("link", { name: "Crear cuenta", exact: true }).click();
  await page.getByLabel(/^Nombre/).fill("Ana");
  await page.getByLabel(/^Apellido/).fill("Cliente");
  await page.getByLabel(/^Email/).fill("ana@example.test");
  await page.getByLabel(/^Contraseña/).fill("Clave1234");
  await page.getByLabel(/^Confirmar contraseña/).fill("Clave1234");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  await expect(page).toHaveURL(/distribuidora\/carrito$/);
  const quantity = page.getByRole("spinbutton", { name: "Cantidad de Arroz largo fino" });
  await expect(quantity).toHaveValue("1");
  await quantity.fill("12");
  await quantity.press("Tab");
  await expect(page.getByRole("button", { name: "Continuar con el pedido" })).toBeEnabled();
  await page.getByRole("button", { name: "Continuar con el pedido" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("12 × Arroz largo fino");
  await page.getByRole("button", { name: "Enviar pedido", exact: true }).click();
  await expect(page.getByRole("heading", { name: "¡Pedido #123 enviado!" })).toBeVisible();
  expect(api.submitted).toHaveLength(1);
  expect(api.submitted[0].expectedItems[0].cantidad).toBe(12);
  await noOverflow(page);
});
test("inicia sesión con nombre de usuario y muestra el error de credenciales", async ({ page }) => {
  await mockApi(page);
  const enviados = [];
  let rechazar = true;
  await page.route("**/api/auth/login", async (route) => {
    enviados.push(route.request().postDataJSON());
    if (rechazar) {
      rechazar = false;
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ ok: false, codigo: "CREDENCIALES_INVALIDAS", mensaje: "Email, usuario o contraseña incorrectos" }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, token: "mock-session" }) });
  });
  await page.goto("/login");
  await page.getByLabel(/^Email o usuario/).fill("ana.cliente");
  await page.getByLabel(/^Contraseña/).fill("mala");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Email, usuario o contraseña incorrectos")).toBeVisible();
  await noOverflow(page);
  await page.getByLabel(/^Contraseña/).fill("Clave1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/distribuidora\/catalogo/);
  expect(enviados).toEqual([{ identificador: "ana.cliente", password: "mala" }, { identificador: "ana.cliente", password: "Clave1234" }]);
});
test("registro con usuario opcional muestra si ya está en uso y valida el formato", async ({ page }) => {
  await mockApi(page);
  const registros = [];
  await page.route("**/api/auth/register", async (route) => {
    const body = route.request().postDataJSON();
    registros.push(body);
    const repetido = body.nombre_usuario === "ana";
    await route.fulfill({ status: repetido ? 400 : 201, contentType: "application/json", body: JSON.stringify(repetido ? { ok: false, codigo: "NOMBRE_USUARIO_DUPLICADO", mensaje: "Ese usuario ya está en uso. Probá con otro." } : { ok: true }) });
  });
  await page.goto("/register");
  await page.getByLabel(/^Nombre/).fill("Ana");
  await page.getByLabel(/^Apellido/).fill("Cliente");
  await page.getByLabel(/^Email/).fill("ana@example.test");
  await page.getByLabel(/^Usuario/).fill("ana cliente");
  await page.getByLabel(/^Contraseña/).fill("Clave1234");
  await page.getByLabel(/^Confirmar contraseña/).fill("Clave1234");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  await expect(page.getByText("Solo se permiten letras, números, punto, guion y guion bajo")).toBeVisible();
  expect(registros).toHaveLength(0);
  await page.getByLabel(/^Usuario/).fill("ana");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  await expect(page.getByText("Ese usuario ya está en uso. Probá con otro.")).toBeVisible();
  await noOverflow(page);
  await page.getByLabel(/^Usuario/).fill("Ana.Cliente");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  await expect(page).toHaveURL(/distribuidora\/catalogo/);
  expect(registros.map((r) => r.nombre_usuario)).toEqual(["ana", "Ana.Cliente"]);
});
test("continuar con Google envía la credencial, muestra errores y si Google no carga ofrece reintentar", async ({ page }) => {
  await mockApi(page);
  const enviados = [];
  let rechazar = true;
  await page.route("**/api/auth/google", async (route) => {
    enviados.push(route.request().postDataJSON());
    if (rechazar) {
      rechazar = false;
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ ok: false, codigo: "GOOGLE_EMAIL_NO_VERIFICADO", mensaje: "Tu cuenta de Google no tiene el email verificado. Ingresá con email y contraseña." }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, token: "mock-session" }) });
  });
  let googleCaido = true;
  await page.route("https://accounts.google.com/gsi/client", (route) => {
    if (googleCaido) { googleCaido = false; return route.abort(); }
    return route.fallback();
  });
  await page.goto("/login");
  await expect(page.getByText("No pudimos cargar el botón de Google")).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page.getByText("Tu cuenta de Google no tiene el email verificado")).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page).toHaveURL(/distribuidora\/catalogo/);
  expect(enviados).toEqual([{ credencial: "credencial-de-prueba" }, { credencial: "credencial-de-prueba" }]);
});
test("cantidades rápidas en varias líneas conservan el último cambio", async ({ page }) => {
  const row = { item_id: 50, producto_id: 1, variedad_id: 11, cantidad: 1, nombre: "Arroz largo fino", variante: "1 kg", precio: 1200, precio_al_agregar: 1200, stock_disponible: 200, activo: true, variante_disponible: true };
  const api = await mockApi(page, [row, { ...row, item_id: 51, producto_id: 2, variedad_id: 12, nombre: "Fideos" }]);
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  await page.goto("/distribuidora/carrito");
  const rice = page.getByRole("spinbutton", { name: "Cantidad de Arroz largo fino" });
  const pasta = page.getByRole("spinbutton", { name: "Cantidad de Fideos" });
  const request = page.waitForRequest((r) => r.method() === "PUT" && r.url().endsWith("/items/50"));
  await rice.fill("4"); await rice.press("Tab"); await request;
  await pasta.fill("8"); await pasta.press("Tab");
  await rice.fill("9"); await rice.press("Tab");
  await expect(page.getByRole("button", { name: "Continuar con el pedido" })).toBeEnabled();
  await expect(rice).toHaveValue("9"); await expect(pasta).toHaveValue("8");
  expect(api.updates).toEqual(expect.arrayContaining([4, 8, 9]));
  await page.getByRole("button", { name: "Continuar con el pedido" }).click();
  await expect(page.getByRole("dialog")).toContainText("9 × Arroz largo fino");
  await expect(page.getByRole("dialog")).toContainText("8 × Fideos");
});

test("cantidad rechazada vuelve al valor guardado y quitar cancela el cambio pendiente", async ({ page }) => {
  const row = { item_id: 50, producto_id: 1, variedad_id: 11, cantidad: 1, nombre: "Arroz largo fino", variante: "1 kg", precio: 1200, precio_al_agregar: 1200, stock_disponible: 200, activo: true, variante_disponible: true };
  const api = await mockApi(page, [row]);
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  await page.route("**/api/distribuidora/carrito/items/50", async (route) => {
    if (route.request().method() === "PUT") return route.fulfill({ status: 409, json: { mensaje: "Cambió la disponibilidad" } });
    return route.fallback();
  });
  await page.goto("/distribuidora/carrito");
  const quantity = page.getByRole("spinbutton", { name: "Cantidad de Arroz largo fino" });
  await quantity.fill("9"); await quantity.press("Tab");
  await expect(page.getByRole("alert")).toContainText("Cambió la disponibilidad");
  await expect(quantity).toHaveValue("1");
  await quantity.fill("5"); await quantity.press("Tab");
  await page.getByRole("button", { name: "Quitar Arroz largo fino" }).click();
  await expect(page.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
  expect(api.updates).toHaveLength(0);
});

test("una falla de red muestra reintento y nunca catálogo vacío", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/distribuidora/productos?**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ mensaje: "Temporal" }) }));
  await page.goto("/distribuidora/catalogo");
  await expect(page.getByRole("alert")).toContainText("No pudimos cargar los productos");
  await expect(page.getByRole("button", { name: "Reintentar", exact: true })).toBeVisible();
});

test("staff gestiona notas y registra cobros con historial en cualquier pantalla", async ({ page }, info) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { ok: true, usuario: { usuario_id: 8, nombre: "Eva", roles: ["staff"] } } }));
  const order = { id: 123, estado: "pendiente", estado_pago: "pendiente", total: 2400, monto_pagado: 0, fecha_alta: "2026-09-10T12:00:00Z", cuit: "20-12345678-9", direccion: "Av. Prueba 123", localidad: "La Plata", provincia: "Buenos Aires", usuario: { persona: { nombre: "Ana", apellido: "Cliente", email: "cliente.con.email.largo@example.test" } }, items: [{ id: 1, cantidad: 2, nombre_producto: product.nombre, subtotal: 2400 }], pagos: [], historial_estados: [] };
  const payments = [];
  await page.route("**/api/distribuidora/notas-pedido/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    if (path.endsWith("/todas")) return route.fulfill({ json: { ok: true, data: [order], page: 1, totalPages: 1, total: 1 } });
    if (path.endsWith("/estado")) {
      order.historial_estados.push({ id: 1, anterior: order.estado, nuevo: body.estado, motivo: body.motivo, fecha: "2026-09-10T13:00:00Z" });
      order.estado = body.estado;
    } else if (path.endsWith("/pagos")) {
      payments.push(body); order.monto_pagado = body.monto; order.estado_pago = "parcial";
      order.pagos.push({ id: 1, monto: body.monto, metodo: body.metodo, registrado_en: "2026-09-10T13:00:00Z", nota: body.nota });
    } else if (path.endsWith("/anular")) {
      order.pagos[0].anulado_en = "2026-09-10T14:00:00Z"; order.pagos[0].anulacion_motivo = body.motivo;
      order.monto_pagado = 0; order.estado_pago = "pendiente";
    }
    return route.fulfill({ json: { ok: true, data: order } });
  });
  await page.goto("/distribuidora/admin/notas-pedido");
  await expect(page.getByRole("heading", { name: "Notas de pedido", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Pedido #123/ }).click();
  await noOverflow(page);
  await page.getByRole("button", { name: "Pasar a en preparación" }).click();
  await expect(page.getByRole("dialog")).toContainText("Recibido → En preparación");
  await page.getByRole("button", { name: "Confirmar cambio", exact: true }).click();
  await expect(page.getByRole("region", { name: "Historial de estados" })).toContainText("Recibido → En preparación");
  await page.getByLabel(/^Importe recibido/).fill("1000");
  await page.getByLabel("Referencia u observación (opcional)").fill("Recibo 001");
  await page.getByRole("button", { name: "Registrar cobro recibido", exact: true }).click();
  await expect(page.getByText("Recibo 001", { exact: true })).toBeVisible();
  expect(payments).toHaveLength(1); expect(payments[0].key).toMatch(/^[a-f0-9-]{36}$/);
  await page.getByRole("button", { name: "Anular registro", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("no realiza una devolución");
  await page.getByLabel(/^Motivo/).fill("Importe cargado por error");
  await page.getByRole("button", { name: "Confirmar cambio", exact: true }).click();
  await expect(page.getByText(/Anulado por Equipo: Importe cargado por error/)).toBeVisible();
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("gestion-pedidos.png"), fullPage: true });
});
