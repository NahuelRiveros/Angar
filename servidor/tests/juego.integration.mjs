// Inscripciones, zonas y resultados contra PostgreSQL LOCAL en un schema temporal (se borra al terminar).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const SCHEMA = `mipadel_it_${randomBytes(4).toString("hex")}`;
process.env.NODE_ENV = "test";
process.env.DB_SCHEMA = SCHEMA;

const { env } = await import("../src/configuracion_servidor/env.js");
// Nunca contra una base remota: esta prueba crea y borra tablas.
const esLocal = !env.BD_URL && ["localhost", "127.0.0.1"].includes(env.DB_HOST);

const { sequelize } = await import("../src/database/sequelize.js");
const { bootstrap_database } = await import("../src/database/bootstrap.js");
const { seed_catalogos } = await import("../src/database/seed/seed_catalogos.js");
const { seed_rbac } = await import("../src/database/seed/seed_rbac.js");
const { registrarCliente } = await import("../src/services/usuarios/auth_service.js");
const { Usuario, Inscripcion, Zona, Partido } = await import("../src/models/index.js");
const torneos = await import("../src/services/torneos/torneo_service.js");
const insc = await import("../src/services/torneos/inscripcion_service.js");
const zonas = await import("../src/services/torneos/zona_service.js");
const publico = await import("../src/services/torneos/publico_service.js");

const sin = !esLocal && "sin PostgreSQL local";
let org;
let jugadores;
let torneo;
let cuarta;

async function crearUsuario(nombre) {
  const r = await registrarCliente({ nombre, apellido: "Prueba", email: `${nombre.toLowerCase()}@example.test`, password: "Clave1234" });
  assert.equal(r.ok, true, r.mensaje);
  const u = await Usuario.findByPk(r.usuario_id);
  return { usuario_id: u.id, persona_id: u.persona_id, roles: ["jugador", "organizador"], permisos: [] };
}
const parejaManual = (categoria_id, n, extra = {}) => ({ categoria_id, jugador1_nombre: `Jugador ${n}A`, jugador2_nombre: `Jugador ${n}B`, ...extra });

before(async () => {
  if (!esLocal) return;
  await bootstrap_database();
  await seed_catalogos();
  await seed_rbac();
  org = await crearUsuario("Orga");
  jugadores = await Promise.all(["Ana", "Beto", "Caro"].map(crearUsuario));
  torneo = await torneos.crearTorneo(org, { nombre: "Abierto", sede: "Club Norte", fecha_inicio: "2026-12-05" });
  let detalle = await torneos.crearCategoria(torneo.id, org, { nivel: 4, rama: "caballeros", cupo_parejas: 8, parejas_por_zona: 3 });
  detalle = await torneos.crearCategoria(torneo.id, org, { nombre_personalizado: "Suma 13", cupo_parejas: 2 });
  [cuarta] = detalle.categorias;
});

after(async () => {
  if (esLocal && /^mipadel_it_[0-9a-f]{8}$/.test(SCHEMA)) await sequelize.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
  await sequelize.close();
});

