// Torneos de DEMOSTRACIÓN con datos ficticios (cuenta "Organización Demo"), para ver cómo se ve cada
// etapa. Usa los mismos servicios que la app. Lo usan el script scripts/demo_torneos.mjs y el arranque
// del servidor con DEMO_AL_INICIAR=si. Solo toca torneos de esa cuenta con la marca DEMO en la descripción.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { sequelize } from "../../database/sequelize.js";
import { Persona, Usuario, Rol, Torneo, TorneoCategoria, TorneoPremio, Inscripcion, Zona, Partido } from "../../models/index.js";
import { registrarCliente } from "../usuarios/auth_service.js";
import { empezarAOrganizar } from "../suscripciones/suscripcion_service.js";
import * as torneos from "../torneos/torneo_service.js";
import * as inscripciones from "../torneos/inscripcion_service.js";
import * as zonas from "../torneos/zona_service.js";
import * as llaves from "../torneos/llave_service.js";
import { nombreCategoria } from "../../../../torneo_config.js";

// Marca de la demo: solo se tocan torneos de esta cuenta cuya descripción empieza así.
const MARCA = "DEMO: torneo de muestra con datos ficticios.";
const CUENTA = { nombre: "Organización", apellido: "Demo", email: "organizacion.demo@example.test", nombre_usuario: "demo_organizacion" };
// Datos de EJEMPLO: no es una cuenta real.
const COBRO = { monto_inscripcion: 20000, cobro_titular: "Organización Demo (EJEMPLO)", cobro_banco: "Banco EJEMPLO", cobro_cbu: "0000003100000000000001", cobro_alias: "mipadel.demo" };
const PREMIOS = [{ puesto: "campeon", descripcion: "Trofeo y paletas (EJEMPLO)" }, { puesto: "subcampeon", descripcion: "Medallas (EJEMPLO)" }];

// Tres competencias con tamaños distintos para ver cada caso de llave:
// 12 parejas → 4 zonas, cuartos justos · 9 → 3 zonas + 2 mejores terceros · 6 → 2 zonas, semis.
const CATEGORIAS = [
  { clave: "mixto", datos: { nivel: 6, rama: "mixto", cupo_parejas: 12 }, parejas: 12, tipo: "mixto" },
  { clave: "caballeros", datos: { nivel: 5, rama: "caballeros", cupo_parejas: 9 }, parejas: 9, tipo: "caballeros" },
  { clave: "suma9", datos: { nombre_personalizado: "Suma 9", cupo_parejas: 6, monto_inscripcion: 15000 }, parejas: 6, tipo: "libre" },
];
const FORMATO = { parejas_por_zona: 3, clasifican_por_zona: 2, formato_zona: "un_set_6", formato_llave: "mejor_de_3_stb" };

// Cómo queda cada competencia del torneo en juego: ahí se ven las tres etapas a la vez.
const EN_JUEGO = { mixto: "llave_primera_ronda", caballeros: "zonas_a_medias", suma9: "zonas_terminadas" };

const HOMBRES = ["Lucas", "Mateo", "Santiago", "Tomás", "Nicolás", "Martín", "Facundo", "Diego", "Pablo", "Bruno", "Franco", "Gonzalo", "Iván", "Joaquín", "Lautaro", "Marcos", "Rafael", "Agustín", "Emiliano", "Ramiro", "Julián", "Ezequiel", "Leandro", "Ignacio"];
const MUJERES = ["Ana", "Carolina", "Daniela", "Florencia", "Gabriela", "Julieta", "Lucía", "Mariana", "Natalia", "Paula", "Rocío", "Sofía", "Valentina", "Camila", "Clara", "Emilia"];
const APELLIDOS = ["Acosta", "Benítez", "Cabral", "Díaz", "Escobar", "Figueroa", "Godoy", "Herrera", "Ibáñez", "Juárez", "Ledesma", "Medina", "Navarro", "Ojeda", "Paz", "Quiroga", "Ríos", "Sosa", "Toledo", "Vera", "Molina", "Romero", "Suárez", "Luna"];

