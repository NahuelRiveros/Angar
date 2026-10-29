// Llave eliminatoria contra PostgreSQL LOCAL en un schema temporal (se borra al terminar).
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
const { Usuario } = await import("../src/models/index.js");
const torneos = await import("../src/services/torneos/torneo_service.js");
const insc = await import("../src/services/torneos/inscripcion_service.js");
const zonas = await import("../src/services/torneos/zona_service.js");
const llave = await import("../src/services/torneos/llave_service.js");
const publico = await import("../src/services/torneos/publico_service.js");

const sin = !esLocal && "sin PostgreSQL local";
let org;

before(async () => {
  if (!esLocal) return;
  await bootstrap_database();
  await seed_catalogos();
  await seed_rbac();
  const r = await registrarCliente({ nombre: "Orga", apellido: "Llave", email: "orga@example.test", password: "Clave1234" });
  const u = await Usuario.findByPk(r.usuario_id);
  org = { usuario_id: u.id, persona_id: u.persona_id, roles: ["organizador"], permisos: [] };
});

after(async () => {
  if (esLocal && /^mipadel_it_[0-9a-f]{8}$/.test(SCHEMA)) await sequelize.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
  await sequelize.close();
});

/** Torneo en juego con `parejas` confirmadas en zonas de 3 y todos los partidos de zona jugados. */
async function torneoConZonasJugadas(nombre, parejas, extra = {}) {
  const t = await torneos.crearTorneo(org, { nombre, sede: "Club", fecha_inicio: "2026-12-05" });
  const cat = (await torneos.crearCategoria(t.id, org, { nivel: 4, rama: "caballeros", parejas_por_zona: 3, clasifican_por_zona: 2, formato_llave: "un_set_6", ...extra })).categorias[0];
  await torneos.cambiarEstado(t.id, org, "inscripcion");
  for (let n = 1; n <= parejas; n += 1) await insc.cargarPareja(t.id, org, { categoria_id: cat.id, jugador1_nombre: `Jugador ${n}A`, jugador2_nombre: `Jugador ${n}B` });
  let detalle = await zonas.generarZonas(t.id, cat.id, org, { azar: () => 0.5 });
  await torneos.cambiarEstado(t.id, org, "en_juego");
  for (const zona of detalle.zonas) for (const p of zona.partidos) detalle = await zonas.cargarResultado(t.id, p.id, org, [[6, 2]]);
  return { torneo: t, categoria: cat, zonas: detalle.zonas };
}

const zonaDe = (zonasArmadas, id) => zonasArmadas.find((z) => z.parejas.some((p) => p.id === id))?.nombre;

