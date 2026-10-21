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
    else if (path === "/distribuidora/mi-perfil") data = { ok: true, data: { nombre: "Ana", apellido: "Cliente", celular: "11 2345-6789", cuit: "20-12345678-9", direccion: "Av. Prueba 123", provincia: "Buenos Aires", localidad: "La Plata", completo: true } };
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
test("cliente de Google sin apellido completa sus datos en el primer pedido", async ({ page }) => {
  await mockApi(page, [{ producto_id: 1, variedad_id: 11, cantidad: 2, item_id: 50, nombre: product.nombre, variante: "Paquete 1 kg", precio: 1200, precio_al_agregar: 1200, stock_disponible: 200, activo: true, variante_disponible: true }]);
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  const guardados = [];
  let perfil = { nombre: "Gise", apellido: "", celular: "", cuit: null, direccion: null, provincia: null, localidad: null, completo: false };
  await page.route("**/api/distribuidora/mi-perfil", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      guardados.push(body);
      perfil = { ...body, completo: true };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: perfil }) });
  });
  await page.route("**/api/ubicacion/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: [{ id: 6, nombre: "Buenos Aires" }] }) }));
  await page.goto("/distribuidora/carrito");
  await expect(page.getByText("Completá tus datos antes de enviar.")).toBeVisible();
  await page.getByRole("button", { name: "Continuar con el pedido" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByRole("heading", { name: "Tus datos para el pedido" })).toBeVisible();
  await expect(modal.getByLabel(/^Nombre/)).toHaveValue("Gise");
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  // Con datos faltantes no se guarda nada y el formulario sigue abierto.
  await expect(modal).toBeVisible();
  expect(guardados).toHaveLength(0);
  await modal.getByLabel(/^Apellido/).fill("Google");
  await modal.getByLabel(/^Celular/).fill("11 2345-6789");
  await modal.getByLabel(/^CUIT/).fill("20-12345678-9");
  await modal.getByLabel(/^Dirección/).fill("Calle 1 234");
  await modal.getByLabel(/^Provincia/).selectOption("Buenos Aires");
  await modal.getByLabel(/^Localidad/).selectOption("Buenos Aires");
  await noOverflow(page);
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Gise Google · 11 2345-6789")).toBeVisible();
  expect(guardados[0]).toMatchObject({ nombre: "Gise", apellido: "Google", celular: "11 2345-6789", cuit: "20-12345678-9", provincia: "Buenos Aires" });
});
const RESUMEN_PANEL = {
  pedidos: {
    por_estado: { pendiente: 3, en_curso: 2, entregado: 9, cancelada: 1 },
    por_cobrar: { saldo: 4500, pedidos: 4 },
    ventas: { hoy: { pedidos: 2, monto: 2400 }, mes: { pedidos: 14, monto: 98000 } },
    ultimos: [{ id: 123, estado: "pendiente", estado_pago: "pendiente", total: 2400, fecha_alta: "2026-10-15T12:00:00Z", cliente: "Ana Cliente" }],
  },
  stock: { sin_stock: 6, productos_activos: 40, ejemplos_sin_stock: [{ id: 11, producto: "Arroz largo fino", presentacion: "Paquete 1 kg" }] },
};
// Así responde el servidor a staff y vendedor: cantidades sí, montos no.
const PEDIDOS_SIN_MONTOS = { ...RESUMEN_PANEL.pedidos, por_cobrar: null, ventas: null };
async function entrarComo(page, roles, resumen = RESUMEN_PANEL) {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { ok: true, usuario: { usuario_id: 8, nombre: "Eva", roles } } }));
  const pedidosResumen = [];
  await page.route("**/api/distribuidora/panel/resumen", (route) => { pedidosResumen.push(1); return route.fulfill({ json: { ok: true, data: resumen } }); });
  return pedidosResumen;
}
// En celular el menú lateral se abre con ☰; en escritorio está siempre visible.
async function menuPanel(page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole("button", { name: "Abrir menú del panel" }).click();
  return page.getByRole("navigation", { name: "Menú del panel" });
}
test("staff entra al panel desde el navbar y ve dashboard y menú de su rol", async ({ page }, info) => {
  await entrarComo(page, ["staff"], { ...RESUMEN_PANEL, pedidos: PEDIDOS_SIN_MONTOS });
  await page.goto("/");
  if (info.project.name === "desktop") {
    await expect(page.getByRole("button", { name: /Distribuidora · Gestión/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Panel de gestión" }).click();
  } else await page.goto("/panel");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: "Hola, Eva" })).toBeVisible();
  await expect(page.getByText("Saldo por cobrar")).toHaveCount(0); // montos solo para admin/super_admin
  await expect(page.getByText("Ventas de hoy")).toHaveCount(0);
  await expect(page.getByText("6 presentación(es) sin stock")).toBeVisible();
  await expect(page.getByText("Pedido #123 · Ana Cliente")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toHaveCount(0); // sin el footer de la tienda
  await noOverflow(page);
  const menu = await menuPanel(page);
  await expect(menu.getByRole("link", { name: "Artículos", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Personal" })).toHaveCount(0);           // solo admin
  await expect(menu.getByRole("link", { name: "Módulos habilitados" })).toHaveCount(0); // solo super_admin
  await menu.getByRole("link", { name: "Notas de pedido" }).click();
  await expect(page).toHaveURL(/distribuidora\/admin\/notas-pedido$/);
  await expect(page.getByRole("heading", { name: "Notas de pedido", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Menú del panel" })).toHaveCount(0);
});
test("vendedor ve solo pedidos; cliente no tiene panel; error del resumen ofrece reintentar", async ({ page }) => {
  await entrarComo(page, ["vendedor"], { pedidos: PEDIDOS_SIN_MONTOS, stock: null });
  await page.goto("/panel");
  await expect(page.getByText("Pedido #123 · Ana Cliente")).toBeVisible();
  await expect(page.getByText("Saldo por cobrar")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Stock" })).toHaveCount(0);
  const menu = await menuPanel(page);
  await expect(menu.getByRole("link", { name: "Notas de pedido" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Artículos", exact: true })).toHaveCount(0);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await entrarComo(page, ["cliente"]);
  await page.goto("/panel");
  await expect(page).not.toHaveURL(/\/panel/);
  await expect(page.getByRole("link", { name: "Panel de gestión" })).toHaveCount(0);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await entrarComo(page, ["admin"]);
  // Falla (también el reintento automático) hasta que el usuario toca "Reintentar".
  let fallar = true;
  await page.route("**/api/distribuidora/panel/resumen", (route) => fallar ? route.fulfill({ status: 500, json: { ok: false } }) : route.fallback());
  await page.goto("/panel");
  await expect(page.getByText("No pudimos cargar el resumen.")).toBeVisible();
  fallar = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("Saldo por cobrar")).toBeVisible();
  await expect(page.getByText("$ 4.500,00")).toBeVisible();

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await entrarComo(page, ["super_admin"], { pedidos: RESUMEN_PANEL.pedidos, stock: null });
  await page.goto("/panel");
  await expect(page.getByText("Ventas de hoy")).toBeVisible();
});
const ARTICULO = { id: 519, nombre: "9 de Oro Agridulce 20x200g", marca: "Cañuela", activo: true, categoria_id: 3, categoria: { id: 3, nombre: "Galletitas en gral" },
  variedades: [{ id: 51, precio: 1200, iva_porcentaje: 21, controla_stock: true, cantidad: 30, stock_minimo: 50, cod_ref: "000519", codigo_barras: "7790040001230", unidad_medida: "PAQUETE", unidad_bulto: "CAJA", unidades_por_bulto: 20, fecha_cambio_precio: "2026-05-26T12:00:00Z" }] };
async function gestionArticulos(page) {
  await entrarComo(page, ["staff"]);
  const pedidos = [];
  const guardados = [];
  await page.route("**/api/distribuidora/productos**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/marcas")) return route.fulfill({ json: { ok: true, data: ["Cañuela", "X5"] } });
    if (route.request().method() === "POST") { guardados.push(route.request().postDataJSON()); return route.fulfill({ status: 201, json: { ok: true, data: ARTICULO } }); }
    pedidos.push(Object.fromEntries(url.searchParams));
    return route.fulfill({ json: { ok: true, data: [ARTICULO], total: 1, pagina: 1, total_paginas: 1 } });
  });
  await page.route("**/api/distribuidora/catalogos/categorias", (route) => route.fulfill({ json: { ok: true, data: [{ id: 3, nombre: "Galletitas en gral", padre_id: null }] } }));
  return { pedidos, guardados };
}
test("artículos: tabla con código, bultos y stock bajo; filtros en la dirección; ficha con pestañas", async ({ page }) => {
  const { pedidos, guardados } = await gestionArticulos(page);
  await page.goto("/distribuidora/admin/productos");
  await expect(page.getByRole("heading", { name: "Artículos", exact: true })).toBeVisible();
  const listado = page.getByRole("region", { name: "Listado de artículos" });
  await expect(listado.getByText("000519").locator("visible=true").first()).toBeVisible();
  await expect(listado.getByText("Cañuela · Caja x 20 paquetes").locator("visible=true").first()).toBeVisible();
  await expect(listado.getByText("Stock bajo · mín. 50").locator("visible=true").first()).toBeVisible();
  await expect(listado.getByText("= 1 caja + 10 paquetes").locator("visible=true").first()).toBeVisible();
  await noOverflow(page);

  await page.getByLabel(/^Stock/).selectOption("bajo_minimo");
  await expect(page).toHaveURL(/stock=bajo_minimo/);
  await expect.poll(() => pedidos.at(-1)?.stock).toBe("bajo_minimo");

  await page.getByRole("button", { name: "Nuevo artículo" }).first().click();
  // La ficha es una página propia que recuerda los filtros para volver.
  await expect(page).toHaveURL(/\/distribuidora\/admin\/productos\/nuevo\?volver=/);
  const ficha = page;
  await ficha.getByLabel(/^Descripción del artículo/).fill("Lavandina X5 al 25% 1 lt");
  await page.getByRole("link", { name: "Volver" }).click();
  await expect(page.getByRole("dialog", { name: "Tenés cambios sin guardar" })).toBeVisible();
  await page.getByRole("button", { name: "Seguir editando" }).click();
  await expect(page).toHaveURL(/productos\/nuevo/);
  await ficha.getByPlaceholder("Ej: 000519").fill("002982");
  await ficha.getByRole("button", { name: "Guardar artículo" }).click();
  // Sin familia ni precio no se envía: queda en la pestaña con datos faltantes.
  await expect(ficha.getByRole("tab", { name: /Datos generales/ })).toHaveAttribute("aria-selected", "true");
  await ficha.getByRole("combobox", { name: /^Familia/ }).fill("galle");
  await ficha.getByRole("option", { name: /Galletitas en gral/ }).click();
  await ficha.getByRole("button", { name: "Guardar artículo" }).click();
  await expect(ficha.getByRole("tab", { name: /Precios/ })).toHaveAttribute("aria-selected", "true");
  await ficha.getByLabel(/^Precio de venta/).fill("1500");
  await ficha.getByRole("tab", { name: "Stock y unidades" }).click();
  await ficha.getByLabel(/^Se vende por/).selectOption("BOTELLA");
  await ficha.getByLabel(/^Unidades por bulto/).fill("12");
  await expect(ficha.getByText("1 caja = 12 botellas")).toBeVisible();
  await noOverflow(page);
  await ficha.getByRole("button", { name: "Guardar artículo" }).click();
  await expect(page).toHaveURL(/\/distribuidora\/admin\/productos\?stock=bajo_minimo$/);
  expect(guardados).toHaveLength(1);
  expect(guardados[0]).toMatchObject({ categoria_id: 3, nombre: "Lavandina X5 al 25% 1 lt", cod_ref: "002982", precio: 1500, unidad_medida: "BOTELLA", unidad_bulto: "CAJA", unidades_por_bulto: 12 });
});
test("lista de carga: elegir pedidos, ver artículos por familia en bultos y sueltos e imprimir", async ({ page }) => {
  await entrarComo(page, ["vendedor"]);
  const persona = { nombre: "Ana", apellido: "Cliente" };
  await page.route("**/api/distribuidora/notas-pedido/todas**", (route) => route.fulfill({ json: { ok: true, total: 2, totalPages: 1, page: 1, data: [
    { id: 12, estado: "en_curso", total: 5000, fecha_alta: "2026-10-15T12:00:00Z", localidad: "Formosa", usuario: { persona } },
    { id: 15, estado: "en_curso", total: 2600, fecha_alta: "2026-10-15T13:00:00Z", localidad: "Las Lomitas", usuario: { persona } },
  ] } }));
  const pedidosLista = [];
  await page.route("**/api/distribuidora/notas-pedido/lista-carga**", (route) => {
    pedidosLista.push(new URL(route.request().url()).searchParams.get("ids"));
    return route.fulfill({ json: { ok: true, data: { comprobantes: [12, 15], totales: { articulos: 2, unidades: 35, bultos: 2 }, familias: [
      { id: 33, nombre: "Limpieza", articulos: [
        { producto_id: 1, variedad_id: 1, codigo: "002982", descripcion: "Lavandina X5 al 25% 1 lt", cantidad: 26, bultos: 2, sueltos: 2, unidades_por_bulto: 12, unidad_bulto: "CAJA" },
        { producto_id: 2, variedad_id: 2, codigo: "002967", descripcion: "Jabón tocador Lux x3", cantidad: 9, bultos: 0, sueltos: 9, unidades_por_bulto: 1, unidad_bulto: "CAJA" },
      ] }] } } });
  });
  await page.addInitScript(() => { window.__impresiones = 0; window.print = () => { window.__impresiones += 1; }; });
  await page.goto("/distribuidora/admin/lista-carga");
  await expect(page.getByRole("button", { name: /Armar lista de carga/ })).toBeDisabled();
  await page.getByText("Elegir todos los de esta página").click();
  await page.getByRole("button", { name: "Armar lista de carga (2 pedidos)" }).click();
  await expect(page).toHaveURL(/pedidos=12(%2C|,)15/);
  const lista = page.getByRole("article", { name: "Artículos a cargar" });
  await expect(lista.getByText("Compuesto por 2 comprobante(s): #12, #15")).toBeVisible();
  await expect(lista.getByRole("columnheader", { name: "Familia: Limpieza" })).toBeVisible();
  const fila = lista.getByRole("row", { name: /002982/ });
  await expect(fila.getByRole("cell").nth(2)).toHaveText("26");
  await expect(fila.getByRole("cell").nth(3)).toHaveText("2");
  await expect(fila.getByRole("cell").nth(4)).toHaveText("2");
  await noOverflow(page);
  await page.getByRole("button", { name: "Imprimir" }).click();
  expect(await page.evaluate(() => window.__impresiones)).toBe(1);
  expect(pedidosLista).toEqual(["12,15"]);
});
test("catálogo: presentación con caja, +1 caja y equivalencia en bultos", async ({ page }) => {
  await mockApi(page);
  const conCaja = { ...product, variedades: [{ ...product.variedades[0], cantidad: 200, unidad_medida: "PAQUETE", unidad_bulto: "CAJA", unidades_por_bulto: 20 }] };
  await page.route("**/api/distribuidora/productos/1", (route) => route.fulfill({ json: { ok: true, data: conCaja } }));
  await page.goto("/distribuidora/catalogo/1");
  await expect(page.getByText(/Caja x 20 paquetes/)).toBeVisible();
  await page.getByRole("button", { name: "+1 caja" }).click();
  await expect(page.getByText("= 1 caja", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+1 caja" }).click();
  await expect(page.getByText("= 2 cajas", { exact: true })).toBeVisible();
  await noOverflow(page);
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

const CATEGORIAS = [
  { id: 1, nombre: "Almacén", slug: "almacen", padre_id: null, cantidad_productos: 1 },
  { id: 2, nombre: "Galletitas", slug: "almacen-galletitas", padre_id: 1, cantidad_productos: 40 },
  { id: 3, nombre: "Galletas", slug: "almacen-galletas", padre_id: 1, cantidad_productos: 3 },
  { id: 4, nombre: "Limpieza", slug: "limpieza", padre_id: null, cantidad_productos: 0 },
  { id: 5, nombre: "Lavandinas", slug: "limpieza-lavandinas", padre_id: 4, cantidad_productos: 0 },
];
test("familias y categorías: dos columnas, búsqueda global, alta y fusión", async ({ page }) => {
  await entrarComo(page, ["staff"]);
  const envios = [];
  await page.route("**/api/distribuidora/catalogos/categorias**", async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ json: { ok: true, data: CATEGORIAS } });
    envios.push({ metodo: req.method(), url: new URL(req.url()).pathname, body: req.postDataJSON() });
    if (req.url().endsWith("/fusionar")) return route.fulfill({ json: { ok: true, data: { productos_movidos: 3 } } });
    return route.fulfill({ status: 201, json: { ok: true, data: { id: 9 } } });
  });
  await page.goto("/distribuidora/admin/categorias");
  await expect(page.getByText("2 familias · 3 categorías · 44 artículos")).toBeVisible();
  await page.getByRole("button", { name: "Cómo se ordena el catálogo" }).click(); // en celular no hay hover: se abre al tocar
  await expect(page.getByRole("tooltip")).toContainText("Familia (Almacén, Limpieza, Ferretería) › Categoría");
  await noOverflow(page);
  await page.keyboard.press("Escape");
  const familias = page.getByRole("navigation", { name: "Familias" });
  await familias.getByRole("button", { name: /Almacén/ }).click();
  await expect(page.getByRole("heading", { name: "Almacén" })).toBeVisible();
  await expect(page.getByText("1 artículo está cargado directo en la familia, sin categoría.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Eliminar Galletitas" })).toBeDisabled(); // tiene artículos
  await noOverflow(page);

  await page.getByLabel("Nueva categoría en Almacén").fill("Arroz");
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect.poll(() => envios.length).toBe(1);
  expect(envios[0].body).toEqual({ nombre: "Arroz", slug: "almacen-arroz", padre_id: 1 });

  await page.getByRole("button", { name: "Fusionar Galletas" }).click();
  const dialogo = page.getByRole("dialog", { name: 'Fusionar "Galletas"' });
  await dialogo.getByRole("combobox", { name: /Destino/ }).fill("galletitas");
  await dialogo.getByRole("option", { name: /Almacén › Galletitas/ }).click();
  await expect(dialogo.getByText('3 artículos pasan a "Almacén › Galletitas".')).toBeVisible();
  await dialogo.getByRole("button", { name: "Fusionar" }).click();
  await expect.poll(() => envios.length).toBe(2);
  expect(envios[1]).toMatchObject({ metodo: "POST", url: "/api/distribuidora/catalogos/categorias/3/fusionar", body: { destino_id: 2 } });

  // La búsqueda recorre todas las familias y abre la que corresponde.
  await page.getByRole("searchbox", { name: "Buscar familia o categoría" }).fill("lavand");
  await page.getByRole("button", { name: /Limpieza › Lavandinas/ }).click();
  await expect(page.getByRole("heading", { name: "Limpieza" })).toBeVisible();
  await expect(page).toHaveURL(/familia=4/);
});

const MARCAS_GESTION = [
  { id: 1, nombre: "Arcor", articulos: 8, activos: 8, categorias: [{ id: 3, ruta: "Galletitas en gral" }] },
  { id: 2, nombre: "Bagley", articulos: 12, activos: 11, categorias: [{ id: 3, ruta: "Galletitas en gral" }] },
  { id: 4, nombre: "Terrabusi", articulos: 0, activos: 0, categorias: [] },
];
// API de marcas simulada: lista por categoría, búsqueda, gestión, alta y unificar.
async function mockMarcas(page) {
  const envios = [];
  const consultasGestion = [];
  await page.route("**/api/distribuidora/marcas**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() !== "GET") {
      envios.push({ metodo: req.method(), url: url.pathname, body: req.postDataJSON() });
      if (url.pathname.endsWith("/unificar")) return route.fulfill({ json: { ok: true, mensaje: 'Quedó "Bagley"', data: { marca: "Bagley", articulos: 8 } } });
      return route.fulfill({ status: 201, json: { ok: true, mensaje: "Marca creada", data: { id: 9, nombre: req.postDataJSON().nombre } } });
    }
    if (url.pathname.endsWith("/gestion")) {
      consultasGestion.push(Object.fromEntries(url.searchParams));
      return route.fulfill({ json: { ok: true, data: MARCAS_GESTION, total: 3, pagina: 1, total_paginas: 1, totales: { marcas: 3, articulos: 20 } } });
    }
    const q = url.searchParams.get("q")?.toLowerCase();
    const todas = [{ id: 1, nombre: "Arcor" }, { id: 2, nombre: "Bagley" }, { id: 5, nombre: "Cañuela" }];
    const data = q ? todas.filter((m) => m.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q.normalize("NFD").replace(/[̀-ͯ]/g, "")))
      : url.searchParams.get("categoria") ? todas.slice(0, 2) : todas;
    return route.fulfill({ json: { ok: true, data } });
  });
  envios.consultasGestion = consultasGestion;
  return envios;
}
test("marcas: lista con dónde se ofrece, unificar y alta en página propia", async ({ page }) => {
  await gestionArticulos(page);
  const envios = await mockMarcas(page);
  await page.goto("/distribuidora/admin/marcas");
  await expect(page.getByText("3 marcas · 20 artículos con marca")).toBeVisible();
  await expect(page.getByRole("list", { name: "Dónde se ofrece Bagley" }).locator("visible=true")).toContainText("Galletitas en gral");
  await expect(page.getByRole("list", { name: "Dónde se ofrece Terrabusi" }).locator("visible=true")).toContainText("Sin familia ni categoría");
  await expect(page.getByRole("button", { name: "Eliminar Bagley" }).locator("visible=true")).toBeDisabled(); // tiene artículos
  await noOverflow(page);

  // Filtros y orden van al servidor y quedan en la dirección.
  await page.getByLabel(/^Estado/).selectOption("sin_articulos");
  await expect(page).toHaveURL(/estado=sin_articulos/);
  await expect.poll(() => envios.consultasGestion.at(-1)?.estado).toBe("sin_articulos");
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page.getByRole("button", { name: /^Artículos/ }).click(); // encabezado de la tabla
    await expect.poll(() => envios.consultasGestion.at(-1)?.orden).toBe("articulos");
  }
  await page.goto("/distribuidora/admin/marcas");

  await page.getByRole("checkbox", { name: "Elegir Arcor" }).locator("visible=true").check();
  await page.getByRole("checkbox", { name: "Elegir Bagley" }).locator("visible=true").check();
  await page.getByRole("button", { name: "Unificar" }).click();
  const dialogo = page.getByRole("dialog", { name: "Unificar 2 marcas" });
  await expect(dialogo.getByRole("radio", { name: /^Bagley/ })).toBeChecked(); // la más usada
  await dialogo.getByRole("button", { name: "Unificar" }).click();
  await expect.poll(() => envios.length).toBe(1);
  expect(envios[0]).toMatchObject({ metodo: "POST", url: "/api/distribuidora/marcas/unificar", body: { origenes: [1, 2], destino_id: 2 } });

  // Nueva marca: página propia con nombre y dónde se ofrece; al guardar vuelve a Marcas.
  await page.getByRole("button", { name: "Nueva marca" }).click();
  await expect(page).toHaveURL(/\/distribuidora\/admin\/marcas\/nueva\?volver=/);
  await page.getByLabel(/^Nombre de la marca/).fill("Molinos");
  await page.getByRole("button", { name: "Guardar marca" }).click();
  await expect(page.getByText("Elegí al menos una familia o categoría donde se ofrece.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Galletitas en gral/ }).check();
  await noOverflow(page);
  await page.getByRole("button", { name: "Guardar marca" }).click();
  await expect(page).toHaveURL(/\/distribuidora\/admin\/marcas$/);
  expect(envios[1]).toMatchObject({ metodo: "POST", url: "/api/distribuidora/marcas", body: { nombre: "Molinos", categorias: [3] } });
});
test("marca en la ficha: lista de su categoría, sin duplicar y alta en el momento", async ({ page }) => {
  const { guardados } = await gestionArticulos(page);
  const envios = await mockMarcas(page);
  await page.goto("/distribuidora/admin/productos/nuevo");

  // Sin categoría no se elige marca; con categoría, la lista trae las suyas y no duplica.
  const marca = page.getByRole("combobox", { name: /^Marca/ });
  await expect(marca).toBeDisabled();
  await page.getByRole("combobox", { name: /^Familia/ }).fill("galle");
  await page.getByRole("option", { name: /Galletitas en gral/ }).click();
  await marca.click();
  await expect(page.getByRole("option", { name: "Bagley" })).toBeVisible();
  await marca.fill("cañuela");
  await expect(page.getByRole("option", { name: "Cañuela" })).toBeVisible(); // de otras categorías
  await expect(page.getByRole("option", { name: /Crear marca/ })).toHaveCount(0);
  await marca.fill("Molinos");
  await page.getByRole("option", { name: '+ Crear marca "Molinos"' }).click();
  await expect(marca).toHaveValue("Molinos");
  expect(envios[0]).toMatchObject({ metodo: "POST", url: "/api/distribuidora/marcas", body: { nombre: "Molinos", categorias: [3] } });
  await noOverflow(page);

  await page.getByLabel(/^Descripción del artículo/).fill("Harina 000 1 kg");
  await page.getByRole("tab", { name: /Precios/ }).click();
  await page.getByLabel(/^Precio de venta/).fill("900");
  await page.getByRole("button", { name: "Guardar artículo" }).click();
  await expect(page).toHaveURL(/\/distribuidora\/admin\/productos$/);
  expect(guardados[0]).toMatchObject({ categoria_id: 3, marca_id: 9, nombre: "Harina 000 1 kg" });
});

test("ofertas: carrusel en el home con precios de la zona y filtro en el catálogo", async ({ page }) => {
  await mockApi(page);
  const oferta = { ...product, id: 5, nombre: "Yerba en oferta", variedades: [{ ...product.variedades[0], id: 55, precio: 1200, precio_anterior: 1500 }] };
  await page.route("**/api/distribuidora/productos/ofertas**", (route) => route.fulfill({ json: { ok: true, data: [oferta], lista_precio: "Interior Norte" } }));
  const consultas = [];
  await page.route("**/api/distribuidora/productos?**", (route) => {
    consultas.push(Object.fromEntries(new URL(route.request().url()).searchParams));
    return route.fulfill({ json: { ok: true, data: [oferta], total: 1, pagina: 1, total_paginas: 1 } });
  });
  await page.goto("/");
  const seccion = page.getByRole("region", { name: "Ofertas para aprovechar" });
  await expect(seccion.getByText("Yerba en oferta")).toBeVisible();
  await expect(seccion.getByText("Precios para tu zona: Interior Norte")).toBeVisible();
  await expect(seccion.getByText("-20%")).toBeVisible();
  await noOverflow(page);

  await seccion.getByRole("link", { name: /Ver todas las ofertas/ }).click();
  await expect(page).toHaveURL(/\/distribuidora\/catalogo\?oferta=1$/);
  await expect(page.getByRole("button", { name: "Ofertas" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => consultas.at(-1)?.oferta).toBe("1");
  await page.getByRole("button", { name: "Ofertas" }).click(); // vuelve al catálogo completo
  await expect.poll(() => consultas.at(-1)?.oferta).toBeUndefined();
});

test("home comercial: categorías, búsqueda y acceso a promociones", async ({ page }, info) => {
  await mockApi(page);
  const familias = ["Almacén", "Bebidas", "Limpieza", "Golosinas", "Mascotas", "Congelados"].map((nombre, i) => ({ id: i + 1, nombre, padre_id: null }));
  await page.route("**/api/distribuidora/catalogos/categorias", (route) => route.fulfill({ json: { ok: true, data: [...familias, { id: 90, nombre: "Arroces", padre_id: 1 }] } }));
  const seleccion = Array.from({ length: 8 }, (_, i) => ({ ...product, id: i + 1, nombre: ["Arroz largo fino", "Yerba mate", "Aceite de girasol", "Galletitas surtidas", "Harina 000", "Fideos secos", "Azúcar", "Sal fina"][i] }));
  await page.route("**/api/distribuidora/productos?**", (route) => route.fulfill({ json: { ok: true, data: seleccion, total: 8, total_paginas: 1 } }));
  await page.route("**/api/distribuidora/productos/ofertas**", (route) => route.fulfill({ json: { ok: true, data: seleccion.slice(0, 3).map((p) => ({ ...p, variedades: [{ ...p.variedades[0], precio_anterior: 1500 }] })) } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Todo para abastecer\s*tu negocio\./);
  const familiasRegion = page.getByRole("region", { name: "Comprá por categoría" });
  await expect(familiasRegion.getByRole("link", { name: "Almacén", exact: true })).toBeVisible();
  await expect(familiasRegion.getByRole("link", { name: "Arroces", exact: true })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Promociones destacadas" })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("home-comercial.png"), fullPage: true });
  await familiasRegion.getByRole("link", { name: "Almacén", exact: true }).click();
  await expect(page).toHaveURL(/catalogo\?categoria=1$/);
  await page.goto("/");
  await page.getByRole("search", { name: "Buscar en el catálogo" }).getByRole("searchbox").fill("yerba & té");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("yerba & té");
  await page.goto("/");
  await page.getByRole("complementary", { name: "Promociones destacadas" }).getByRole("link", { name: "Explorar ofertas", exact: true }).click();
  await expect(page).toHaveURL(/catalogo\?oferta=1$/);
});

test("home comercial: sin ofertas ni productos mantiene navegación y contacto", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/distribuidora/productos/ofertas**", (route) => route.fulfill({ json: { ok: true, data: [] } }));
  await page.route("**/api/distribuidora/productos?**", (route) => route.fulfill({ json: { ok: true, data: [], total: 0 } }));
  await page.goto("/");
  await expect(page.getByText("Estamos preparando el catálogo.", { exact: false })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ofertas para aprovechar" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Promociones destacadas" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Explorá el catálogo" }).getByRole("link", { name: "Explorar productos" })).toHaveAttribute("href", "/distribuidora/catalogo");
  await expect(page.getByRole("heading", { name: "Hacé tu pedido", exact: true })).toBeVisible();
  await noOverflow(page);
});

test("home comercial: permite reintentar si falla el catálogo", async ({ page }) => {
  await mockApi(page);
  let fallar = true;
  await page.route("**/api/distribuidora/productos?**", (route) => route.fulfill(fallar
    ? { status: 503, json: { ok: false, mensaje: "No disponible" } }
    : { json: { ok: true, data: [product], total: 1 } }));
  await page.route("**/api/distribuidora/productos/ofertas**", (route) => route.fulfill({ status: 503, json: { ok: false } }));
  await page.goto("/");
  const seccion = page.getByRole("region", { name: "Productos para tu pedido" });
  await expect(seccion.getByText("No pudimos cargar los productos.")).toBeVisible({ timeout: 15000 });
  fallar = false;
  await seccion.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(seccion.getByRole("link", { name: "Arroz largo fino", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Promociones destacadas" })).toHaveCount(0);
  await noOverflow(page);
});