/** Azar reproducible (mulberry32): la demo sale igual cada vez que se crea. */
function azarCon(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parejasDe(tipo, cantidad, azar) {
  const nombre = (lista, i) => `${lista[i % lista.length]} ${APELLIDOS[Math.floor(azar() * APELLIDOS.length)]}`;
  return Array.from({ length: cantidad }, (_, i) => {
    if (tipo === "mixto") return [nombre(HOMBRES, i), nombre(MUJERES, i)];
    if (tipo === "caballeros") return [nombre(HOMBRES, i * 2), nombre(HOMBRES, i * 2 + 1)];
    return azar() < 0.5 ? [nombre(HOMBRES, i + 3), nombre(MUJERES, i + 5)] : [nombre(MUJERES, i + 2), nombre(MUJERES, i + 9)];
  });
}

/** Marcador válido para el formato. gana: 1 o 2. */
function marcador(formato, gana, azar) {
  const set = () => { const r = azar(); return r < 0.15 ? [7, 5] : r < 0.25 ? [7, 6] : [6, Math.floor(azar() * 5)]; };
  const orientar = ([g, p], quien) => (quien === 1 ? [g, p] : [p, g]);
  if (formato === "un_set_6") return [orientar(set(), gana)];
  // Mejor de 3 con super tie-break: a veces 2-0, a veces se define en el super tie-break.
  if (azar() < 0.6) return [orientar(set(), gana), orientar(set(), gana)];
  const pierde = gana === 1 ? 2 : 1;
  const stb = 10 + (azar() < 0.3 ? 2 : 0);
  return [orientar(set(), gana), orientar(set(), pierde), orientar([stb, stb - 2 - Math.floor(azar() * 3)], gana)];
}

/** Gana la mejor cabeza (menor número de sorteo) la mayoría de las veces, para que la demo sea creíble. */
const ganador = (p, ranking, azar) => {
  const [a, b] = [ranking.get(p.pareja1.id) ?? 99, ranking.get(p.pareja2.id) ?? 99];
  const favorita = a <= b ? 1 : 2;
  return azar() < 0.75 ? favorita : favorita === 1 ? 2 : 1;
};

async function jugarZonas(torneoId, categoriaId, org, ranking, azar, { soloLaMitad = false } = {}) {
  const detalle = await zonas.verZonas(torneoId, categoriaId, org);
  for (const zona of detalle.zonas) {
    const pendientes = zona.partidos.filter((p) => !p.sets);
    const cuantos = soloLaMitad ? Math.ceil(pendientes.length / 2) : pendientes.length;
    for (const p of pendientes.slice(0, cuantos)) await zonas.cargarResultado(torneoId, p.id, org, marcador(p.formato, ganador(p, ranking, azar), azar));
  }
}

async function jugarLlave(torneoId, categoriaId, org, ranking, azar, { rondas = Infinity } = {}) {
  for (let r = 0; r < rondas; r += 1) {
    const llave = await llaves.verLlave(torneoId, categoriaId, org);
    const ronda = llave.rondas[r];
    if (!ronda) return;
    for (const p of ronda.partidos.filter((x) => x.pareja1 && x.pareja2 && !x.sets)) {
      await zonas.cargarResultado(torneoId, p.id, org, marcador(p.formato, ganador(p, ranking, azar), azar));
    }
  }
}

/** Día, hora y cancha a los partidos que faltan jugar, para ver la programación. */
async function programarPendientes(torneoId, partidos, org, fecha) {
  for (const [i, p] of partidos.filter((x) => !x.sets).entries()) {
    await zonas.programarPartido(torneoId, p.id, org, { fecha, hora: `${String(17 + Math.floor(i / 3)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`, cancha: `Cancha ${(i % 3) + 1}` });
  }
}

const hoyAR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const sumarDias = (fecha, dias) => new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86400000).toISOString().slice(0, 10);

