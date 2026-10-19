import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";
import { ListaPrecio, ListaPrecioLocalidad, ListaPrecioItem, PerfilClienteDistribuidora, VariedadDistribuidora } from "../../models/index.js";
import { formatearNombre } from "../common/formato_nombre.js";
import { normalizarPaginacion, armarPaginacion } from "../common/pagination.js";

/**
 * Listas de precios regionales. Regla del precio para un cliente: si su
 * localidad (perfil) está en una lista activa y esa lista tiene precio para la
 * presentación, se usa ese (con su precio_anterior); si no, la General (precio
 * de la variedad). Sin cuenta o sin localidad cargada: General.
 */

export const errorLista = (mensaje, codigo = "LISTA_INVALIDA", extra = {}) => Object.assign(new Error(mensaje), { codigo, ...extra });
const consulta = (sql, replacements, transaction) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });
const norm = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
export const claveLocalidad = ({ provincia, departamento, localidad }) => `${norm(provincia)}|${norm(departamento)}|${norm(localidad)}`.slice(0, 260);
const dinero = (valor) => (valor == null || valor === "" ? null : Math.round(Number(valor) * 100) / 100);
const MAX_PRECIO = 99999999.99;

// ── Precio para un cliente ─────────────────────────────────────────────────

/** Lista activa que corresponde a la localidad del perfil del usuario, o null (General). */
export async function listaDeUsuario(usuario_id, transaction) {
  if (!usuario_id) return null;
  const perfil = await PerfilClienteDistribuidora.findOne({ where: { usuario_id }, attributes: ["provincia", "departamento", "localidad"], raw: true, transaction });
  if (!perfil?.provincia || !perfil?.localidad) return null;
  const [lista] = await consulta(
    `SELECT l.id, l.nombre FROM lista_precio_localidad ll JOIN lista_precio l ON l.id = ll.lista_id
     WHERE ll.clave = :clave AND l.activo LIMIT 1`, { clave: claveLocalidad(perfil) }, transaction,
  );
  return lista ?? null;
}

/** Precios de la lista para esas presentaciones: Map variedad_id → { precio, precio_anterior }. */
export async function preciosDeLista(listaId, variedadIds, transaction) {
  if (!listaId || !variedadIds.length) return new Map();
  const filas = await ListaPrecioItem.findAll({ where: { lista_id: listaId, variedad_id: [...new Set(variedadIds)] }, attributes: ["variedad_id", "precio", "precio_anterior"], raw: true, transaction });
  return new Map(filas.map((f) => [f.variedad_id, { precio: Number(f.precio), precio_anterior: f.precio_anterior == null ? null : Number(f.precio_anterior) }]));
}

/**
 * Aplica la lista a productos ya cargados (con `variedades`): reemplaza precio y
 * precio_anterior de las presentaciones que tienen precio especial. Devuelve
 * objetos planos; sin lista los deja como están (General).
 */
export async function aplicarListaAProductos(productos, lista, transaction) {
  const planos = productos.map((p) => (typeof p?.get === "function" ? p.get({ plain: true }) : p));
  if (!lista) return planos;
  const precios = await preciosDeLista(lista.id, planos.flatMap((p) => (p.variedades ?? []).map((v) => v.id)), transaction);
  return planos.map((p) => ({
    ...p,
    variedades: (p.variedades ?? []).map((v) => (precios.has(v.id) ? { ...v, ...precios.get(v.id) } : v)),
  }));
}

/**
 * Productos en oferta para la lista: alguna presentación vigente con precio
 * anterior mayor al precio (el de la lista si tiene, si no el General).
 * Ordenados por mayor descuento. Lista null = General.
 */
export async function idsProductosEnOferta(listaId, { limite } = {}, transaction) {
  const filas = await consulta(
    `SELECT v.producto_id, max(1 - (CASE WHEN i.id IS NULL THEN v.precio ELSE i.precio END)
              / NULLIF(CASE WHEN i.id IS NULL THEN v.precio_anterior ELSE i.precio_anterior END, 0)) AS descuento
     FROM variedad_distribuidora v
     LEFT JOIN lista_precio_item i ON i.variedad_id = v.id AND i.lista_id = :lista
     WHERE v.fecha_baja IS NULL
       AND (CASE WHEN i.id IS NULL THEN v.precio_anterior > v.precio ELSE i.precio_anterior > i.precio END)
     GROUP BY v.producto_id ORDER BY descuento DESC, v.producto_id ASC
     ${limite ? "LIMIT :limite" : ""}`,
    { lista: listaId ?? 0, limite: Number(limite) || null }, transaction,
  );
  return filas.map((f) => f.producto_id);
}

// ── Gestión de listas ──────────────────────────────────────────────────────

export async function listarListas() {
  return consulta(`SELECT l.id, l.nombre, l.activo,
      (SELECT count(*)::int FROM lista_precio_localidad ll WHERE ll.lista_id = l.id) AS localidades,
      (SELECT count(*)::int FROM lista_precio_item i WHERE i.lista_id = l.id) AS articulos
    FROM lista_precio l ORDER BY lower(l.nombre)`);
}