test("llave de 4: semis cruzadas (1ºA-2ºB), el ganador avanza y el podio sale de la final", { skip: sin }, async () => {
  const { torneo, categoria, zonas: armadas } = await torneoConZonasJugadas("Copa 6", 6);
  let detalle = await llave.armarLlaveCategoria(torneo.id, categoria.id, org);
  assert.deepEqual(detalle.rondas.map((r) => [r.nombre, r.partidos.length]), [["Semifinal", 2], ["Final", 1]]);
  for (const p of detalle.rondas[0].partidos) assert.notEqual(zonaDe(armadas, p.pareja1.id), zonaDe(armadas, p.pareja2.id), "en semis no se cruzan los de la misma zona");
  const [semi1, semi2] = detalle.rondas[0].partidos;
  const final = detalle.rondas[1].partidos[0];
  await assert.rejects(zonas.cargarResultado(torneo.id, final.id, org, [[6, 3]]), /Todavía no están definidas/);

  // Las zonas quedan cerradas mientras haya llave.
  const deZona = armadas[0].partidos[0];
  await assert.rejects(zonas.cargarResultado(torneo.id, deZona.id, org, [[6, 4]]), /llave ya está armada/);

  detalle = await zonas.cargarResultado(torneo.id, semi1.id, org, [[6, 3]]);
  assert.equal(detalle.fase, "llave");
  assert.equal(detalle.rondas[1].partidos[0].pareja1.id, semi1.pareja1.id, "el ganador pasa a la final");
  // Corregir quién ganó mientras la final no se jugó: la final se actualiza.
  detalle = await zonas.cargarResultado(torneo.id, semi1.id, org, [[3, 6]]);
  assert.equal(detalle.rondas[1].partidos[0].pareja1.id, semi1.pareja2.id);
  detalle = await zonas.cargarResultado(torneo.id, semi2.id, org, [[7, 5]]);
  detalle = await zonas.cargarResultado(torneo.id, final.id, org, [[6, 4]]);
  assert.deepEqual(
    [detalle.podio.campeon.id, detalle.podio.subcampeon.id, detalle.podio.semifinalistas.map((p) => p.id).sort()],
    [semi1.pareja2.id, semi2.pareja1.id, [semi1.pareja1.id, semi2.pareja2.id].sort()],
  );

  // Con la final jugada, una semi no puede cambiar de ganador ni borrarse.
  await assert.rejects(zonas.cargarResultado(torneo.id, semi1.id, org, [[6, 0]]), /partido siguiente ya tiene resultado/);
  await assert.rejects(zonas.borrarResultado(torneo.id, semi1.id, org), /borralo primero/);
  detalle = await zonas.cargarResultado(torneo.id, semi1.id, org, [[2, 6]]);
  assert.equal(detalle.podio.campeon.id, semi1.pareja2.id, "corregir el marcador sin cambiar el ganador sí se puede");

  await assert.rejects(llave.deshacerLlave(torneo.id, categoria.id, org), /ya tiene resultados/);
  await assert.rejects(llave.armarLlaveCategoria(torneo.id, categoria.id, org), /ya tiene resultados/);
  detalle = await zonas.borrarResultado(torneo.id, final.id, org);
  assert.equal(detalle.podio.campeon, null);
  detalle = await zonas.borrarResultado(torneo.id, semi1.id, org);
  assert.equal(detalle.rondas[1].partidos[0].pareja1, null, "borrar la semi saca al ganador de la final");
});

test("3 zonas de 3: 6 clasificados + los 2 mejores terceros llenan los cuartos, sin pases", { skip: sin }, async () => {
  const { torneo, categoria } = await torneoConZonasJugadas("Copa 9", 9);
  const vistas = await zonas.verZonas(torneo.id, categoria.id, org);
  assert.deepEqual(vistas.mejores, { puesto: 3, cupo: 2, definidos: true });
  const terceros = vistas.zonas.flatMap((z) => z.tabla.filter((f) => f.mejor));
  assert.equal(terceros.length, 2, "dos terceros marcados como mejores");
  assert.ok(terceros.every((f) => f.posicion === 3 && f.clasificado));

  const detalle = await llave.armarLlaveCategoria(torneo.id, categoria.id, org);
  assert.deepEqual(detalle.rondas.map((r) => [r.nombre, r.partidos.length]), [["Cuartos de final", 4], ["Semifinal", 2], ["Final", 1]]);
  const primeraRonda = detalle.rondas[0].partidos;
  assert.ok(primeraRonda.every((p) => p.pareja1 && p.pareja2), "nadie pasa sin jugar");
  const zonaDe = new Map(vistas.zonas.flatMap((z) => z.parejas.map((p) => [p.id, z.nombre])));
  assert.ok(primeraRonda.every((p) => zonaDe.get(p.pareja1.id) !== zonaDe.get(p.pareja2.id)), "nadie cruza a su zona en cuartos");
  assert.deepEqual(primeraRonda.flatMap((p) => [p.pareja1.id, p.pareja2.id]).filter((id) => terceros.some((t) => t.inscripcion_id === id)).sort(), terceros.map((t) => t.inscripcion_id).sort());
});

