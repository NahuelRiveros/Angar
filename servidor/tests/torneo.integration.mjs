// Torneos contra PostgreSQL LOCAL en un schema temporal mipadel_it_<aleatorio> (se borra al terminar).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const SCHEMA = `mipadel_it_${randomBytes(4).toString("hex")}`;
process.env.NODE_ENV = "test";
process.env.BD_ESQUEMA = SCHEMA;
process.env.AVISOS_POR_CORREO = "no"; // las pruebas no mandan correos

const { env } = await import("../src/configuracion_servidor/env.js");
// Nunca contra una base remota: esta prueba crea y borra tablas.
const esLocal = !env.BD_URL && ["localhost", "127.0.0.1"].includes(env.DB_HOST);

const { sequelize } = await import("../src/database/sequelize.js");
const { bootstrap_database } = await import("../src/database/bootstrap.js");
const { seed_catalogos } = await import("../src/database/seed/seed_catalogos.js");
const { seed_rbac } = await import("../src/database/seed/seed_rbac.js");
const { registrarCliente } = await import("../src/services/usuarios/auth_service.js");
const { TorneoPremio } = await import("../src/models/index.js");
const s = await import("../src/services/torneos/torneo_service.js");

let ana;
let beto;
const sin = !esLocal && "sin PostgreSQL local";

async function crearUsuario(nombre) {
  const r = await registrarCliente({ nombre, apellido: "Prueba", email: `${nombre.toLowerCase()}@example.test`, password: "Clave1234" });
  assert.equal(r.ok, true, r.mensaje);
  return { usuario_id: r.usuario_id, roles: ["jugador", "organizador"], permisos: [] };
}

before(async () => {
  if (!esLocal) return;
  await bootstrap_database();
  await seed_catalogos();
  await seed_rbac();
  ana = await crearUsuario("Ana");
  beto = await crearUsuario("Beto");
});

after(async () => {
  if (esLocal && /^mipadel_it_[0-9a-f]{8}$/.test(SCHEMA)) await sequelize.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
  await sequelize.close();
});

test("torneo: se crea en borrador, solo lo ve y edita su dueño", { skip: sin }, async () => {
  const torneo = await s.crearTorneo(ana, { nombre: "Abierto de Verano", estado: "finalizado", organizador_id: beto.usuario_id });
  assert.deepEqual([torneo.estado, torneo.organizador_id, torneo.categorias.length], ["borrador", ana.usuario_id, 0]);
  assert.deepEqual(torneo.transiciones.map((t) => t.a), ["inscripcion", "cancelado"]);

  await assert.rejects(s.obtenerTorneo(torneo.id, beto), /No encontramos ese torneo/);
  await assert.rejects(s.actualizarTorneo(torneo.id, beto, { nombre: "Robado" }), /No encontramos ese torneo/);
  assert.equal((await s.obtenerTorneo(torneo.id, { usuario_id: 999, roles: ["super_admin"] })).nombre, "Abierto de Verano", "el super admin entra para dar soporte");

  const editado = await s.actualizarTorneo(torneo.id, ana, { sede: "Club Norte", fecha_inicio: "2026-12-05", fecha_fin: "2026-12-06", reglamento: "Sets a 6 games." });
  assert.deepEqual([editado.sede, editado.fecha_fin, editado.reglamento], ["Club Norte", "2026-12-06", "Sets a 6 games."]);
  await assert.rejects(s.actualizarTorneo(torneo.id, ana, { fecha_inicio: "2026-12-10" }), /anterior a la de inicio/, "compara con la fecha guardada");

  const lista = await s.listarMisTorneos(ana);
  assert.deepEqual([lista.total, lista.data[0].cantidad_categorias], [1, 0]);
  assert.equal((await s.listarMisTorneos(beto)).total, 0);
});

test("categorías y premios: sin repetidas, premios reemplazados juntos y borrado en cascada", { skip: sin }, async () => {
  const torneo = (await s.listarMisTorneos(ana)).data[0];
  let detalle = await s.crearCategoria(torneo.id, ana, { nivel: 4, rama: "caballeros", cupo_parejas: 16 });
  detalle = await s.crearCategoria(torneo.id, ana, { nombre_personalizado: "Suma 13" });
  assert.deepEqual(detalle.categorias.map((c) => c.nombre), ["4ta Caballeros", "Suma 13"]);
  await assert.rejects(s.crearCategoria(torneo.id, ana, { nombre_personalizado: "4TA caballeros" }), /Ya existe/);
  await assert.rejects(s.crearCategoria(torneo.id, beto, { nivel: 5, rama: "damas" }), /No encontramos ese torneo/);

  const [cuarta, suma] = detalle.categorias;
  await assert.rejects(s.actualizarCategoria(torneo.id, suma.id, ana, { nivel: 4, rama: "caballeros" }), /Ya existe/);
  detalle = await s.actualizarCategoria(torneo.id, cuarta.id, ana, { nivel: 4, rama: "caballeros", cupo_parejas: 24 });
  assert.equal(detalle.categorias[0].cupo_parejas, 24);

  detalle = await s.guardarPremios(torneo.id, cuarta.id, ana, [{ puesto: "campeon", descripcion: "$200.000 + trofeo" }, { puesto: "subcampeon", descripcion: "Paletas" }]);
  detalle = await s.guardarPremios(torneo.id, cuarta.id, ana, [{ puesto: "campeon", descripcion: "$250.000" }]);
  assert.deepEqual(detalle.categorias[0].premios.map((p) => p.descripcion), ["$250.000"], "la lista nueva reemplaza la anterior");
  await assert.rejects(s.guardarPremios(torneo.id, suma.id + 999, ana, []), /categoría/);

  detalle = await s.eliminarCategoria(torneo.id, cuarta.id, ana);
  assert.deepEqual(detalle.categorias.map((c) => c.nombre), ["Suma 13"]);
  assert.equal(await TorneoPremio.count({ where: { categoria_id: cuarta.id } }), 0, "los premios se van con la categoría");
});

