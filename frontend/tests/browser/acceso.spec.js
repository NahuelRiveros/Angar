import { test, expect } from "@playwright/test";
import { permisosConfig, permisosEfectivos } from "../../../permisos_config.js";
// Como /auth/me: los roles con los permisos que reciben por defecto (lo tildado al instalar).
const porDefecto = (rol) => permisosConfig.permisos.filter((p) => p.porDefecto.includes(rol)).map((p) => p.codigo);
const conPermisos = (usuario) => ({ ...usuario, permisos: permisosEfectivos(usuario.roles, usuario.roles.flatMap(porDefecto)) });
// Reemplaza el script de Google: el botón falso entrega una credencial de prueba, sin internet.
const GOOGLE_FALSO = `window.google = { accounts: { id: {
  initialize(config) { window.__google = config; },
  renderButton(el) { const b = document.createElement("button"); b.type = "button"; b.textContent = "Continuar con Google";
    b.onclick = () => window.__google.callback({ credential: "credencial-de-prueba" }); el.replaceChildren(b); },
} } };`;
async function mockApi(page) {
  await page.route("https://accounts.google.com/gsi/client", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: GOOGLE_FALSO }));
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    let data = { ok: true, data: [] };
    if (path === "/auth/login") data = { ok: true, token: "mock-session" };
    else if (path === "/auth/me") data = { ok: true, usuario: conPermisos({ usuario_id: 7, nombre: "Ana", apellido: "Jugadora", roles: ["jugador"] }) };
    else if (path === "/auth/register") data = { ok: true };
    else if (path === "/home/config") data = { ok: true, textos: {}, pilares: [], contactos: [] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}
async function entrarComo(page, roles) {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { ok: true, usuario: conPermisos({ usuario_id: 8, nombre: "Eva", roles }) } }));
}
// En celular el menú lateral se abre con ☰; en escritorio está siempre visible.
async function menuPanel(page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole("button", { name: "Abrir menú del panel" }).click();
  return page.getByRole("navigation", { name: "Menú del panel" });
}

test("home de MiPadel: marca, llamado a crear cuenta y sin scroll horizontal", async ({ page }, info) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/MiPadel/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tu torneo de pádel");
  await expect(page.getByRole("heading", { name: "Del anuncio a la final" })).toBeVisible();
  await expect(page.getByText(/distribuidora|catálogo|pedido/i)).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
  await page.getByRole("link", { name: /Crear cuenta/ }).first().click();
  await expect(page).toHaveURL(/\/register$/);
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
  await page.getByLabel(/^Email o usuario/).fill("ana.jugadora");
  await page.getByLabel(/^Contraseña/).fill("mala");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Email, usuario o contraseña incorrectos")).toBeVisible();
  await noOverflow(page);
  await page.getByLabel(/^Contraseña/).fill("Clave1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(enviados).toEqual([{ identificador: "ana.jugadora", password: "mala" }, { identificador: "ana.jugadora", password: "Clave1234" }]);
});