test("armar requiere zonas terminadas; deshacer la llave reabre las zonas para corregir", { skip: sin }, async () => {
  const { torneo, categoria, zonas: armadas } = await torneoConZonasJugadas("Copa corrección", 6);
  const partidoDeZona = armadas[0].partidos[0];
  await zonas.borrarResultado(torneo.id, partidoDeZona.id, org);
  await assert.rejects(llave.armarLlaveCategoria(torneo.id, categoria.id, org), /Faltan resultados en la zona A/);
  await zonas.cargarResultado(torneo.id, partidoDeZona.id, org, [[6, 1]]);
  await llave.armarLlaveCategoria(torneo.id, categoria.id, org);
  await assert.rejects(zonas.cargarResultado(torneo.id, partidoDeZona.id, org, [[1, 6]]), /deshacela/);
  const deshecha = await llave.deshacerLlave(torneo.id, categoria.id, org);
  assert.equal(deshecha.armada, false);
  await zonas.cargarResultado(torneo.id, partidoDeZona.id, org, [[1, 6]]);
  const otra = await llave.armarLlaveCategoria(torneo.id, categoria.id, org);
  assert.equal(otra.armada, true);
  await assert.rejects(llave.verLlave(torneo.id, categoria.id, { usuario_id: 999, roles: ["organizador"] }), /No encontramos ese torneo/);
});

test("vista pública: zonas, fixture y llave sin cuenta; nada de borradores ni teléfonos", { skip: sin }, async () => {
  const { torneo, categoria } = await torneoConZonasJugadas("Copa pública", 6);
  await insc.editarPareja(torneo.id, (await insc.listarInscripciones(torneo.id, org))[0].id, org, { jugador1_nombre: "Jugador 1A", jugador2_nombre: "Jugador 1B", telefono: "3704999999" });
  await llave.armarLlaveCategoria(torneo.id, categoria.id, org);
  const vista = await publico.verCategoriaPublica(torneo.id, categoria.id);
  assert.deepEqual([vista.nombre, vista.zonas.length, vista.zonas[0].tabla.length, vista.llave.armada, vista.llave.rondas.length], ["4ta Caballeros", 2, 3, true, 2]);
  assert.ok(vista.zonas[0].partidos.every((p) => p.sets), "con resultados");
  assert.ok(!JSON.stringify(vista).includes("3704999999"), "sin teléfonos");
  await assert.rejects(publico.verCategoriaPublica(torneo.id, categoria.id + 999), /No encontramos/);

  const borrador = await torneos.crearTorneo(org, { nombre: "Secreto" });
  const cat = (await torneos.crearCategoria(borrador.id, org, { nivel: 1, rama: "mixto" })).categorias[0];
  await assert.rejects(publico.verCategoriaPublica(borrador.id, cat.id), /No encontramos/, "un borrador no se ve");
});


test("torneos demo: crearlos dos veces a la vez arma uno solo; borrarlos no toca los demás", { skip: sin }, async () => {
  const demo = await import("../src/services/demo/demo_torneos_service.js");
  const propio = await torneos.crearTorneo(org, { nombre: "No es demo", sede: "Club", fecha_inicio: "2026-12-12" });
  const [a, b] = await Promise.all([demo.crearTorneosDemo({ log: () => {} }), demo.crearTorneosDemo({ log: () => {} })]);
  assert.equal(a, b, "la segunda llamada espera a la primera");
  const existentes = await demo.torneosDemoExistentes();
  assert.deepEqual(existentes.map((t) => t.estado).sort(), ["en_juego", "finalizado"]);
  assert.equal((await demo.crearTorneosDemo({ log: () => {} })).creados, false, "si ya existen no crea nada");
  const finalizado = existentes.find((t) => t.estado === "finalizado");
  const caballeros = (await publico.verTorneoPublico(finalizado.id)).categorias.find((c) => c.nombre === "5ta Caballeros");
  const vista = await publico.verCategoriaPublica(finalizado.id, caballeros.id);
  assert.ok(vista.llave.podio.campeon, "el finalizado tiene campeón");
  assert.equal(vista.zonas.flatMap((z) => z.tabla.filter((f) => f.mejor)).length, 2, "con mejores terceros");

  assert.equal(await demo.borrarTorneosDemo(), 2);
  assert.deepEqual(await demo.torneosDemoExistentes(), []);
  assert.ok(await torneos.obtenerTorneo(propio.id, org), "el torneo que no es demo sigue");
});