test("inscripción online: solo con la inscripción abierta, queda pendiente, una por jugador y categoría", { skip: sin }, async () => {
  const [ana] = jugadores;
  await assert.rejects(insc.anotarseOnline(ana, torneo.id, { categoria_id: cuarta.id, jugador2_nombre: "Pedro Gómez" }), /No encontramos ese torneo/, "un borrador no se ve");
  await torneos.cambiarEstado(torneo.id, org, "inscripcion");
  const nueva = await insc.anotarseOnline(ana, torneo.id, { categoria_id: cuarta.id, jugador2_nombre: "Pedro Gómez", telefono: "370 400 0000" });
  assert.deepEqual([nueva.estado, nueva.origen, nueva.jugador1_nombre, nueva.jugador2_nombre], ["pendiente", "online", "Ana Prueba", "Pedro Gómez"]);
  await assert.rejects(insc.anotarseOnline(ana, torneo.id, { categoria_id: cuarta.id, jugador2_nombre: "Otro Compañero" }), /Ya estás anotado/);
  const suma = (await torneos.obtenerTorneo(torneo.id, org)).categorias[1];
  await assert.rejects(insc.anotarseOnline(ana, torneo.id, { categoria_id: suma.id + 999, jugador2_nombre: "Pedro Gómez" }), /categoría/);

  // Se baja y puede volver a anotarse (el índice único solo cuenta las activas).
  await insc.cancelarMia(ana, nueva.id);
  await assert.rejects(insc.cancelarMia(jugadores[1], nueva.id), /No encontramos/);
  const otraVez = await insc.anotarseOnline(ana, torneo.id, { categoria_id: cuarta.id, jugador2_nombre: "Pedro Gómez" });
  assert.equal((await insc.misInscripciones(ana)).filter((i) => i.estado === "pendiente").length, 1);
  assert.equal((await insc.misInscripciones(ana))[0].categoria, "4ta Caballeros");

  await insc.confirmarInscripcion(torneo.id, otraVez.id, org);
  await assert.rejects(insc.confirmarInscripcion(torneo.id, otraVez.id, org), /pendientes/);
  const beto = await insc.anotarseOnline(jugadores[1], torneo.id, { categoria_id: cuarta.id, jugador2_nombre: "Luis Díaz" });
  await assert.rejects(insc.rechazarInscripcion(torneo.id, beto.id, org, { motivo: "no" }), /motivo/);
  await insc.rechazarInscripcion(torneo.id, beto.id, org, { motivo: "No pagó la inscripción" });
  assert.equal((await insc.misInscripciones(jugadores[1]))[0].motivo_rechazo, "No pagó la inscripción");
  await assert.rejects(insc.confirmarInscripcion(torneo.id, beto.id, jugadores[2]), /No encontramos ese torneo/, "otro usuario no administra el torneo");
});

test("cupo: no se pasa ni con dos confirmaciones al mismo tiempo; la vista pública no muestra teléfonos", { skip: sin }, async () => {
  const suma = (await torneos.obtenerTorneo(torneo.id, org)).categorias[1];
  await insc.cargarPareja(torneo.id, org, parejaManual(suma.id, 1, { telefono: "111111" }));
  const [x, y] = await Promise.all([jugadores[1], jugadores[2]].map((j) => insc.anotarseOnline(j, torneo.id, { categoria_id: suma.id, jugador2_nombre: "Compa Ñero" })));
  const resultados = await Promise.allSettled([insc.confirmarInscripcion(torneo.id, x.id, org), insc.confirmarInscripcion(torneo.id, y.id, org)]);
  assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1, "el último lugar lo toma una sola");
  assert.match(resultados.find((r) => r.status === "rejected").reason.message, /completó su cupo/);
  await assert.rejects(insc.cargarPareja(torneo.id, org, parejaManual(suma.id, 2)), /cupo/);

  const ficha = await publico.verTorneoPublico(torneo.id);
  const sumaPublica = ficha.categorias.find((c) => c.id === suma.id);
  assert.deepEqual([ficha.inscripcion_abierta, sumaPublica.confirmadas, sumaPublica.lugares_libres], [true, 2, 0]);
  assert.ok(!JSON.stringify(ficha).includes("111111"), "sin teléfonos en la ficha pública");
  assert.equal((await publico.listarTorneosPublicos()).total, 1);
  await assert.rejects(torneos.eliminarCategoria(torneo.id, suma.id, org), /parejas anotadas/);
});

