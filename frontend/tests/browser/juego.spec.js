import { test, expect } from "@playwright/test";
import { EDICION_POR_ESTADO, TRANSICIONES } from "../../../torneo_config.js";

const PLAN = { es_organizador: true, vigente: true, estado: "activo", dias_restantes: 20, mensaje: "Plan activo.", medios_pago: { mercadopago: false, transferencia: null } };

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

/** Sesión opcional; `rutas` responde por "MÉTODO /ruta" (función o JSON). */
async function api(page, { roles = null, rutas = {} } = {}) {
  if (roles) await page.addInitScript(() => localStorage.setItem("token", "mock-session"));
  const pedidos = [];
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const clave = `${request.method()} ${new URL(request.url()).pathname.replace(/^\/api/, "")}`;
    let body = null;
    try { body = request.postDataJSON(); } catch { /* sin cuerpo */ }
    pedidos.push({ clave, body, autenticado: Boolean(request.headers().authorization) });
    if (clave === "GET /auth/me") return roles ? route.fulfill({ json: { ok: true, usuario: { usuario_id: 8, nombre: "Eva", roles, permisos: [] } } }) : route.fulfill({ status: 401, json: { ok: false } });
    if (clave === "GET /suscripcion/mia") return route.fulfill({ json: { ok: true, data: PLAN } });
    const respuesta = rutas[clave];
    if (typeof respuesta === "function") return respuesta(route, body);
    if (respuesta) return route.fulfill({ json: respuesta });
    return route.fulfill({ json: { ok: true, data: [], textos: {}, pilares: [], contactos: [] } });
  });
  return pedidos;
}

const FICHA = {
  id: 5, nombre: "Abierto de Verano", estado: "inscripcion", sede: "Club Norte", direccion: null, localidad: "Formosa",
  fecha_inicio: "2026-12-05", fecha_fin: "2026-12-06", contacto: "WhatsApp EJEMPLO", descripcion: "Torneo de verano.", reglamento: "Zonas a un set.",
  inscripcion_abierta: true,
  categorias: [
    { id: 51, nombre: "4ta Caballeros", cupo_parejas: 16, confirmadas: 10, lugares_libres: 6, premios: [{ puesto: "campeon", etiqueta: null, descripcion: "Trofeo" }] },
    { id: 52, nombre: "Suma 13", cupo_parejas: 8, confirmadas: 8, lugares_libres: 0, premios: [] },
  ],
};