test("registro con usuario opcional muestra si ya está en uso, valida el formato y termina en Mi perfil", async ({ page }, info) => {
  await mockApi(page);
  const registros = [];
  await page.route("**/api/auth/register", async (route) => {
    const body = route.request().postDataJSON();
    registros.push(body);
    const repetido = body.nombre_usuario === "ana";
    await route.fulfill({ status: repetido ? 400 : 201, contentType: "application/json", body: JSON.stringify(repetido ? { ok: false, codigo: "NOMBRE_USUARIO_DUPLICADO", mensaje: "Ese usuario ya está en uso. Probá con otro." } : { ok: true }) });
  });
  await page.route("**/api/jugadores/yo", (route) => route.fulfill({ json: { ok: true, data: { codigo: "MP-7K3QX", nombre: "Ana Jugadora", resumen: { torneos: 0, titulos: 0, finales: 0, mejor_puesto: null }, historial: [] } } }));
  await page.route("**/api/suscripcion/mia", (route) => route.fulfill({ json: { ok: true, data: { es_organizador: false, dias_prueba: 14 } } }));
  await page.goto("/register");
  await page.getByLabel(/^Nombre/).fill("Ana");
  await page.getByLabel(/^Apellido/).fill("Jugadora");
  await page.getByLabel(/^Email/).fill("ana@example.test");
  await page.getByLabel(/^Usuario/).fill("ana jugadora");
  await page.getByLabel(/^Contraseña/).fill("Clave1234");
  await page.getByLabel(/^Confirmar contraseña/).fill("Clave1234");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  await expect(page.getByText("Solo se permiten letras, números, punto, guion y guion bajo")).toBeVisible();
  expect(registros).toHaveLength(0);
  await page.getByLabel(/^Usuario/).fill("ana");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  await expect(page.getByText("Ese usuario ya está en uso. Probá con otro.")).toBeVisible();
  await noOverflow(page);
  await page.getByLabel(/^Usuario/).fill("Ana.Jugadora");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  // Sin página de origen, el registro termina en Mi perfil: código y la puerta para organizar.
  await expect(page).toHaveURL(/\/mi-perfil\?bienvenida=1$/);
  await expect(page.getByText("¡Tu cuenta está lista!")).toBeVisible();
  await expect(page.getByText("MP-7K3QX")).toBeVisible();
  await expect(page.getByRole("link", { name: "Quiero organizar torneos" })).toHaveAttribute("href", "/mi-suscripcion");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("bienvenida.png"), fullPage: true });
  expect(registros.map((r) => r.nombre_usuario)).toEqual(["ana", "Ana.Jugadora"]);
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
  await expect(page).toHaveURL(/\/$/);
  expect(enviados).toEqual([{ credencial: "credencial-de-prueba" }, { credencial: "credencial-de-prueba" }]);
});

test("el admin entra al panel desde el navbar y ve las secciones de la plataforma", async ({ page }, info) => {
  await entrarComo(page, ["admin"]);
  await page.goto("/");
  if (info.project.name !== "desktop") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Panel de gestión" }).locator("visible=true").first().click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: "Hola, Eva" })).toBeVisible();
  const menu = await menuPanel(page);
  for (const item of ["Equipo", "Roles y permisos", "Contenido del home", "Cinta de anuncios"]) {
    await expect(menu.getByRole("link", { name: item })).toBeVisible();
  }
  await expect(menu.getByRole("link", { name: "Suscripción del sistema" })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("panel.png"), fullPage: true });
});

