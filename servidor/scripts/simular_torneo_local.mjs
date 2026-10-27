// Simulación persistente exclusivamente local. No crea ni altera tablas.
// Ejecutar: node servidor/scripts/simular_torneo_local.mjs --crear
// Verificar sin modificar datos: node servidor/scripts/simular_torneo_local.mjs --verificar
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const { env } = await import("../src/configuracion_servidor/env.js");
if (env.NODE_ENV === "production" || env.BD_URL || !["localhost", "127.0.0.1"].includes(env.DB_HOST) || env.DB_NAME !== "mipadel") {
  throw new Error("La simulación solo admite la base mipadel en localhost, sin BD_URL y fuera de producción.");
}
const { sequelize, DB_SCHEMA } = await import("../src/database/sequelize.js");
if (!["mipadel", "mipadel_test"].includes(DB_SCHEMA)) throw new Error("Esquema local no admitido.");
const { Persona, Usuario, Rol, TipoDocumento, Torneo, Inscripcion } = await import("../src/models/index.js");
const { registrarCliente } = await import("../src/services/usuarios/auth_service.js");
const { empezarAOrganizar } = await import("../src/services/suscripciones/suscripcion_service.js");
const torneos = await import("../src/services/torneos/torneo_service.js");
const inscripciones = await import("../src/services/torneos/inscripcion_service.js");
const zonas = await import("../src/services/torneos/zona_service.js");
const llaves = await import("../src/services/torneos/llave_service.js");
const publico = await import("../src/services/torneos/publico_service.js");

const NOMBRE = "DEMO - Copa Tres Ramas - Semifinales";
const MARCA = "Simulación local MiPadel: tres competencias, zonas y cuartos resueltos; semifinales pendientes.";
// Credencial ficticia compartida, solo para estas cuentas demo locales.
const PASSWORD_DEMO = "DemoPadel2026!";
const hombres = ["Mateo", "Santiago", "Lucas", "Tomas", "Nicolas", "Juan", "Martin", "Facundo", "Diego", "Pablo", "Gabriel", "Andres", "Bruno", "Franco", "Gonzalo", "Ivan", "Joaquin", "Lautaro", "Marcos", "Pedro", "Rafael", "Sebastian", "Agustin", "Emiliano"];
const mujeres = ["Ana", "Beatriz", "Carolina", "Daniela", "Elena", "Florencia", "Gabriela", "Helena", "Ines", "Julieta", "Lucia", "Mariana", "Natalia", "Olivia", "Paula", "Rocio", "Sofia", "Tamara", "Valentina", "Victoria", "Camila", "Clara", "Emilia", "Malena"];
const cuenta = (codigo, nombre) => ({ codigo, nombre, apellido: "Demo", email: codigo + "@example.test" });
const organizadorDemo = cuenta("demo_semis_org", "Organizador");
const jugadoresH = hombres.map((n, i) => cuenta("demo_semis_h" + String(i + 1).padStart(2, "0"), n));
const jugadoresM = mujeres.map((n, i) => cuenta("demo_semis_m" + String(i + 1).padStart(2, "0"), n));
const competencias = [
  { nombre: "Mixto Suma 13", parejas: Array.from({ length: 12 }, (_, i) => [jugadoresH[i], jugadoresM[i]]) },
  { nombre: "Caballeros Suma 12", parejas: Array.from({ length: 12 }, (_, i) => [jugadoresH[i * 2], jugadoresH[i * 2 + 1]]) },
  { nombre: "Damas Suma 13", parejas: Array.from({ length: 12 }, (_, i) => [jugadoresM[i * 2], jugadoresM[i * 2 + 1]]) },
];

async function buscarCuenta(d) {
  const p = await Persona.findOne({ where: { email: d.email }, attributes: ["id", "nombre", "apellido"] });
  if (!p) return null;
  assert.equal(p.nombre, d.nombre, "El email demo coincide con otra persona; no se modifica.");
  assert.equal(p.apellido, "Demo");
  const u = await Usuario.findOne({ where: { persona_id: p.id }, attributes: ["id", "persona_id", "nombre_usuario", "activo", "eliminado_en"] });
  assert.ok(u?.activo && !u.eliminado_en, "La cuenta demo existente no está habilitada.");
  assert.equal(u.nombre_usuario, d.codigo);
  return { usuario_id: u.id, persona_id: p.id, roles: ["jugador"], permisos: [] };
}

async function crearCuenta(d) {
  const existente = await buscarCuenta(d);
  if (existente) return existente;
  const r = await registrarCliente({ nombre: d.nombre, apellido: d.apellido, email: d.email, nombre_usuario: d.codigo, password: PASSWORD_DEMO });
  assert.equal(r.ok, true, r.mensaje);
  return buscarCuenta(d);
}