test("zonas: sorteo con cabezas separadas, fixture, mover parejas y resultados que arman la tabla", { skip: sin }, async () => {
  for (let n = 1; n <= 6; n += 1) await insc.cargarPareja(torneo.id, org, parejaManual(cuarta.id, n, { cabeza_de_serie: n <= 2 }));
  // 7 confirmadas (6 cargadas + la de Ana) en zonas de 3 → 4 + 3.
  const fijo = () => 0.3;
  let detalle = await zonas.generarZonas(torneo.id, cuarta.id, org, { azar: fijo });
  assert.deepEqual(detalle.zonas.map((z) => [z.nombre, z.parejas.length, z.partidos.length]), [["A", 4, 6], ["B", 3, 3]]);
  assert.deepEqual(detalle.zonas.map((z) => z.parejas.filter((p) => p.cabeza_de_serie).length), [1, 1], "una cabeza de serie por zona");
  assert.equal(detalle.sin_zona.length, 0);

  const [zonaA, zonaB] = detalle.zonas;
  const deA = zonaA.parejas.find((p) => !p.cabeza_de_serie);
  detalle = await zonas.moverPareja(torneo.id, cuarta.id, org, { inscripcion_id: deA.id, zona_id: zonaB.id });
  assert.deepEqual(detalle.zonas.map((z) => [z.parejas.length, z.partidos.length]), [[3, 3], [4, 6]], "el fixture se rehízo");
  await assert.rejects(zonas.moverPareja(torneo.id, cuarta.id, org, { inscripcion_id: deA.id, zona_id: 999999 }), /No encontramos/);

  const partido = detalle.zonas[0].partidos[0];
  await assert.rejects(zonas.cargarResultado(torneo.id, partido.id, org, [[6, 3]]), /en juego/, "con la inscripción abierta todavía no se cargan resultados");
  await torneos.cambiarEstado(torneo.id, org, "en_juego");
  await assert.rejects(zonas.cargarResultado(torneo.id, partido.id, org, [[6, 5]]), /no es un resultado válido/);
  detalle = await zonas.cargarResultado(torneo.id, partido.id, org, [[6, 3]]);
  const jugado = detalle.zonas[0].partidos[0];
  assert.deepEqual([jugado.sets, jugado.ganador_id], [[[6, 3]], partido.pareja1.id]);
  assert.equal(detalle.zonas[0].tabla[0].pareja.id, partido.pareja1.id, "el ganador encabeza la tabla");

  await assert.rejects(zonas.generarZonas(torneo.id, cuarta.id, org, { azar: fijo }), /Ya hay resultados/);
  await assert.rejects(zonas.moverPareja(torneo.id, cuarta.id, org, { inscripcion_id: partido.pareja1.id, zona_id: detalle.zonas[1].id }), /ya tienen resultados/);
  await assert.rejects(insc.darDeBaja(torneo.id, partido.pareja1.id, org), /rearmá las zonas/);

  for (const p of detalle.zonas[0].partidos.slice(1)) detalle = await zonas.cargarResultado(torneo.id, p.id, org, [[6, 2]]);
  assert.equal(detalle.zonas[0].completa, true);
  assert.equal(detalle.zonas[0].tabla.filter((f) => f.clasificado).length, 2, "clasifican 2 por zona");

  detalle = await zonas.borrarResultado(torneo.id, partido.id, org);
  assert.equal(detalle.zonas[0].completa, false);
  assert.ok(detalle.zonas[0].tabla.every((f) => !f.clasificado));
  await assert.rejects(zonas.verZonas(torneo.id, cuarta.id, jugadores[0]), /No encontramos ese torneo/);
});

test("borrar un torneo en borrador se lleva sus parejas, zonas y partidos", { skip: sin }, async () => {
  const otro = await torneos.crearTorneo(org, { nombre: "Para borrar", sede: "Club", fecha_inicio: "2026-12-12" });
  const cat = (await torneos.crearCategoria(otro.id, org, { nivel: 7, rama: "damas" })).categorias[0];
  await torneos.cambiarEstado(otro.id, org, "inscripcion");
  for (let n = 1; n <= 3; n += 1) await insc.cargarPareja(otro.id, org, parejaManual(cat.id, n));
  await zonas.generarZonas(otro.id, cat.id, org, { azar: () => 0.5 });
  await torneos.cambiarEstado(otro.id, org, "borrador");
  await torneos.eliminarTorneo(otro.id, org);
  assert.deepEqual(await Promise.all([Inscripcion.count({ where: { torneo_id: otro.id } }), Zona.count({ where: { categoria_id: cat.id } }), Partido.count({ where: { categoria_id: cat.id } })]), [0, 0, 0]);
});
