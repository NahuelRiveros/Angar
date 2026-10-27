// Plan de organizadores contra PostgreSQL LOCAL (base del .env, normalmente "mipadel").
// Trabaja en un schema temporal mipadel_it_<aleatorio> y borra solo ese schema al terminar.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const SCHEMA = `mipadel_it_${randomBytes(4).toString("hex")}`;
process.env.NODE_ENV = "test";
process.env.DB_SCHEMA = SCHEMA;
process.env.PRECIO_SUSCRIPCION_MENSUAL = "15000";

const { env } = await import("../src/configuracion_servidor/env.js");
// Nunca contra una base remota: esta prueba crea y borra tablas.
const esLocal = !env.BD_URL && ["localhost", "127.0.0.1"].includes(env.DB_HOST);

const { sequelize } = await import("../src/database/sequelize.js");
const { bootstrap_database } = await import("../src/database/bootstrap.js");
const { seed_catalogos } = await import("../src/database/seed/seed_catalogos.js");
const { seed_rbac } = await import("../src/database/seed/seed_rbac.js");
const { registrarCliente } = await import("../src/services/usuarios/auth_service.js");
const { Suscripcion, PagoSuscripcion } = await import("../src/models/index.js");
const servicio = await import("../src/services/suscripciones/suscripcion_service.js");
const { requireSuscripcionVigente } = await import("../src/middleware/suscripcion_middleware.js");
const { hoyArgentina, sumarDias, referenciaDeUsuario } = await import("../src/services/suscripciones/suscripcion_reglas.js");

const hoy = hoyArgentina();
let ana;
let beto;

async function crearUsuario(nombre) {
  const r = await registrarCliente({ nombre, apellido: "Prueba", email: `${nombre.toLowerCase()}@example.test`, password: "Clave1234" });
  assert.equal(r.ok, true, r.mensaje);
  return r.usuario_id;
}
const pagoMp = (id, usuarioId, cambios = {}) => async () => ({
  id, estado: "approved", monto: 15000, moneda: "ARS", external_reference: referenciaDeUsuario(usuarioId), detalle: { metodo: "visa" }, ...cambios,
});
const vencimiento = async (usuarioId) => (await Suscripcion.findOne({ where: { usuario_id: usuarioId } })).fecha_vencimiento;

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

test("empezar a organizar: rol organizador y 14 días de prueba, una sola vez", { skip: !esLocal && "sin PostgreSQL local" }, async () => {
  assert.equal((await servicio.obtenerMiSuscripcion(ana)).es_organizador, false);
  const primera = await servicio.empezarAOrganizar(ana);
  assert.equal(primera.creada, true);
  assert.deepEqual([primera.suscripcion.estado, primera.suscripcion.dias_restantes, primera.suscripcion.fecha_vencimiento], ["prueba", 14, sumarDias(hoy, 13)]);
  const [{ roles }] = await sequelize.query(`SELECT array_agg(r.codigo ORDER BY r.codigo) AS roles FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id WHERE ur.usuario_id = :ana`, { replacements: { ana }, type: "SELECT" });
  assert.deepEqual(roles, ["jugador", "organizador"]);
  // Vencida la prueba, volver a pedirla no regala otros 14 días.
  await Suscripcion.update({ fecha_vencimiento: sumarDias(hoy, -3) }, { where: { usuario_id: ana } });
  const segunda = await servicio.empezarAOrganizar(ana);
  assert.deepEqual([segunda.creada, segunda.suscripcion.estado], [false, "vencido"]);
});

test("aviso de MercadoPago: pendiente no suma, aprobado suma 30 días una sola vez aunque se repita", { skip: !esLocal && "sin PostgreSQL local" }, async () => {
  const pendiente = await servicio.procesarPagoMercadoPago("9001", { consultar: pagoMp(9001, ana, { estado: "pending" }) });
  assert.equal(pendiente.resultado, "registrado");
  assert.equal(await vencimiento(ana), sumarDias(hoy, -3));

  const aprobado = await servicio.procesarPagoMercadoPago("9001", { consultar: pagoMp(9001, ana) });
  assert.equal(aprobado.resultado, "aplicado");
  assert.equal(await vencimiento(ana), sumarDias(hoy, 29), "estaba vencido: 30 días desde hoy");
  assert.equal((await servicio.procesarPagoMercadoPago("9001", { consultar: pagoMp(9001, ana) })).resultado, "ya_aplicado");
  assert.equal(await vencimiento(ana), sumarDias(hoy, 29));
  assert.equal(await PagoSuscripcion.count({ where: { mp_payment_id: "9001" } }), 1);
  const plan = await servicio.obtenerMiSuscripcion(ana);
  assert.deepEqual([plan.en_prueba, plan.estado], [false, "activo"]);

  // Dos avisos simultáneos del mismo pago nuevo: los días se suman una vez; el que choca falla y MercadoPago lo reintenta.
  const resultados = await Promise.allSettled([9002, 9002].map((id) => servicio.procesarPagoMercadoPago(String(id), { consultar: pagoMp(id, ana) })));
  assert.ok(resultados.some((r) => r.status === "fulfilled" && r.value.resultado === "aplicado"));
  assert.equal((await servicio.procesarPagoMercadoPago("9002", { consultar: pagoMp(9002, ana) })).resultado, "ya_aplicado");
  assert.equal(await vencimiento(ana), sumarDias(hoy, 59), "pagar antes de vencer suma al final");
});