async function cuentaDemo({ crear }) {
  const persona = await Persona.findOne({ where: { email: CUENTA.email }, attributes: ["id", "apellido"] });
  if (!persona && !crear) return null;
  if (!persona) {
    // Contraseña al azar que no se guarda en ningún lado: nadie entra con esta cuenta.
    const r = await registrarCliente({ ...CUENTA, password: `${randomBytes(18).toString("base64url")}aA1!` });
    assert.equal(r.ok, true, r.mensaje);
    return cuentaDemo({ crear: false });
  }
  assert.equal(persona.apellido, CUENTA.apellido, "El email demo pertenece a otra persona: no se toca.");
  const usuario = await Usuario.findOne({ where: { persona_id: persona.id }, attributes: ["id"] });
  assert.ok(usuario, "La persona demo no tiene usuario.");
  return { usuario_id: usuario.id, roles: ["jugador", "organizador"], permisos: [] };
}

async function torneosDemo(org) {
  if (!org) return [];
  const todos = await Torneo.findAll({ where: { organizador_id: org.usuario_id }, attributes: ["id", "nombre", "estado", "descripcion"], order: [["id", "ASC"]] });
  return todos.filter((t) => t.descripcion?.startsWith(MARCA));
}

async function crearTorneo(org, { nombre, fecha, final, semilla }, log) {
  const azar = azarCon(semilla);
  const torneo = await torneos.crearTorneo(org, {
    nombre, descripcion: `${MARCA} ${final ? "Ya se jugó completo." : "Se ve una competencia en llave, otra en fase de grupos y otra con las zonas terminadas."}`,
    sede: "Club Demo MiPadel", localidad: "Formosa", fecha_inicio: fecha, fecha_fin: sumarDias(fecha, 2), contacto: "WhatsApp 0000-EJEMPLO", ...COBRO,
    reglamento: "DATOS FICTICIOS para ver cómo funciona MiPadel. Zonas de 3 parejas a un set de 6 games; clasifican 2 y, si sobran lugares en la llave, los mejores terceros. Llave al mejor de 3 con super tie-break.",
  });
  const ids = {};
  for (const c of CATEGORIAS) {
    const detalle = await torneos.crearCategoria(torneo.id, org, { ...FORMATO, monto_inscripcion: COBRO.monto_inscripcion, ...c.datos });
    ids[c.clave] = detalle.categorias.at(-1).id;
    await torneos.guardarPremios(torneo.id, ids[c.clave], org, PREMIOS);
  }
  await torneos.cambiarEstado(torneo.id, org, "inscripcion");
  const rankings = {};
  for (const c of CATEGORIAS) {
    const ranking = new Map();
    for (const [i, [j1, j2]] of parejasDe(c.tipo, c.parejas, azar).entries()) {
      const pareja = await inscripciones.cargarPareja(torneo.id, org, { categoria_id: ids[c.clave], jugador1_nombre: j1, jugador2_nombre: j2, cabeza_de_serie: i < Math.floor(c.parejas / 3) });
      ranking.set(pareja.id, i);
    }
    rankings[c.clave] = ranking;
    await zonas.generarZonas(torneo.id, ids[c.clave], org, { azar });
  }
  await torneos.cambiarEstado(torneo.id, org, "en_juego");

  for (const c of CATEGORIAS) {
    const etapa = final ? "completa" : EN_JUEGO[c.clave];
    await jugarZonas(torneo.id, ids[c.clave], org, rankings[c.clave], azar, { soloLaMitad: etapa === "zonas_a_medias" });
    if (["completa", "llave_primera_ronda"].includes(etapa)) {
      await llaves.armarLlaveCategoria(torneo.id, ids[c.clave], org);
      await jugarLlave(torneo.id, ids[c.clave], org, rankings[c.clave], azar, { rondas: etapa === "completa" ? Infinity : 1 });
    }
    if (!final) {
      const zonasDe = await zonas.verZonas(torneo.id, ids[c.clave], org);
      await programarPendientes(torneo.id, zonasDe.zonas.flatMap((z) => z.partidos), org, fecha);
      const llave = await llaves.verLlave(torneo.id, ids[c.clave], org);
      if (llave.armada) await programarPendientes(torneo.id, llave.rondas.flatMap((r) => r.partidos), org, sumarDias(fecha, 1));
    }
    log(`  ${nombre} · ${nombreCategoria(c.datos)}: ${etapa.replaceAll("_", " ")}`);
  }
  if (final) await torneos.cambiarEstado(torneo.id, org, "finalizado");
  return torneo;
}