async function verificar(torneo, org) {
  assert.equal(torneo.descripcion, MARCA, "El torneo encontrado no es esta simulación.");
  assert.equal(torneo.organizador_id, org.usuario_id);
  assert.equal(torneo.estado, "en_juego");
  const ficha = await publico.verTorneoPublico(torneo.id);
  assert.equal(ficha.categorias.length, 3);
  const detalle = [];
  for (const competencia of competencias) {
    const c = ficha.categorias.find((categoria) => categoria.nombre === competencia.nombre);
    assert.ok(c);
    assert.equal(c.confirmadas, 12);
    const d = await publico.verCategoriaPublica(torneo.id, c.id);
    assert.equal(d.zonas.length, 4);
    assert.ok(d.zonas.every((z) => z.completa && z.parejas.length === 3 && z.partidos.every((p) => p.sets) && z.tabla.filter((f) => f.clasificado).length === 2));
    assert.deepEqual(d.llave.rondas.map((r) => r.partidos.length), [4, 2, 1]);
    const [cuartos, semis, final] = d.llave.rondas;
    assert.ok(cuartos.partidos.every((p) => p.sets && p.ganador_id));
    assert.ok(semis.partidos.every((p) => p.pareja1 && p.pareja2 && !p.sets && !p.ganador_id));
    assert.ok(final.partidos.every((p) => !p.pareja1 && !p.pareja2 && !p.sets));
    assert.equal(d.llave.podio.campeon, null);
    assert.ok(!/"(telefono|nota|email|usuario_id)"/.test(JSON.stringify(d)), "Datos privados en resultados públicos.");
    detalle.push({ categoria: c.nombre, parejas: c.confirmadas, zonas: 4, partidos_zona_jugados: 12, cuartos_jugados: 4, semifinales: semis.partidos.map((p) => p.pareja1.nombre + " vs " + p.pareja2.nombre) });
  }
  const filas = await Inscripcion.findAll({ where: { torneo_id: torneo.id }, attributes: ["usuario_id", "estado", "origen"] });
  assert.equal(filas.length, 36);
  assert.ok(filas.every((f) => f.usuario_id && f.estado === "confirmada" && f.origen === "online"));
  for (const d of [organizadorDemo, ...jugadoresH, ...jugadoresM]) assert.ok(await buscarCuenta(d));
  return { torneo_id: torneo.id, nombre: torneo.nombre, estado: torneo.estado, cuentas: 49, organizador: organizadorDemo.codigo, jugadores: ["demo_semis_h01 a demo_semis_h24", "demo_semis_m01 a demo_semis_m24"], pagina_publica: "http://localhost:5173/torneos/" + torneo.id, gestion: "http://localhost:5173/mis-torneos/" + torneo.id, categorias: detalle };
}

async function avanzarHastaSemifinales(torneo, org) {
  const detalle = await torneos.obtenerTorneo(torneo.id, org);
  assert.equal(detalle.estado, "en_juego");
  assert.equal(detalle.descripcion, MARCA);
  for (const c of competencias) {
    const categoria = detalle.categorias.find((d) => d.nombre === c.nombre);
    assert.ok(categoria);
    c.id = categoria.id;
  }
  for (const competencia of competencias) {
    const d = await zonas.verZonas(torneo.id, competencia.id, org);
    for (const z of d.zonas) {
      const fuerza = new Map(z.parejas.map((p, i) => [p.id, i]));
      for (const [i, p] of z.partidos.entries()) {
        if (p.sets) continue;
        const marcador = fuerza.get(p.pareja1.id) < fuerza.get(p.pareja2.id) ? [[6, i + 2]] : [[i + 2, 6]];
        await zonas.cargarResultado(torneo.id, p.id, org, marcador);
      }
    }
    const actual = await llaves.verLlave(torneo.id, competencia.id, org);
    const llave = actual.armada ? actual : await llaves.armarLlaveCategoria(torneo.id, competencia.id, org);
    for (const [i, partido] of llave.rondas[0].partidos.entries()) {
      if (partido.sets) continue;
      await zonas.cargarResultado(torneo.id, partido.id, org, i % 2 ? [[4, 6]] : [[6, 3]]);
    }
    console.log(competencia.nombre + ": zonas y cuartos jugados; semifinales listas.");
  }
}