test("estados: abrir inscripción pide sede, fecha y categorías; en juego no cambian las categorías; cerrado no se edita", { skip: sin }, async () => {
  const vacio = await s.crearTorneo(ana, { nombre: "Sin datos" });
  await assert.rejects(s.cambiarEstado(vacio.id, ana, "inscripcion"), /falta cargar la sede, la fecha de inicio, al menos una categoría/);
  await assert.rejects(s.cambiarEstado(vacio.id, ana, "en_juego"), /no puede pasar/);

  const torneo = (await s.listarMisTorneos(ana)).data.find((t) => t.nombre === "Abierto de Verano");
  let detalle = await s.cambiarEstado(torneo.id, ana, "inscripcion");
  assert.equal(detalle.estado, "inscripcion");
  await assert.rejects(s.actualizarTorneo(torneo.id, ana, { sede: "" }), /publicado tiene que tener sede/);
  await assert.rejects(s.eliminarTorneo(torneo.id, ana), /cancelalo/);

  detalle = await s.cambiarEstado(torneo.id, ana, "en_juego");
  assert.equal(detalle.edicion.categorias, false);
  await assert.rejects(s.crearCategoria(torneo.id, ana, { nivel: 6, rama: "mixto" }), /ya no se pueden cambiar las categorías/);
  detalle = await s.guardarPremios(torneo.id, detalle.categorias[0].id, ana, [{ puesto: "campeon", descripcion: "Trofeo" }]);
  assert.equal(detalle.categorias[0].premios.length, 1, "los premios se pueden ajustar en juego");

  // Dos clics simultáneos en "Finalizar": uno pasa y el otro ve el estado nuevo.
  const resultados = await Promise.allSettled([s.cambiarEstado(torneo.id, ana, "finalizado"), s.cambiarEstado(torneo.id, ana, "finalizado")]);
  assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
  await assert.rejects(s.actualizarTorneo(torneo.id, ana, { descripcion: "x" }), /ya no se pueden cambiar los datos/);
  await assert.rejects(s.cambiarEstado(torneo.id, ana, "cancelado"), /no puede pasar/);

  await s.eliminarTorneo(vacio.id, ana);
  await assert.rejects(s.obtenerTorneo(vacio.id, ana), /No encontramos/);
});

test("duplicar un torneo: copia datos, cobro, categorías y premios; queda en borrador sin fechas ni parejas", { skip: sin }, async () => {
  const origen = await s.crearTorneo(ana, { nombre: "Abierto de Invierno", sede: "Club Sur", fecha_inicio: "2026-07-10", reglamento: "Zonas a un set.", monto_inscripcion: 18000, cobro_alias: "club.sur.ejemplo" });
  let detalle = await s.crearCategoria(origen.id, ana, { nivel: 5, rama: "mixto", cupo_parejas: 12, monto_inscripcion: 18000, parejas_por_zona: 4 });
  await s.guardarPremios(origen.id, detalle.categorias[0].id, ana, [{ puesto: "campeon", descripcion: "Trofeo" }]);
  await s.cambiarEstado(origen.id, ana, "inscripcion");

  const copia = await s.duplicarTorneo(origen.id, ana);
  assert.notEqual(copia.id, origen.id);
  assert.deepEqual([copia.nombre, copia.estado, copia.fecha_inicio, copia.sede, copia.reglamento, copia.monto_inscripcion, copia.cobro_alias],
    ["Copia de Abierto de Invierno", "borrador", null, "Club Sur", "Zonas a un set.", 18000, "club.sur.ejemplo"]);
  const [cat] = copia.categorias;
  assert.deepEqual([cat.nombre, cat.cupo_parejas, cat.monto_inscripcion, cat.parejas_por_zona, cat.premios.map((p) => p.descripcion)], ["5ta Mixto", 12, 18000, 4, ["Trofeo"]]);
  assert.notEqual(cat.id, detalle.categorias[0].id, "categorías nuevas, no compartidas");
  await assert.rejects(s.duplicarTorneo(origen.id, { usuario_id: 999999, roles: ["organizador"] }), /No encontramos ese torneo/, "solo el dueño");
});