test("cronograma automático: vista previa sin guardar, aplicar respeta lo manual y avisa a cada jugador una vez", { skip: sin }, async () => {
  const crono = await import("../src/services/torneos/cronograma_service.js");
  const { Partido, AvisoUsuario } = await import("../src/models/index.js");
  const t = await torneos.crearTorneo(org, { nombre: "Copa Horarios", sede: "Club", fecha_inicio: "2026-12-05" });
  const cat = (await torneos.crearCategoria(t.id, org, { nivel: 6, rama: "mixto", parejas_por_zona: 3, clasifican_por_zona: 2 })).categorias[0];
  await torneos.cambiarEstado(t.id, org, "inscripcion");
  // Una pareja con cuenta (para el aviso) y el resto cargadas a mano.
  const r = await registrarCliente({ nombre: "Jugadora", apellido: "Horarios", email: "jugadora.horarios@example.test", password: "Clave1234" });
  const jugadora = { usuario_id: r.usuario_id, persona_id: (await Usuario.findByPk(r.usuario_id)).persona_id, roles: ["jugador"], permisos: [] };
  const online = await insc.anotarseOnline(jugadora, t.id, { categoria_id: cat.id, jugador2_nombre: "Compa Sin Cuenta" });
  await insc.confirmarInscripcion(t.id, online.id, org);
  for (let n = 1; n <= 5; n += 1) await insc.cargarPareja(t.id, org, { categoria_id: cat.id, jugador1_nombre: `Jugador ${n}A`, jugador2_nombre: `Jugador ${n}B` });
  const armadas = await zonas.generarZonas(t.id, cat.id, org, { azar: () => 0.5 });
  const manual = armadas.zonas[0].partidos[0];
  await zonas.programarPartido(t.id, manual.id, org, { fecha: "2026-12-05", hora: "18:00", cancha: "Cancha 1" });

  const config = { dias: ["2026-12-05"], desde: "18:00", hasta: "23:00", minutos: 60, canchas: 2, descanso: 1 };
  const vista = await crono.previsualizarCronograma(t.id, org, config);
  assert.equal(vista.ya_programados, 1);
  assert.equal(vista.asignados.length + vista.sin_lugar.length, 5, "los otros 5 partidos de zona");
  assert.ok(vista.asignados.every((a) => a.categoria === "6ta Mixto" && /^Zona [AB]$/.test(a.etapa) && a.partido.includes(" vs ")));
  assert.ok(!vista.asignados.some((a) => a.hora === "18:00" && a.cancha === "Cancha 1"), "la cancha del partido manual queda tomada");
  assert.equal(await Partido.count({ where: { categoria_id: cat.id, cancha: null } }), 5, "la vista previa no guarda");

  const aplicado = await crono.aplicarCronograma(t.id, org, config);
  assert.deepEqual(aplicado.asignados.map((a) => [a.id, a.hora, a.cancha]), vista.asignados.map((a) => [a.id, a.hora, a.cancha]), "guarda lo mismo que mostró");
  const manualDespues = await Partido.findByPk(manual.id);
  assert.deepEqual([manualDespues.hora, manualDespues.cancha], ["18:00", "Cancha 1"], "lo manual no se toca");
  assert.equal(await Partido.count({ where: { categoria_id: cat.id, cancha: null } }), vista.sin_lugar.length);
  await assert.rejects(crono.aplicarCronograma(t.id, org, config), aplicado.sin_lugar.length ? /./ : /No hay partidos sin horario/, "una vez programado no queda nada pendiente");
  await assert.rejects(crono.previsualizarCronograma(t.id, org, { ...config, canchas: 0 }), /canchas/);

  for (let i = 0; i < 50 && !await AvisoUsuario.count({ where: { usuario_id: jugadora.usuario_id, tipo: "horarios_torneo" } }); i += 1) await new Promise((x) => setTimeout(x, 40));
  const avisos = await AvisoUsuario.findAll({ where: { usuario_id: jugadora.usuario_id, tipo: "horarios_torneo" } });
  assert.equal(avisos.length, 1, "un solo aviso con todos sus horarios");
  assert.match(avisos[0].detalle, /6ta Mixto · Jugadora Horarios \/ Compa Sin Cuenta vs/);
});
