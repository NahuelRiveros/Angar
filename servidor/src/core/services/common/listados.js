import { Op, UniqueConstraintError, col, fn, where } from "sequelize";
import { ErrorApp, noExiste } from "./errores.js";
import { armarPaginacion, normalizarPaginacion } from "./pagination.js";

// Ayudas para los services de los módulos opcionales.

/** Traduce el "valor repetido" de la base a un mensaje claro. */
export async function sinRepetir(accion, mensaje) {
  try { return await accion(); } catch (error) {
    if (error instanceof UniqueConstraintError) throw new ErrorApp("DUPLICADO", mensaje, 409);
    throw error;
  }
}

export async function buscarPorId(Modelo, id, mensaje, opciones = {}) {
  const fila = await Modelo.findByPk(id, opciones);
  if (!fila) throw noExiste(mensaje);
  return fila;
}

/** "%" y "_" escritos por la persona se buscan como texto, no como comodines. */
export const patronBusqueda = (q) => `%${String(q).replace(/[\\%_]/g, "\\$&")}%`;

export const CON_ACENTO = "áéíóúüñÁÉÍÓÚÜÑ";
export const SIN_ACENTO = "aeiouunAEIOUUN";

/** Busca sin distinguir mayúsculas ni acentos, sin depender de extensiones de PostgreSQL. */
export function contiene(columna, q) {
  const buscado = String(q).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  // Primero sin acentos: en una base con idioma "C", lower() no conoce la "Ñ".
  return where(fn("lower", fn("translate", col(columna), CON_ACENTO, SIN_ACENTO)), { [Op.like]: patronBusqueda(buscado) });
}

/** Una página de un listado: { items, paginacion }. */
export async function paginar(Modelo, opciones, { page, limit }) {
  const p = normalizarPaginacion({ page, limit });
  const { rows, count } = await Modelo.findAndCountAll({ ...opciones, limit: p.limit, offset: p.offset });
  return { items: rows, paginacion: armarPaginacion({ page: p.page, limit: p.limit, total: count }) };
}
