import { Op, QueryTypes, UniqueConstraintError, col, fn, where } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { ErrorApp, noExiste } from "./errores.js";
import { armarPaginacion, normalizarPaginacion } from "./pagination.js";

// Consultas que se repiten en los services (ficha: docs/specs/core/servidor.md). Todo lo que escribe la
// persona viaja como reemplazo (:nombre) o dentro de un `where` de Sequelize, nunca pegado al SQL.

// ── Buscar y traer ──────────────────────────────────────────────────────────
/**
 * La fila o un 404 con `mensaje`. `id`: número (por clave) u objeto (where). `bloquear`: la deja tomada
 * hasta que termine la transacción, para que dos cambios a la vez no se pisen.
 */
export async function obtenerOFallar(Modelo, id, mensaje, { transaction, bloquear = false, ...opciones } = {}) {
  const extra = { ...opciones, transaction, ...(bloquear && { lock: transaction.LOCK.UPDATE }) };
  const fila = typeof id === "object" ? await Modelo.findOne({ where: id, ...extra }) : await Modelo.findByPk(id, extra);
  if (!fila) throw noExiste(mensaje);
  return fila;
}

/** Si la fila cambió desde que la persona la abrió (`version` distinta), avisa en vez de pisarla. */
export function exigirVersion(fila, version, mensaje = "Otra persona lo cambió recién. Recargá para ver cómo quedó.") {
  if (fila.version !== version) throw new ErrorApp("CAMBIO_SIMULTANEO", mensaje, 409);
}

/** Traduce el "valor repetido" de la base a un mensaje claro. */
export async function sinRepetir(accion, mensaje) {
  try { return await accion(); } catch (error) {
    if (error instanceof UniqueConstraintError) throw new ErrorApp("DUPLICADO", mensaje, 409);
    throw error;
  }
}

// ── Buscar texto ────────────────────────────────────────────────────────────
const CON_ACENTO = "áéíóúüñÁÉÍÓÚÜÑ";
const SIN_ACENTO = "aeiouunAEIOUUN";
const sinAcentosTexto = (q) => String(q).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** "%" y "_" escritos por la persona se buscan como texto, no como comodines. */
export const patronBusqueda = (q) => `%${String(q).replace(/[\\%_]/g, "\\$&")}%`;

/** Lo buscado, listo para comparar con `sinAcentosSql(...) LIKE :patron`. */
export const patronSinAcentos = (q) => patronBusqueda(sinAcentosTexto(q));

/**
 * La columna sin mayúsculas ni acentos, para SQL escrito a mano. `columna` es siempre un nombre fijo del
 * código (ej. "p.nombre"), nunca algo que llega de la persona. Primero sin acentos: en una base con
 * idioma "C", lower() no conoce la "Ñ".
 */
export const sinAcentosSql = (columna) => `lower(translate(${columna}, '${CON_ACENTO}', '${SIN_ACENTO}'))`;

/** Condición de Sequelize: la columna contiene lo buscado, sin distinguir mayúsculas ni acentos. */
export function contiene(columna, q) {
  return where(fn("lower", fn("translate", col(columna), CON_ACENTO, SIN_ACENTO)), { [Op.like]: patronSinAcentos(q) });
}

/** Lo buscado en cualquiera de las columnas; null si no hay nada para buscar. */
export function buscarTexto(columnas, q) {
  const texto = String(q ?? "").trim();
  if (!texto || !columnas.length) return null;
  return { [Op.or]: columnas.map((columna) => contiene(columna, texto)) };
}

// ── Listados con páginas ────────────────────────────────────────────────────
/** Una página de un listado con un modelo: { items, paginacion }. */
export async function paginar(Modelo, opciones, { page, limit, maxLimit }) {
  const p = normalizarPaginacion({ page, limit, maxLimit: maxLimit ?? limit });
  const { rows, count } = await Modelo.findAndCountAll({ ...opciones, limit: p.limit, offset: p.offset });
  return { items: rows, paginacion: armarPaginacion({ page: p.page, limit: p.limit, total: count }) };
}

/**
 * Una página de un listado con SQL: { items, paginacion }. `columnas`, `desde` (FROM … WHERE …) y `orden`
 * son texto fijo del código; los valores van en `replacements` (:nombre).
 */
export async function paginarSql({ columnas, desde, orden, replacements = {}, page, limit, transaction }) {
  const p = normalizarPaginacion({ page, limit, maxLimit: limit });
  const opciones = { replacements: { ...replacements, limite: p.limit, salto: p.offset }, type: QueryTypes.SELECT, transaction };
  const [items, [{ total }]] = await Promise.all([
    sequelize.query(`SELECT ${columnas} ${desde} ORDER BY ${orden} LIMIT :limite OFFSET :salto`, opciones),
    sequelize.query(`SELECT count(*)::int AS total ${desde}`, opciones),
  ]);
  return { items, paginacion: armarPaginacion({ page: p.page, limit: p.limit, total }) };
}

// ── Quién lo hizo ───────────────────────────────────────────────────────────
/**
 * Para historiales: el nombre de la persona detrás de `columnaUsuario` (ej. "h.usuario_id"), vacío si no
 * hay. Devuelve { columna, union } para sumar a un SELECT y a su FROM.
 */
export const quienLoHizo = (columnaUsuario) => ({
  columna: "NULLIF(TRIM(CONCAT(quien_p.nombre, ' ', quien_p.apellido)), '') AS persona",
  union: `LEFT JOIN usuario quien_u ON quien_u.id = ${columnaUsuario} LEFT JOIN persona quien_p ON quien_p.id = quien_u.persona_id`,
});
