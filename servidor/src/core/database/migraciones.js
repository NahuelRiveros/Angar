import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { QueryTypes } from "sequelize";

/**
 * MOD-08: cada cambio a las tablas de un módulo opcional es un par de archivos en su carpeta
 * `migraciones/` (la indica `migraciones` en su modulo.js):
 *   001_productos.subir.sql     lo que se aplica
 *   001_productos.deshacer.sql  cómo volver atrás
 * Una migración ya subida no se edita: se agrega otra. Los rubros y el core siguen con sync().
 */
const ARCHIVO = /^(\d{3}_[a-z0-9_]+)\.(subir|deshacer)\.sql$/;

/** Las migraciones de una carpeta, en orden. Falla si a una le falta su par o el número se repite. */
export function leerMigraciones(carpeta) {
  const ruta = fileURLToPath(carpeta);
  const porNombre = new Map();
  for (const archivo of readdirSync(ruta).sort()) {
    const [, nombre, tipo] = archivo.match(ARCHIVO) ?? [];
    if (!nombre) throw new Error(`Nombre de migración no válido: ${archivo}. Tiene que ser como 001_productos.subir.sql.`);
    porNombre.set(nombre, { nombre, ...porNombre.get(nombre), [tipo]: readFileSync(`${ruta}/${archivo}`, "utf8") });
  }
  const migraciones = [...porNombre.values()];
  const numeros = new Set();
  for (const { nombre, subir, deshacer } of migraciones) {
    if (!subir || !deshacer) throw new Error(`La migración ${nombre} necesita los dos archivos: .subir.sql y .deshacer.sql.`);
    const numero = nombre.slice(0, 3);
    if (numeros.has(numero)) throw new Error(`Hay dos migraciones con el número ${numero}.`);
    numeros.add(numero);
  }
  return migraciones;
}

const conMigraciones = (modulos) => modulos.filter((m) => m.migraciones);

async function crearTabla(sequelize, schema) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}"."_migraciones" (
      modulo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (modulo, nombre)
    )
  `);
}

async function aplicadas(sequelize, schema, modulo, transaction) {
  const filas = await sequelize.query(
    `SELECT nombre FROM "${schema}"."_migraciones" WHERE modulo = :modulo ORDER BY nombre`,
    { replacements: { modulo }, type: QueryTypes.SELECT, transaction },
  );
  return filas.map((f) => f.nombre);
}

/** Una transacción con el candado de migraciones: dos servidores que arrancan juntos hacen fila. */
function conCandado(sequelize, schema, accion) {
  return sequelize.transaction(async (transaction) => {
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:clave))", { replacements: { clave: `migraciones:${schema}` }, transaction });
    await sequelize.query(`SET LOCAL search_path TO "${schema}", public`, { transaction });
    return accion(transaction);
  });
}

/** Aplica lo que falta de los módulos recibidos (ya en orden). Devuelve ["modulo/001_nombre", …]. */
export async function subirMigraciones(modulos, { sequelize, schema }) {
  const pendientes = conMigraciones(modulos);
  if (!pendientes.length) return [];
  await crearTabla(sequelize, schema);
  const hechas = [];
  for (const { codigo, migraciones } of pendientes) {
    // Afuera del candado: con todo aplicado, el arranque hace una sola consulta por módulo.
    const previas = await aplicadas(sequelize, schema, codigo);
    for (const { nombre, subir } of leerMigraciones(migraciones).filter((m) => !previas.includes(m.nombre))) {
      try {
        const aplicada = await conCandado(sequelize, schema, async (transaction) => {
          if ((await aplicadas(sequelize, schema, codigo, transaction)).includes(nombre)) return false;
          await sequelize.query(subir, { transaction });
          await sequelize.query(`INSERT INTO "${schema}"."_migraciones" (modulo, nombre) VALUES (:codigo, :nombre)`, { replacements: { codigo, nombre }, transaction });
          return true;
        });
        if (aplicada) hechas.push(`${codigo}/${nombre}`);
      } catch (error) {
        throw new Error(`La migración ${codigo}/${nombre} falló y no se aplicó: ${error.message}`, { cause: error });
      }
    }
  }
  return hechas;
}

/** Deshace la última migración de un módulo. Devuelve su nombre, o null si no tenía ninguna. */
export async function deshacerMigracion(modulo, { sequelize, schema }) {
  await crearTabla(sequelize, schema);
  return conCandado(sequelize, schema, async (transaction) => {
    const nombre = (await aplicadas(sequelize, schema, modulo.codigo, transaction)).at(-1);
    if (!nombre) return null;
    const migracion = leerMigraciones(modulo.migraciones).find((m) => m.nombre === nombre);
    if (!migracion) throw new Error(`No está el archivo para deshacer ${modulo.codigo}/${nombre}.`);
    await sequelize.query(migracion.deshacer, { transaction });
    await sequelize.query(`DELETE FROM "${schema}"."_migraciones" WHERE modulo = :codigo AND nombre = :nombre`, { replacements: { codigo: modulo.codigo, nombre }, transaction });
    return nombre;
  });
}

/** Por módulo: qué migraciones tiene y cuáles ya se aplicaron. */
export async function estadoMigraciones(modulos, { sequelize, schema }) {
  const estado = [];
  for (const { codigo, migraciones } of conMigraciones(modulos)) {
    const hechas = await aplicadas(sequelize, schema, codigo).catch(() => []); // sin tabla todavía: ninguna
    for (const { nombre } of leerMigraciones(migraciones)) estado.push({ modulo: codigo, nombre, aplicada: hechas.includes(nombre) });
  }
  return estado;
}

/** MOD-09: por qué no se puede deshacer en esta base, o null si se puede. Deshacer borra datos. */
export function problemaParaDeshacer({ entorno, urlRemota, host, esquema, esquemaProduccion }) {
  if (entorno === "production" || urlRemota || !["localhost", "127.0.0.1", "::1"].includes(host)) return "Deshacer solo se puede en la base de tu PC: borra tablas y datos.";
  if (esquemaProduccion && esquema === esquemaProduccion) return `El esquema "${esquema}" es el de producción: no se deshace.`;
  return null;
}