test("un jugador no ve el panel y si entra a /panel vuelve al inicio", async ({ page }) => {
  await entrarComo(page, ["jugador"]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Panel de gestión" })).toHaveCount(0);
  await page.goto("/panel");
  await expect(page).not.toHaveURL(/\/panel/);
});

test("roles y permisos: dependencias al tildar, guardar juntos, crear y borrar roles", async ({ page }, info) => {
  await entrarComo(page, ["admin"]);
  const roles = [
    { id: 1, codigo: "admin", nombre: "Administrador", permisos: permisosConfig.permisos.map((p) => p.codigo), editable: false, borrable: false, usuarios: 1 },
    { id: 2, codigo: "soporte", nombre: "Soporte", permisos: porDefecto("soporte"), editable: true, borrable: false, usuarios: 2 },
    { id: 4, codigo: "editor", nombre: "Editor", permisos: [], editable: true, borrable: true, usuarios: 0 },
    { id: 5, codigo: "moderador", nombre: "Moderador", permisos: [], editable: true, borrable: true, usuarios: 3 },
  ];
  const cambios = [];
  // Solo la API: un patrón con comodines también atraparía el módulo src/api/permisos_api.js.
  await page.route((url) => url.pathname.startsWith("/api/permisos"), (route) => {
    const request = route.request();
    const ruta = new URL(request.url()).pathname.replace("/api/permisos", "");
    if (request.method() === "GET") {
      // Como la API: sin los roles por defecto, que son internos.
      const permisos = permisosConfig.permisos.map((p) => Object.fromEntries(Object.entries(p).filter(([clave]) => clave !== "porDefecto")));
      return route.fulfill({ json: { ok: true, data: { grupos: permisosConfig.grupos, permisos, roles } } });
    }
    cambios.push({ metodo: request.method(), ruta, body: request.postDataJSON() });
    if (request.method() === "PUT") roles.find((r) => `/roles/${r.id}` === ruta).permisos = request.postDataJSON().permisos;
    if (request.method() === "DELETE") roles.splice(roles.findIndex((r) => `/roles/${r.id}` === ruta), 1);
    if (request.method() === "POST") roles.push({ id: 6, codigo: "prensa", nombre: "Prensa", permisos: [], editable: true, borrable: true, usuarios: 0 });
    return route.fulfill({ json: { ok: true, mensaje: "Listo", data: { id: 6, codigo: "prensa", nombre: "Prensa" } } });
  });
  await page.goto("/admin/permisos");
  await expect(page.getByRole("heading", { name: "Roles y permisos" })).toBeVisible();
  // En el celular se edita un rol a la vez con un selector; desde tablets, la grilla completa.
  const movil = await page.getByLabel("Rol a editar").isVisible();
  const elegir = async (rol) => { if (movil) await page.getByLabel("Rol a editar").selectOption({ label: rol }); };
  const casilla = (permiso, rol) => page.getByLabel(`${permiso} para ${rol}`).locator("visible=true");
  // El administrador tiene todo y no se edita.
  await elegir("Administrador");
  await expect(casilla("Ver suscripciones", "Administrador")).toBeChecked();
  await expect(casilla("Ver suscripciones", "Administrador")).toBeDisabled();
  // Tildar "Activar o extender planes" suma "Ver suscripciones": sin él no hay pantalla donde hacerlo.
  await elegir("Editor");
  await casilla("Activar o extender planes", "Editor").check();
  await expect(casilla("Ver suscripciones", "Editor")).toBeChecked();
  // Destildar "Ver suscripciones" saca lo que depende de él.
  await elegir("Soporte");
  await casilla("Activar o extender planes", "Soporte").check();
  await casilla("Ver suscripciones", "Soporte").uncheck();
  await expect(casilla("Activar o extender planes", "Soporte")).not.toBeChecked();
  await expect(page.getByRole("status")).toContainText("Cambios sin guardar en Soporte, Editor");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("permisos.png"), fullPage: true });
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
  expect(cambios.filter((c) => c.metodo === "PUT")).toEqual([
    { metodo: "PUT", ruta: "/roles/2", body: { permisos: [] } },
    { metodo: "PUT", ruta: "/roles/4", body: { permisos: ["suscripciones.ver", "suscripciones.gestionar"] } },
  ]);
  // Solo se borra un rol creado en el panel y sin personas.
  await expect(page.getByRole("button", { name: /Eliminar el rol Soporte/ }).locator("visible=true")).toHaveCount(0);
  await elegir("Moderador");
  await expect(page.getByRole("button", { name: /No se puede eliminar Moderador/ }).locator("visible=true")).toBeDisabled();
  await elegir("Editor");
  await page.getByRole("button", { name: "Eliminar el rol Editor" }).locator("visible=true").click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  const opcionesORoles = () => movil ? page.getByLabel("Rol a editar").locator("option") : page.getByRole("columnheader");
  await expect(opcionesORoles().filter({ hasText: "Editor" })).toHaveCount(0);
  await page.getByLabel("Nuevo rol").fill("Prensa");
  await page.getByRole("button", { name: "Crear rol" }).click();
  await expect(opcionesORoles().filter({ hasText: "Prensa" })).toHaveCount(1);
  expect(cambios.filter((c) => c.metodo !== "PUT")).toEqual([
    { metodo: "DELETE", ruta: "/roles/4", body: null },
    { metodo: "POST", ruta: "/roles", body: { nombre: "Prensa" } },
  ]);
});