// Como la lista pública: lo que cuenta la tarjeta sale de las categorías del torneo.
const TARJETA = {
  id: 5, nombre: "Abierto de Verano", estado: "inscripcion", sede: "Club Norte", localidad: "Formosa", fecha_inicio: "2026-12-05", fecha_fin: "2026-12-06",
  descripcion: "Torneo de verano con zonas y llaves, cancha techada.",
  categorias: [{ nombre: "4ta Caballeros", rama: "caballeros" }, { nombre: "Suma 13", rama: null }], ramas: ["caballeros"],
  formato: { parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6" }, parejas: 18, lugares_libres: 6, premio_campeon: "Trofeo",
};
const EN_JUEGO = { ...TARJETA, id: 6, nombre: "Copa Damas", estado: "en_juego", descripcion: null, categorias: [{ nombre: "6ta Damas", rama: "damas" }], ramas: ["damas"], formato: null, lugares_libres: null, premio_campeon: null, parejas: 9 };

test("lista de torneos: la tarjeta cuenta qué se juega, y se busca y filtra desde la dirección", async ({ page }, info) => {
  const pedidos = [];
  await api(page, { rutas: {
    "GET /publico/torneos": (route) => {
      const filtros = Object.fromEntries(new URL(route.request().url()).searchParams);
      pedidos.push(filtros);
      const data = [TARJETA, EN_JUEGO].filter((t) => (!filtros.q || t.nombre.toLowerCase().includes(filtros.q.toLowerCase())) && (!filtros.estado || t.estado === filtros.estado));
      return route.fulfill({ json: { ok: true, page: 1, limit: 12, total: data.length, totalPages: 1, data } });
    },
  } });
  await page.goto("/torneos");
  const tarjeta = page.getByRole("link", { name: /Abierto de Verano/ });
  await expect(tarjeta.getByText("Zonas de 3, clasifican 2 y llave · Un set a 6 games")).toBeVisible();
  await expect(tarjeta.getByText("Campeón: Trofeo")).toBeVisible();
  await expect(tarjeta.getByText("Quedan 6 lugares")).toBeVisible();
  await expect(tarjeta.getByRole("list", { name: "Categorías" }).getByRole("listitem")).toHaveText(["4ta Caballeros", "Suma 13"]);
  await expect(tarjeta.getByText("Anotarme")).toBeVisible();
  const enJuego = page.getByRole("link", { name: /Copa Damas/ });
  await expect(enJuego.getByText("Formato según la categoría")).toBeVisible();
  await expect(enJuego.getByText("9 parejas")).toBeVisible();
  await expect(enJuego.getByText("Ver resultados")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("lista_torneos.png"), fullPage: true });

  await page.getByRole("searchbox", { name: "Buscar torneo" }).fill("copa");
  await expect(page).toHaveURL(/[?&]q=copa/);
  await expect(page.getByText("1 torneo con esos filtros")).toBeVisible();
  await expect(tarjeta).toHaveCount(0);
  await page.getByLabel("Estado").selectOption("inscripcion");
  await expect(page.getByText("No encontramos torneos con esos filtros")).toBeVisible();
  expect(pedidos.at(-1)).toMatchObject({ q: "copa", estado: "inscripcion" });

  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page).toHaveURL(/\/torneos$/);
  await expect(page.getByText("2 torneos")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar torneo" })).toHaveValue("");
});