export async function obtenerLista(id) {
  const lista = await ListaPrecio.findByPk(id, { attributes: ["id", "nombre", "activo"], raw: true });
  if (!lista) return null;
  const localidades = await ListaPrecioLocalidad.findAll({ where: { lista_id: id }, attributes: ["provincia", "departamento", "localidad"], order: [["provincia", "ASC"], ["departamento", "ASC"], ["localidad", "ASC"]], raw: true });
  return { ...lista, localidades };
}

function validarLocalidades(localidades) {
  if (!Array.isArray(localidades)) throw errorLista("Elegí las localidades de la lista.");
  if (localidades.length > 2000) throw errorLista("Una lista admite hasta 2000 localidades.");
  const vistas = new Map();
  for (const l of localidades) {
    const fila = { provincia: String(l?.provincia ?? "").trim().slice(0, 50), departamento: String(l?.departamento ?? "").trim().slice(0, 100) || null, localidad: String(l?.localidad ?? "").trim().slice(0, 100) };
    if (!fila.provincia || !fila.localidad) throw errorLista("Cada localidad necesita provincia y localidad.");
    vistas.set(claveLocalidad(fila), fila);
  }
  return [...vistas.entries()].map(([clave, fila]) => ({ ...fila, clave }));
}

/** Alta o edición (id null = alta). Una localidad que ya está en otra lista se rechaza con el detalle. */
export async function guardarLista(id, { nombre, activo = true, localidades }) {
  const limpio = formatearNombre(nombre);
  if (!limpio) throw errorLista("Escribí el nombre de la lista.");
  if (limpio.length > 80) throw errorLista("El nombre admite hasta 80 caracteres.");
  const filas = validarLocalidades(localidades);
  return sequelize.transaction(async (transaction) => {
    let lista = id ? await ListaPrecio.findByPk(id, { lock: transaction.LOCK.UPDATE, transaction }) : null;
    if (id && !lista) return null;
    const mismoNombre = await ListaPrecio.findOne({ where: { [Op.and]: [sequelize.where(sequelize.fn("lower", sequelize.col("nombre")), limpio.toLowerCase()), ...(lista ? [{ id: { [Op.ne]: lista.id } }] : [])] }, transaction });
    if (mismoNombre) throw errorLista(`Ya existe la lista "${mismoNombre.nombre}".`);
    if (filas.length) {
      const ocupadas = await consulta(
        `SELECT ll.localidad, ll.provincia, l.nombre AS lista FROM lista_precio_localidad ll JOIN lista_precio l ON l.id = ll.lista_id
         WHERE ll.clave IN (:claves) ${lista ? "AND ll.lista_id <> :id" : ""} ORDER BY ll.localidad LIMIT 5`,
        { claves: filas.map((f) => f.clave), id: lista?.id }, transaction,
      );
      if (ocupadas.length) {
        throw errorLista(`Una localidad pertenece a una sola lista: ${ocupadas.map((o) => `${o.localidad} (${o.provincia}) ya está en "${o.lista}"`).join(", ")}.`);
      }
    }
    if (lista) await lista.update({ nombre: limpio, activo: Boolean(activo), fecha_mod: new Date() }, { transaction });
    else lista = await ListaPrecio.create({ nombre: limpio, activo: Boolean(activo), fecha_alta: new Date(), fecha_mod: new Date() }, { transaction });
    await ListaPrecioLocalidad.destroy({ where: { lista_id: lista.id }, transaction });
    if (filas.length) await ListaPrecioLocalidad.bulkCreate(filas.map((f) => ({ ...f, lista_id: lista.id })), { transaction });
    return { id: lista.id, nombre: lista.nombre };
  });
}

/** Borra la lista con sus localidades y precios; los pedidos ya hechos guardan su copia del nombre. */
export async function eliminarLista(id) {
  const borradas = await ListaPrecio.destroy({ where: { id } });
  return borradas > 0;
}

// ── Precios de una lista ───────────────────────────────────────────────────

/**
 * Artículos con su precio General y el de la lista, paginado. `solo_especiales`
 * muestra solo los que tienen precio en la lista. Busca por nombre, marca o código.
 */
