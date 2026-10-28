// Código de jugador, invitación al compañero e historial contra PostgreSQL LOCAL (schema temporal).
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
const { Usuario } = await import("../src/models/index.js");
const torneos = await import("../src/services/torneos/torneo_service.js");
const insc = await import("../src/services/torneos/inscripcion_service.js");
const zonas = await import("../src/services/torneos/zona_service.js");
const llave = await import("../src/services/torneos/llave_service.js");
const jugadores = await import("../src/services/jugadores/jugador_service.js");

const sin = !esLocal && "sin PostgreSQL local";
const u = {};
let torneo;
let categoria;

async function crearUsuario(nombre) {
  const r = await registrarCliente({ nombre, apellido: "Prueba", email: `${nombre.toLowerCase()}@example.test`, password: "Clave1234" });
  assert.equal(r.ok, true, r.mensaje);
  const usuario = await Usuario.findByPk(r.usuario_id);
  return { usuario_id: usuario.id, persona_id: usuario.persona_id, codigo: usuario.codigo_jugador, roles: ["jugador", "organizador"], permisos: [] };
}

before(async () => {
  if (!esLocal) return;
  await bootstrap_database();
  await seed_catalogos();
  await seed_rbac();
  for (const nombre of ["Orga", "Ana", "Bea", "Caro", "Dani"]) u[nombre] = await crearUsuario(nombre);
  torneo = await torneos.crearTorneo(u.Orga, { nombre: "Copa Amigos", sede: "Club", fecha_inicio: "2026-12-05" });
  categoria = (await torneos.crearCategoria(torneo.id, u.Orga, { nivel: 5, rama: "mixto", parejas_por_zona: 3, clasifican_por_zona: 1, formato_llave: "un_set_6" })).categorias[0];
  await torneos.cambiarEstado(torneo.id, u.Orga, "inscripcion");
});

after(async () => {
  if (esLocal && /^mipadel_it_[0-9a-f]{8}$/.test(SCHEMA)) await sequelize.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
  await sequelize.close();
});

test("cada cuenta nace con su código; las que no lo tienen lo reciben al arrancar", { skip: sin }, async () => {
  assert.match(u.Ana.codigo, /^MP-[A-Z0-9]{5}$/);
  assert.notEqual(u.Ana.codigo, u.Bea.codigo);
  await Usuario.update({ codigo_jugador: null }, { where: { id: u.Dani.usuario_id } });
  assert.equal(await jugadores.asignarCodigosFaltantes(), 1);
  u.Dani.codigo = (await Usuario.findByPk(u.Dani.usuario_id)).codigo_jugador;
  assert.match(u.Dani.codigo, /^MP-/);
  assert.equal(await jugadores.asignarCodigosFaltantes(), 0, "sin pendientes no hace nada");
});

test("invitar por código: espera al compañero, que acepta o rechaza; el organizador confirma recién después", { skip: sin }, async () => {
  await assert.rejects(insc.anotarseOnline(u.Ana, torneo.id, { categoria_id: categoria.id, codigo_companiero: "MP-ZZZZZ" }), /No encontramos un jugador/);
  await assert.rejects(insc.anotarseOnline(u.Ana, torneo.id, { categoria_id: categoria.id, codigo_companiero: u.Ana.codigo }), /propio código/);

  const invitacion = await insc.anotarseOnline(u.Ana, torneo.id, { categoria_id: categoria.id, codigo_companiero: u.Bea.codigo.toLowerCase() });
  assert.deepEqual([invitacion.estado, invitacion.usuario2_id, invitacion.jugador2_nombre], ["esperando", u.Bea.usuario_id, "Bea Prueba"]);
  // Bea ya está ocupada en la categoría (la invitaron): no se puede anotar con otro ni la puede invitar otro.
  await assert.rejects(insc.anotarseOnline(u.Bea, torneo.id, { categoria_id: categoria.id, jugador2_nombre: "Otra Persona" }), /Ya estás anotado/);
  await assert.rejects(insc.anotarseOnline(u.Caro, torneo.id, { categoria_id: categoria.id, codigo_companiero: u.Bea.codigo }), /Tu compañero ya está anotado/);
  await assert.rejects(insc.confirmarInscripcion(torneo.id, invitacion.id, u.Orga), /pendientes/, "sin aceptar no se confirma");

  const deBea = (await insc.misInscripciones(u.Bea))[0];
  assert.deepEqual([deBea.rol, deBea.estado], ["invitado", "esperando"]);
  await assert.rejects(insc.responderInvitacion(u.Caro, invitacion.id, true), /No encontramos esa invitación/, "solo responde el invitado");
  await insc.responderInvitacion(u.Bea, invitacion.id, true);
  await assert.rejects(insc.responderInvitacion(u.Bea, invitacion.id, false), /ya fue respondida/);
  const confirmada = await insc.confirmarInscripcion(torneo.id, invitacion.id, u.Orga);
  assert.equal(confirmada.estado, "confirmada");

  // Rechazar: la inscripción se cancela y quien invitó ve el motivo.
  const otra = await insc.anotarseOnline(u.Caro, torneo.id, { categoria_id: categoria.id, codigo_companiero: u.Dani.codigo });
  await insc.responderInvitacion(u.Dani, otra.id, false);
  const deCaro = (await insc.misInscripciones(u.Caro))[0];
  assert.deepEqual([deCaro.estado, deCaro.motivo_rechazo], ["cancelada", "El compañero rechazó la invitación."]);
});