/** Borra solo los torneos demo, de lo que cuelga a lo que lo sostiene (como eliminarTorneo). */
async function borrarTorneo(torneo) {
  await sequelize.transaction(async (t) => {
    const categorias = (await TorneoCategoria.findAll({ where: { torneo_id: torneo.id }, attributes: ["id"], transaction: t })).map((c) => c.id);
    await Partido.destroy({ where: { categoria_id: categorias }, transaction: t });
    await Inscripcion.destroy({ where: { torneo_id: torneo.id }, transaction: t });
    await Zona.destroy({ where: { categoria_id: categorias }, transaction: t });
    await TorneoPremio.destroy({ where: { categoria_id: categorias }, transaction: t });
    await TorneoCategoria.destroy({ where: { torneo_id: torneo.id }, transaction: t });
    await Torneo.destroy({ where: { id: torneo.id }, transaction: t });
  });
}

/** ¿La base tiene las tablas de esta versión y los roles iniciales? Si no, la demo no puede armarse. */
async function exigirBaseLista() {
  const [columnas] = await sequelize.query("SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'torneo' AND column_name = 'cobro_alias'");
  assert.ok(columnas.length, "La base no tiene las tablas de esta versión: arrancá el servidor una vez y volvé a correr la demo.");
  assert.equal(await Rol.count({ where: { codigo: ["jugador", "organizador"] } }), 2, "Faltan los roles iniciales: arrancá el servidor una vez.");
}

/** Torneos demo que hay hoy (sin crear la cuenta si no existe). */
export async function torneosDemoExistentes() {
  return torneosDemo(await cuentaDemo({ crear: false }));
}

/**
 * Crea los dos torneos demo si todavía no están. Devuelve { creados: false, existentes } si ya
 * estaban, o { creados: true, ids } con los dos torneos nuevos.
 */
// Una creación a la vez: el arranque y el botón del panel no la arman dos veces en paralelo.
let creando = null;

export function crearTorneosDemo({ log = console.log } = {}) {
  creando ??= crearSiFalta(log).finally(() => { creando = null; });
  return creando;
}

async function crearSiFalta(log) {
  await exigirBaseLista();
  const existentes = await torneosDemoExistentes();
  if (existentes.length) return { creados: false, existentes };
  const org = await cuentaDemo({ crear: true });
  // Suma el rol organizador (y la prueba gratis) a la cuenta demo; si ya lo tenía, no cambia nada.
  await empezarAOrganizar(org.usuario_id);
  const hoy = hoyAR();
  const fin = await crearTorneo(org, { nombre: "DEMO · Copa Primavera (finalizado)", fecha: sumarDias(hoy, -30), final: true, semilla: 2026 }, log);
  const enJuego = await crearTorneo(org, { nombre: "DEMO · Torneo de Otoño (en juego)", fecha: hoy, final: false, semilla: 1987 }, log);
  return { creados: true, ids: [fin.id, enJuego.id] };
}

/** Borra solo los torneos demo. La cuenta demo queda (no tiene datos personales reales). */
export async function borrarTorneosDemo() {
  const existentes = await torneosDemoExistentes();
  for (const t of existentes) await borrarTorneo(t);
  return existentes.length;
}