export async function listarPreciosDeLista(listaId, { q, solo_especiales, pagina, por_pagina } = {}) {
  const { page, limit, offset } = normalizarPaginacion({ page: pagina, limit: por_pagina, defaultLimit: 50, maxLimit: 100 });
  const condiciones = ["v.fecha_baja IS NULL", "p.fecha_baja IS NULL"];
  const replacements = { lista: listaId, limit, offset };
  const texto = String(q ?? "").trim().slice(0, 120);
  if (texto) {
    condiciones.push("(p.nombre ILIKE :patron OR p.marca ILIKE :patron OR v.cod_ref ILIKE :patron OR v.codigo_barras ILIKE :patron)");
    replacements.patron = `%${texto.replace(/[\\%_]/g, "\\$&")}%`;
  }
  if (solo_especiales) condiciones.push("i.id IS NOT NULL");
  const desde = `FROM variedad_distribuidora v JOIN producto_distribuidora p ON p.id = v.producto_id
    LEFT JOIN lista_precio_item i ON i.variedad_id = v.id AND i.lista_id = :lista
    WHERE ${condiciones.join(" AND ")}`;
  const [filas, [{ total }]] = await Promise.all([
    consulta(`SELECT v.id AS variedad_id, p.id AS producto_id, p.nombre, p.marca, v.cod_ref, v.nombre AS presentacion,
        v.precio AS precio_general, v.precio_anterior AS precio_anterior_general,
        i.precio, i.precio_anterior
      ${desde} ORDER BY (i.id IS NULL), lower(p.nombre), v.id LIMIT :limit OFFSET :offset`, replacements),
    consulta(`SELECT count(*)::int AS total ${desde}`, replacements),
  ]);
  const num = (v) => (v == null ? null : Number(v));
  return {
    filas: filas.map((f) => ({ ...f, precio_general: num(f.precio_general), precio_anterior_general: num(f.precio_anterior_general), precio: num(f.precio), precio_anterior: num(f.precio_anterior) })),
    pagination: armarPaginacion({ page, limit, total }),
  };
}

function validarPrecio(fila) {
  const precio = dinero(fila.precio);
  const precio_anterior = dinero(fila.precio_anterior);
  if (precio == null) return { variedad_id: fila.variedad_id, quitar: true };
  if (!Number.isFinite(precio) || precio < 0 || precio > MAX_PRECIO) throw errorLista("Precio inválido.");
  if (precio_anterior != null && (!Number.isFinite(precio_anterior) || precio_anterior < 0 || precio_anterior > MAX_PRECIO)) throw errorLista("Precio anterior inválido.");
  return { variedad_id: fila.variedad_id, precio, precio_anterior };
}

/**
 * Guarda precios de la lista: precio vacío quita el precio especial (vuelve a la
 * General). Todo en una transacción. Devuelve cuántos se guardaron y quitaron.
 */
export async function guardarPreciosDeLista(listaId, filas) {
  const validas = filas.map(validarPrecio);
  return sequelize.transaction(async (transaction) => {
    const lista = await ListaPrecio.findByPk(listaId, { lock: transaction.LOCK.UPDATE, transaction });
    if (!lista) return null;
    const ids = [...new Set(validas.map((f) => f.variedad_id))];
    const existentes = await VariedadDistribuidora.count({ where: { id: ids, fecha_baja: null }, transaction });
    if (existentes !== ids.length) throw errorLista("Algún artículo ya no existe; actualizá la pantalla.");
    const quitar = validas.filter((f) => f.quitar).map((f) => f.variedad_id);
    const poner = validas.filter((f) => !f.quitar);
    if (quitar.length) await ListaPrecioItem.destroy({ where: { lista_id: listaId, variedad_id: quitar }, transaction });
    if (poner.length) {
      await ListaPrecioItem.bulkCreate(poner.map((f) => ({ ...f, lista_id: listaId, fecha_mod: new Date() })), {
        transaction, updateOnDuplicate: ["precio", "precio_anterior", "fecha_mod"], conflictAttributes: ["lista_id", "variedad_id"],
      });
    }
    await lista.update({ fecha_mod: new Date() }, { transaction });
    return { guardados: poner.length, quitados: quitar.length };
  });
}

/**
 * "Pegar desde Excel": filas { cod_ref, precio, precio_anterior? } por código del
 * artículo. Los códigos que no existen se informan y no se guarda nada si hay alguno.
 */
export async function importarPreciosDeLista(listaId, filas) {
  const codigos = [...new Set(filas.map((f) => String(f.cod_ref ?? "").trim()).filter(Boolean))];
  if (!codigos.length) throw errorLista("No encontramos códigos para importar.");
  const variedades = await VariedadDistribuidora.findAll({ where: { cod_ref: codigos, fecha_baja: null }, attributes: ["id", "cod_ref"], raw: true });
  const porCodigo = new Map(variedades.map((v) => [v.cod_ref, v.id]));
  const faltan = codigos.filter((c) => !porCodigo.has(c));
  if (faltan.length) throw errorLista(`No existen estos códigos: ${faltan.slice(0, 10).join(", ")}${faltan.length > 10 ? ` y ${faltan.length - 10} más` : ""}. No se guardó nada.`);
  return guardarPreciosDeLista(listaId, filas.map((f) => ({ variedad_id: porCodigo.get(String(f.cod_ref).trim()), precio: f.precio, precio_anterior: f.precio_anterior })));
}

/** Para la ficha del artículo: en qué listas tiene precio especial cada presentación. */
export async function preciosEnListas(productoId) {
  const filas = await consulta(
    `SELECT i.variedad_id, l.id AS lista_id, l.nombre AS lista, l.activo, i.precio, i.precio_anterior
     FROM lista_precio_item i JOIN lista_precio l ON l.id = i.lista_id JOIN variedad_distribuidora v ON v.id = i.variedad_id
     WHERE v.producto_id = :productoId ORDER BY lower(l.nombre)`, { productoId },
  );
  return filas.map((f) => ({ ...f, precio: Number(f.precio), precio_anterior: f.precio_anterior == null ? null : Number(f.precio_anterior) }));
}