test("historial: torneos, títulos y mejor puesto para los dos jugadores registrados; participantes sin datos privados", { skip: sin }, async () => {
  // Caro se anota con un compañero sin cuenta y el organizador carga otra pareja: 3 parejas, 1 zona.
  await insc.anotarseOnline(u.Caro, torneo.id, { categoria_id: categoria.id, jugador2_nombre: "Invitado Sin Cuenta", telefono: "3704111111" });
  const deCaro = (await insc.misInscripciones(u.Caro)).find((i) => i.estado === "pendiente");
  await insc.confirmarInscripcion(torneo.id, deCaro.id, u.Orga);
  await insc.cargarPareja(torneo.id, u.Orga, { categoria_id: categoria.id, jugador1_nombre: "Eli Sosa", jugador2_nombre: "Flor Vera" });

  let detalle = await zonas.generarZonas(torneo.id, categoria.id, u.Orga, { azar: () => 0.5 });
  await torneos.cambiarEstado(torneo.id, u.Orga, "en_juego");
  const anaBea = detalle.zonas[0].parejas.find((p) => p.nombre.startsWith("Ana")).id;
  // Ana/Bea ganan todo en la zona y la final.
  for (const p of detalle.zonas[0].partidos) detalle = await zonas.cargarResultado(torneo.id, p.id, u.Orga, p.pareja1.id === anaBea ? [[6, 1]] : p.pareja2.id === anaBea ? [[1, 6]] : [[6, 4]]);
  // Con una sola zona todavía no hay llave: el mejor puesto queda en "zona".
  let perfilAna = await jugadores.miPerfil(u.Ana.usuario_id);
  assert.deepEqual([perfilAna.resumen.torneos, perfilAna.resumen.titulos, perfilAna.resumen.mejor_puesto], [1, 0, "zona"]);

  // Segunda categoría con llave real: Ana invita a Bea de nuevo y juegan contra Caro + uno sin cuenta.
  await torneos.cambiarEstado(torneo.id, u.Orga, "finalizado");
  const otro = await torneos.crearTorneo(u.Orga, { nombre: "Copa Final", sede: "Club", fecha_inicio: "2026-12-12" });
  const cat = (await torneos.crearCategoria(otro.id, u.Orga, { nivel: 4, rama: "mixto", parejas_por_zona: 3, clasifican_por_zona: 1, formato_llave: "un_set_6" })).categorias[0];
  await torneos.cambiarEstado(otro.id, u.Orga, "inscripcion");
  const inv = await insc.anotarseOnline(u.Ana, otro.id, { categoria_id: cat.id, codigo_companiero: u.Bea.codigo });
  await insc.responderInvitacion(u.Bea, inv.id, true);
  await insc.confirmarInscripcion(otro.id, inv.id, u.Orga);
  for (let n = 1; n <= 5; n += 1) await insc.cargarPareja(otro.id, u.Orga, { categoria_id: cat.id, jugador1_nombre: `Jugador ${n}A`, jugador2_nombre: `Jugador ${n}B` });
  detalle = await zonas.generarZonas(otro.id, cat.id, u.Orga, { azar: () => 0.5 });
  await torneos.cambiarEstado(otro.id, u.Orga, "en_juego");
  for (const z of detalle.zonas) for (const p of z.partidos) {
    detalle = await zonas.cargarResultado(otro.id, p.id, u.Orga, p.pareja2.id === inv.id ? [[1, 6]] : [[6, 1]]);
  }
  let llaveDetalle = await llave.armarLlaveCategoria(otro.id, cat.id, u.Orga);
  const final = llaveDetalle.rondas.at(-1).partidos[0];
  llaveDetalle = await zonas.cargarResultado(otro.id, final.id, u.Orga, final.pareja1.id === inv.id ? [[6, 2]] : [[2, 6]]);
  assert.equal(llaveDetalle.podio.campeon.id, inv.id);

  perfilAna = await jugadores.miPerfil(u.Ana.usuario_id);
  const perfilBea = await jugadores.perfilPublico(u.Bea.codigo.toLowerCase());
  assert.deepEqual([perfilAna.resumen.torneos, perfilAna.resumen.titulos, perfilAna.resumen.mejor_puesto], [2, 1, "campeon"]);
  assert.deepEqual([perfilBea.resumen.titulos, perfilBea.historial[0].puesto, perfilBea.historial[0].torneo], [1, "campeon", "Copa Final"], "la invitada también suma");
  assert.ok(!JSON.stringify(perfilBea).includes("@"), "el perfil público no muestra el email");
  await assert.rejects(jugadores.perfilPublico("MP-ZZZZZ"), /No encontramos ese jugador/);

  const participantes = await jugadores.participantesPublicos(torneo.id);
  const parejas = participantes[0].parejas;
  assert.equal(parejas.length, 3);
  const anaYBea = parejas.find((p) => p.jugador1.nombre === "Ana Prueba");
  assert.deepEqual([anaYBea.jugador1.codigo, anaYBea.jugador2.codigo, anaYBea.jugador1.resumen.titulos], [u.Ana.codigo, u.Bea.codigo, 1]);
  const conInvitado = parejas.find((p) => p.jugador2.nombre === "Invitado Sin Cuenta");
  assert.deepEqual([conInvitado.jugador2.codigo, conInvitado.jugador2.resumen], [null, null], "el que no tiene cuenta muestra solo el nombre");
  assert.ok(!JSON.stringify(participantes).includes("3704111111"), "sin teléfonos");
});