async function main() {
  const modo = process.argv[2];
  assert.ok(["--crear", "--verificar", "--continuar", "--reparar-columnas-llave"].includes(modo), "Usar --crear, --verificar, --continuar o --reparar-columnas-llave.");
  await sequelize.authenticate();
  const [destino] = await sequelize.query("SELECT current_database() AS base, current_schema() AS esquema");
  assert.equal(destino[0].base, "mipadel");
  assert.equal(destino[0].esquema, DB_SCHEMA);
  if (modo === "--reparar-columnas-llave") {
    await sequelize.transaction(async (t) => {
      await sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction: t });
      await sequelize.query("ALTER TABLE partido ALTER COLUMN pareja1_id DROP NOT NULL, ALTER COLUMN pareja2_id DROP NOT NULL", { transaction: t });
    });
    console.log("Base local: pareja1_id y pareja2_id admiten lugares por definir, como indica el modelo Partido.");
    return;
  }
  const [columnas] = await sequelize.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'partido' AND column_name IN ('pareja1_id', 'pareja2_id')");
  assert.ok(columnas.length === 2 && columnas.every((c) => c.is_nullable === "YES"), "La base local requiere habilitar parejas por definir en la llave. Usar --reparar-columnas-llave solo con autorización.");
  assert.equal(await Rol.count({ where: { codigo: ["jugador", "organizador"] } }), 2, "Faltan roles iniciales.");
  assert.ok(await TipoDocumento.findOne({ where: { descripcion: "DNI" } }), "Falta el catálogo de documentos.");
  const existentes = await Torneo.findAll({ where: { nombre: NOMBRE } });
  if (existentes.length) {
    assert.equal(existentes.length, 1);
    const org = await buscarCuenta(organizadorDemo);
    assert.ok(org);
    if (modo === "--continuar") {
      assert.equal(existentes[0].descripcion, MARCA);
      const filas = await Inscripcion.findAll({ where: { torneo_id: existentes[0].id }, attributes: ["usuario_id", "estado", "origen"] });
      assert.equal(filas.length, 36, "Solo se continúa una demo con las 36 inscripciones completas.");
      assert.ok(filas.every((f) => f.usuario_id && f.estado === "confirmada" && f.origen === "online"));
      await avanzarHastaSemifinales(existentes[0], org);
    }
    console.log(JSON.stringify({ existente: true, ...await verificar(existentes[0], org) }, null, 2));
    return;
  }
  assert.equal(modo, "--crear", "La simulación todavía no existe.");
  console.log("Destino confirmado: PostgreSQL local mipadel / " + DB_SCHEMA + ". Creando cuentas demo.");
  const org = await crearCuenta(organizadorDemo);
  const plan = await empezarAOrganizar(org.usuario_id);
  assert.ok(plan.suscripcion.vigente, "La prueba del organizador demo venció; no se renueva automáticamente.");
  org.roles.push("organizador");
  const usuarios = new Map();
  for (const d of [...jugadoresH, ...jugadoresM]) usuarios.set(d.codigo, await crearCuenta(d));
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const torneo = await torneos.crearTorneo(org, { nombre: NOMBRE, descripcion: MARCA, sede: "Club Demo MiPadel", localidad: "Formosa", fecha_inicio: hoy, reglamento: "DATOS FICTICIOS. Doce parejas por competencia; cuatro zonas de tres; clasifican dos por zona. Partidos a un set de seis games. La suma es una etiqueta de demostración y no se valida automáticamente." });
  for (const competencia of competencias) {
    const t = await torneos.crearCategoria(torneo.id, org, { nombre_personalizado: competencia.nombre, cupo_parejas: 12, parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", formato_llave: "un_set_6" });
    competencia.id = t.categorias.find((c) => c.nombre === competencia.nombre).id;
  }
  await torneos.cambiarEstado(torneo.id, org, "inscripcion");
  for (const competencia of competencias) {
    for (const [titular, companero] of competencia.parejas) {
      const nueva = await inscripciones.anotarseOnline(usuarios.get(titular.codigo), torneo.id, { categoria_id: competencia.id, jugador2_nombre: companero.nombre + " " + companero.apellido });
      assert.equal(nueva.estado, "pendiente");
      await inscripciones.confirmarInscripcion(torneo.id, nueva.id, org);
    }
    await zonas.generarZonas(torneo.id, competencia.id, org, { azar: () => 0.37 });
    console.log(competencia.nombre + ": 12 parejas inscriptas y confirmadas; 4 zonas.");
  }
  await torneos.cambiarEstado(torneo.id, org, "en_juego");
  await avanzarHastaSemifinales(torneo, org);
  console.log(JSON.stringify({ existente: false, ...await verificar(await Torneo.findByPk(torneo.id), org) }, null, 2));
}

try { await main(); }
catch (e) {
  // No imprimir objetos Sequelize, SQL ni configuración con credenciales.
  console.error("Simulación detenida:", e.name, e.code || e.codigo || e.original?.code || "");
  if (e.original?.column) console.error("Columna:", e.original.column);
  if (e.name === "AssertionError" || (e.status && e.status < 500)) console.error(e.message);
  process.exitCode = 1;
} finally { await sequelize.close(); }