test("un visitante ve los torneos y la ficha; para anotarse le pide ingresar", async ({ page }, info) => {
  await api(page, { rutas: {
    "GET /publico/torneos": { ok: true, page: 1, limit: 12, total: 1, totalPages: 1, data: [TARJETA] },
    "GET /publico/torneos/5": { ok: true, data: FICHA },
  } });
  await page.goto("/");
  if (info.project.name !== "desktop") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Torneos" }).locator("visible=true").first().click();
  await page.getByRole("link", { name: /Abierto de Verano/ }).click();
  await expect(page.getByRole("heading", { name: "Abierto de Verano" })).toBeVisible();
  await expect(page.getByText("6 lugares")).toBeVisible();
  await expect(page.getByText("Cupo completo")).toBeVisible();
  await expect(page.getByText("Campeón: Trofeo")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ingresar para anotarme" })).toHaveAttribute("href", "/login?returnTo=%2Ftorneos%2F5");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("ficha_publica.png"), fullPage: true });
});

test("un jugador se anota con su compañero en una categoría con lugar", async ({ page }) => {
  const pedidos = await api(page, { roles: ["jugador"], rutas: {
    "GET /publico/torneos/5": { ok: true, data: FICHA },
    "POST /inscripciones": (route) => route.fulfill({ status: 201, json: { ok: true, mensaje: "¡Listo! Tu inscripción quedó pendiente: el organizador la va a confirmar." } }),
  } });
  await page.goto("/torneos/5");
  const categoria = page.getByLabel("Categoría", { exact: true });
  await expect(categoria.locator("option", { hasText: "Suma 13" })).toHaveCount(0, { timeout: 5000 });
  await expect(categoria).toHaveValue("51", { timeout: 5000 });
  await page.getByRole("button", { name: "Anotarme" }).click();
  await expect(page.getByText("Nombre y apellido de tu compañero (mínimo 3 caracteres).")).toBeVisible();
  await page.getByLabel("Nombre y apellido de tu compañero").fill("Pedro Gómez");
  await page.getByLabel("Tu teléfono (opcional)").fill("370 400-0000");
  await page.getByRole("button", { name: "Anotarme" }).click();
  await expect(page.getByText("Tu inscripción quedó pendiente")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mis inscripciones" }).last()).toBeVisible();
  expect(pedidos.find((p) => p.clave === "POST /inscripciones").body).toEqual({ torneo_id: 5, categoria_id: 51, jugador2_nombre: "Pedro Gómez", telefono: "370 400-0000", nota: "" });
});

test("mis inscripciones: estado, motivo de rechazo y bajarse de una pendiente", async ({ page }, info) => {
  let lista = [
    { id: 1, estado: "pendiente", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Pedro Gómez", categoria: "4ta Caballeros", zona_id: null, motivo_rechazo: null, torneo: { id: 5, nombre: "Abierto de Verano", estado: "inscripcion", sede: "Club Norte", fecha_inicio: "2026-12-05" } },
    { id: 2, estado: "rechazada", jugador1_nombre: "Eva Prueba", jugador2_nombre: "Luis Díaz", categoria: "Suma 13", zona_id: null, motivo_rechazo: "No pagó la inscripción", torneo: { id: 6, nombre: "Copa Otoño", estado: "inscripcion", sede: null, fecha_inicio: null } },
  ];
  const pedidos = await api(page, { roles: ["jugador"], rutas: {
    "GET /inscripciones/mias": (route) => route.fulfill({ json: { ok: true, data: lista } }),
    "POST /inscripciones/1/cancelar": (route) => { lista = lista.map((i) => (i.id === 1 ? { ...i, estado: "cancelada" } : i)); return route.fulfill({ json: { ok: true, mensaje: "Te bajaste del torneo." } }); },
  } });
  await page.goto("/mis-inscripciones");
  await expect(page.getByText("Motivo: No pagó la inscripción")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bajarme del torneo" })).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("mis_inscripciones.png"), fullPage: true });
  await page.getByRole("button", { name: "Bajarme del torneo" }).click();
  await page.getByRole("button", { name: "Bajarme", exact: true }).click();
  await expect(page.getByText("Dada de baja")).toBeVisible();
  expect(pedidos.some((p) => p.clave === "POST /inscripciones/1/cancelar")).toBe(true);
});

const detalle = (estado) => ({
  id: 9, nombre: "Copa Club", estado, sede: "Club Sur", fecha_inicio: "2026-12-05", fecha_fin: null, descripcion: null, direccion: null, localidad: null, contacto: null, reglamento: null,
  edicion: EDICION_POR_ESTADO[estado], transiciones: TRANSICIONES[estado],
  categorias: [{ id: 91, nombre: "6ta Damas", nivel: 6, rama: "damas", nombre_personalizado: null, cupo_parejas: null, parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", premios: [] }],
});

test("organizador: confirma, rechaza con motivo y carga una pareja a mano", async ({ page }, info) => {
  let inscripciones = [
    { id: 1, categoria_id: 91, jugador1_nombre: "Ana Gómez", jugador2_nombre: "Bea Ruiz", telefono: "3704000000", nota: "Pagamos por transferencia", origen: "online", estado: "pendiente", motivo_rechazo: null, cabeza_de_serie: false, zona_id: null },
    { id: 2, categoria_id: 91, jugador1_nombre: "Caro López", jugador2_nombre: "Dani Paz", telefono: null, nota: null, origen: "online", estado: "pendiente", motivo_rechazo: null, cabeza_de_serie: false, zona_id: null },
  ];
  const cambiar = (id, estado, extra = {}) => { inscripciones = inscripciones.map((i) => (i.id === id ? { ...i, estado, ...extra } : i)); };
  const pedidos = await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("inscripcion") },
    "GET /torneos/9/inscripciones": (route) => route.fulfill({ json: { ok: true, data: inscripciones } }),
    "POST /torneos/9/inscripciones/1/confirmar": (route) => { cambiar(1, "confirmada"); return route.fulfill({ json: { ok: true, mensaje: "Inscripción confirmada." } }); },
    "POST /torneos/9/inscripciones/2/rechazar": (route, body) => { cambiar(2, "rechazada", { motivo_rechazo: body.motivo }); return route.fulfill({ json: { ok: true, mensaje: "Inscripción rechazada." } }); },
    "POST /torneos/9/inscripciones": (route, body) => { inscripciones.push({ id: 3, ...body, origen: "organizador", estado: "confirmada", motivo_rechazo: null, zona_id: null, nota: null }); return route.fulfill({ status: 201, json: { ok: true, mensaje: "Pareja agregada y confirmada." } }); },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Inscripciones" }).click();
  await expect(page.getByText("Tenés 2 inscripciones online para revisar.")).toBeVisible();
  await expect(page.getByRole("link", { name: "3704000000" })).toHaveAttribute("href", "https://wa.me/3704000000");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("inscripciones.png"), fullPage: true });

  await page.getByRole("listitem").filter({ hasText: "Ana Gómez" }).getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Ana Gómez" }).getByText("Confirmada")).toBeVisible();

  await page.getByRole("listitem").filter({ hasText: "Caro López" }).getByRole("button", { name: "Rechazar" }).click();
  const rechazo = page.getByRole("dialog", { name: /Rechazar · Caro López/ });
  await rechazo.getByLabel("Motivo").fill("No llegó el pago");
  await rechazo.getByRole("button", { name: "Rechazar inscripción" }).click();
  await expect(page.getByText("Rechazada: No llegó el pago")).toBeVisible();

  await page.getByRole("button", { name: "Agregar pareja" }).click();
  const alta = page.getByRole("dialog", { name: "Agregar pareja" });
  await alta.getByRole("button", { name: "Agregar pareja" }).click();
  await expect(alta.getByText("Nombre y apellido (mínimo 3 caracteres).").first()).toBeVisible();
  await alta.getByLabel("Jugador 1").fill("Eli Sosa");
  await alta.getByLabel("Jugador 2").fill("Flor Vera");
  await alta.getByLabel(/Cabeza de serie/).check();
  await alta.getByRole("button", { name: "Agregar pareja" }).click();
  await expect(page.getByText("Eli Sosa / Flor Vera")).toBeVisible();
  expect(pedidos.find((p) => p.clave === "POST /torneos/9/inscripciones").body).toEqual({ jugador1_nombre: "Eli Sosa", jugador2_nombre: "Flor Vera", telefono: "", cabeza_de_serie: true, categoria_id: 91 });
});

const pareja = (id, nombre, cabeza = false) => ({ id, nombre, cabeza_de_serie: cabeza });
const ZONAS_ARMADAS = {
  categoria_id: 91, formato: { parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6" }, sin_zona: [],
  zonas: [{
    id: 1, nombre: "A", completa: false,
    parejas: [pareja(11, "Ana / Bea", true), pareja(12, "Caro / Dani"), pareja(13, "Eli / Flor")],
    partidos: [
      { id: 101, orden: 0, formato: "un_set_6", pareja1: pareja(11, "Ana / Bea", true), pareja2: pareja(13, "Eli / Flor"), sets: null, ganador_id: null },
      { id: 102, orden: 1, formato: "un_set_6", pareja1: pareja(12, "Caro / Dani"), pareja2: pareja(13, "Eli / Flor"), sets: null, ganador_id: null },
    ],
    tabla: [11, 12, 13].map((id, i) => ({ inscripcion_id: id, posicion: i + 1, pg: 0, pj: 0, pp: 0, sets_favor: 0, sets_contra: 0, games_favor: 0, games_contra: 0, clasificado: false, pareja: pareja(id, ["Ana / Bea", "Caro / Dani", "Eli / Flor"][i], i === 0) })),
  }],
};

test("organizador: antes de sortear ve qué zonas y llave salen, con aviso si quedan desparejas, y puede sortear igual", async ({ page }) => {
  const confirmadas = Array.from({ length: 7 }, (_, i) => pareja(20 + i, `Pareja ${i + 1}`));
  await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("en_juego") },
    "GET /torneos/9/categorias/91/zonas": { ok: true, data: { ...ZONAS_ARMADAS, zonas: [], sin_zona: confirmadas } },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("Con 7 parejas: 2 zonas (1 de 4 y 1 de 3), clasifican 4. Llave de 4: empieza en semifinal, justa.")).toBeVisible();
  await expect(page.getByText("en las zonas de 4 cada pareja juega 3 partidos y en las de 3, 2. Podés sortear igual")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sortear zonas" })).toBeEnabled();
});

test("zonas terminadas: muestra los mejores terceros que completan la llave y qué desempate definió cada lugar", async ({ page }, info) => {
  const fila = (id, nombre, posicion, extra = {}) => ({ inscripcion_id: id, posicion, pg: 3 - posicion, pj: 2, pp: posicion - 1, sets_favor: 0, sets_contra: 0, games_favor: 0, games_contra: 0, clasificado: posicion <= 2, desempate: null, pareja: pareja(id, nombre), ...extra });
  const zona = (id, letra, base, extra3 = {}) => ({
    id, nombre: letra, completa: true, partidos: [],
    parejas: [1, 2, 3].map((n) => pareja(base + n, `${letra}${n}`)),
    tabla: [fila(base + 1, `${letra}1`, 1, { desempate: base === 30 ? "sorteo" : null }), fila(base + 2, `${letra}2`, 2, { desempate: base === 30 ? "sorteo" : null }), fila(base + 3, `${letra}3`, 3, extra3)],
  });
  const datos = { ...ZONAS_ARMADAS, mejores: { puesto: 3, cupo: 2, definidos: true }, zonas: [
    zona(1, "A", 10, { clasificado: true, mejor: true }), zona(2, "B", 20, { clasificado: true, mejor: true, desempate_mejor: "sorteo" }), zona(3, "C", 30),
  ] };
  await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("en_juego") },
    "GET /torneos/9/categorias/91/zonas": { ok: true, data: datos },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("Además clasifican los 2 mejores terceros de todas las zonas.")).toBeVisible();
  const zonaB = page.getByRole("region", { name: "Zona B" });
  await expect(zonaB.getByRole("row", { name: /B3/ }).getByText("Mejor 3º")).toBeVisible();
  await expect(zonaB.getByRole("row", { name: /B3/ }).getByText("Definido por sorteo")).toBeVisible();
  await expect(page.getByRole("region", { name: "Zona C" }).getByText("Definido por sorteo")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Zona C" }).getByText("Mejor 3º")).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("mejores_terceros.png"), fullPage: true });
});

test("organizador: en Zonas ve cuántas parejas faltan para completar el cupo", async ({ page }, info) => {
  const torneo = detalle("inscripcion");
  torneo.categorias[0].cupo_parejas = 9;
  let confirmadas = 7;
  await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: torneo },
    "GET /torneos/9/categorias/91/zonas": (route) => route.fulfill({ json: { ok: true, data: { ...ZONAS_ARMADAS, zonas: [], sin_zona: Array.from({ length: confirmadas }, (_, i) => pareja(20 + i, `Pareja ${i + 1}`)) } } }),
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("Faltan 2 parejas para completar el cupo (7 de 9 confirmadas).")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("zonas_cupo.png"), fullPage: true });
  confirmadas = 9;
  await page.reload();
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("Cupo completo: 9 de 9 parejas confirmadas.")).toBeVisible();
});