test("aviso de MercadoPago: monto menor, otra moneda o usuario inexistente no habilitan nada", { skip: !esLocal && "sin PostgreSQL local" }, async () => {
  await servicio.empezarAOrganizar(beto);
  const antes = await vencimiento(beto);
  assert.equal((await servicio.procesarPagoMercadoPago("9100", { consultar: pagoMp(9100, beto, { monto: 10 }) })).estado, "monto_insuficiente");
  assert.equal((await servicio.procesarPagoMercadoPago("9101", { consultar: pagoMp(9101, beto, { moneda: "USD" }) })).estado, "monto_insuficiente");
  assert.equal((await servicio.procesarPagoMercadoPago("9102", { consultar: pagoMp(9102, 999999) })).motivo, "usuario_inexistente");
  assert.equal(await vencimiento(beto), antes);
  assert.equal(await PagoSuscripcion.count({ where: { usuario_id: beto } }), 2, "los rechazados quedan registrados");
});

test("panel: extender a mano, fijar fecha, historial y listado con filtros", { skip: !esLocal && "sin PostgreSQL local" }, async () => {
  const extendido = await servicio.extenderManual(beto, { dias: 10, nota: "Transferencia" }, ana);
  assert.equal(extendido.fecha_vencimiento, sumarDias(hoy, 23), "prueba de 14 + 10 días");
  assert.equal(extendido.en_prueba, false);
  await servicio.fijarVencimiento(beto, { fecha: sumarDias(hoy, -1), nota: null }, ana);
  const pagos = await servicio.historialPagos(beto);
  assert.deepEqual(pagos.slice(0, 2).map((p) => p.origen), ["ajuste", "manual"]);
  assert.equal(pagos[1].nota, "Transferencia");
  assert.equal(pagos[0].vencimiento_nuevo, sumarDias(hoy, -1));

  const todos = await servicio.listarSuscripciones({});
  assert.equal(todos.total, 2);
  assert.deepEqual(todos.resumen, { vencido: 1, prueba: 0, por_vencer: 0, activo: 1 });
  assert.deepEqual(todos.data.map((f) => [f.nombre, f.estado]), [["Beto", "vencido"], ["Ana", "activo"]]);
  assert.deepEqual((await servicio.listarSuscripciones({ estado: "vencido" })).data.map((f) => f.nombre), ["Beto"]);
  assert.deepEqual((await servicio.listarSuscripciones({ busqueda: "ana@" })).data.map((f) => f.nombre), ["Ana"]);
  assert.equal((await servicio.listarSuscripciones({ busqueda: "%" })).total, 0, "los comodines se buscan como texto");
  await assert.rejects(servicio.extenderManual(999999, { dias: 5 }, ana), /no tiene plan/);
});

test("requireSuscripcionVigente: vencido 402, sin plan 403, vigente y super admin pasan", { skip: !esLocal && "sin PostgreSQL local" }, async () => {
  const llamar = async (user) => {
    let status = 200;
    let siguio = false;
    const res = { status(s) { status = s; return this; }, json() { return this; } };
    await requireSuscripcionVigente({ user }, res, () => { siguio = true; });
    return siguio ? "sigue" : status;
  };
  assert.equal(await llamar({ usuario_id: ana, roles: ["organizador"] }), "sigue");
  assert.equal(await llamar({ usuario_id: beto, roles: ["organizador"] }), 402);
  assert.equal(await llamar({ usuario_id: 999999, roles: ["jugador"] }), 403);
  assert.equal(await llamar({ usuario_id: 999999, roles: ["super_admin"] }), "sigue");
});