test("organizador: con la inscripción abierta carga día, hora y cancha de un partido (el resultado recién en juego)", async ({ page }, info) => {
  let zonas = structuredClone(ZONAS_ARMADAS);
  const pedidos = await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("inscripcion") },
    "GET /torneos/9/categorias/91/zonas": (route) => route.fulfill({ json: { ok: true, data: zonas } }),
    "PUT /torneos/9/partidos/101/programacion": (route, body) => {
      zonas = structuredClone(zonas);
      Object.assign(zonas.zonas[0].partidos[0], { fecha: body.fecha || null, hora: body.hora || null, cancha: body.cancha || null });
      return route.fulfill({ json: { ok: true, mensaje: "Horario guardado.", data: { fase: "zona", ...zonas } } });
    },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByRole("button", { name: /^Cargar resultado de/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Horario de Ana / Bea contra Eli / Flor" }).click();
  const modal = page.getByRole("dialog", { name: "Horario del partido" });
  await modal.getByLabel("Día").fill("2026-12-05");
  await modal.getByLabel("Hora").fill("18:30");
  await modal.getByLabel("Cancha").fill("Cancha 2");
  await modal.getByRole("button", { name: "Guardar horario" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText("sáb 05/12 · 18:30 · Cancha 2")).toBeVisible();
  expect(pedidos.find((p) => p.clave === "PUT /torneos/9/partidos/101/programacion").body).toEqual({ fecha: "2026-12-05", hora: "18:30", cancha: "Cancha 2" });
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("horario_zona.png"), fullPage: true });

  await page.getByRole("button", { name: "Horario de Ana / Bea contra Eli / Flor" }).click();
  await expect(modal.getByLabel("Cancha")).toHaveValue("Cancha 2");
  await modal.getByRole("button", { name: "Quitar horario" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText("sáb 05/12 · 18:30 · Cancha 2")).toHaveCount(0);
});

test("organizador: sortea las zonas y carga un resultado (el servidor rechaza un marcador imposible)", async ({ page }, info) => {
  let zonas = { ...ZONAS_ARMADAS, zonas: [], sin_zona: ZONAS_ARMADAS.zonas[0].parejas };
  const pedidos = await api(page, { roles: ["organizador"], rutas: {
    "GET /torneos/9": { ok: true, data: detalle("en_juego") },
    "GET /torneos/9/categorias/91/zonas": (route) => route.fulfill({ json: { ok: true, data: zonas } }),
    "POST /torneos/9/categorias/91/zonas/generar": (route) => { zonas = ZONAS_ARMADAS; return route.fulfill({ json: { ok: true, mensaje: "Zonas armadas.", data: zonas } }); },
    "PUT /torneos/9/partidos/101/resultado": (route, body) => {
      if (body.sets[0][0] === 6 && body.sets[0][1] === 5) return route.fulfill({ status: 400, json: { ok: false, codigo: "RESULTADO_INVALIDO", mensaje: "El set 1 (6-5) no es un resultado válido para sets a 6 games." } });
      const z = structuredClone(ZONAS_ARMADAS);
      z.zonas[0].partidos[0] = { ...z.zonas[0].partidos[0], sets: body.sets, ganador_id: 11 };
      z.zonas[0].tabla[0] = { ...z.zonas[0].tabla[0], pg: 1, pj: 1, sets_favor: 1, games_favor: 6, games_contra: 3 };
      zonas = z;
      return route.fulfill({ json: { ok: true, mensaje: "Resultado guardado.", data: z } });
    },
  } });
  await page.goto("/mis-torneos/9");
  await page.getByRole("tab", { name: "Zonas" }).click();
  await expect(page.getByText("3 parejas confirmadas sin zona.")).toBeVisible();
  await page.getByRole("button", { name: "Sortear zonas" }).click();
  await expect(page.getByRole("heading", { name: "Zona A" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a sortear" })).toBeVisible();

  await page.getByRole("button", { name: "Cargar resultado de Ana / Bea contra Eli / Flor" }).click();
  const modal = page.getByRole("dialog", { name: "Resultado del partido" });
  await modal.getByLabel("Set: games de Ana / Bea").fill("6");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal.getByText("Completá los dos números del set 1.")).toBeVisible();
  await modal.getByLabel("Set: games de Eli / Flor").fill("5");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal.getByRole("alert").filter({ hasText: "no es un resultado válido" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("resultado.png") });
  await modal.getByLabel("Set: games de Eli / Flor").fill("3");
  await modal.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText("6-3")).toBeVisible();
  await expect(page.getByRole("button", { name: /Volver a sortear/ })).toBeDisabled();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("zonas.png"), fullPage: true });
  expect(pedidos.filter((p) => p.clave === "PUT /torneos/9/partidos/101/resultado").map((p) => p.body.sets)).toEqual([[[6, 5]], [[6, 3]]]);
});
