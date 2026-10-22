import {
  listarProductos, obtenerProductoPorId, crearProductoConVariedad, actualizarProductoConVariedad, cambiarEstadoProducto, eliminarProducto,
  ajustarPreciosMasivo, cambiaPrecios, errorSinPermisoPrecios,
} from "../../services/distribuidora/producto_distribuidora_service.js";
import { tienePermiso } from "../../../../permisos_config.js";
import { validarVariedad, FILTROS_STOCK } from "../../services/common/articulo_rules.js";
import { listaDeUsuario, aplicarListaAProductos, idsProductosEnOferta, preciosEnListas } from "../../services/distribuidora/listas_precio_service.js";

const MAX_OFERTAS = 24;
// Precios para quien mira: la gestión ve la General; un cliente, la de su localidad.
const listaPara = (req, gestion) => (gestion ? null : listaDeUsuario(req.user?.usuario_id));

// Quien gestiona el catálogo necesita seguir viendo los productos desactivados
// (para poder reactivarlos); cualquier otro usuario ve solo lo activo.
const puedeVerInactivos = (req) => tienePermiso(req.user, "productos.editar", "precios.editar");
const sinPermisoPrecios = (req) => !tienePermiso(req.user, "precios.editar");
const respuestaSinPermiso = (res, error) => res.status(403).json({ ok: false, codigo: error.codigo, mensaje: error.message });

export async function listarProductosController(req, res) {
  try {
    // req.query siempre trae strings — "false" es truthy en JS, hay que
    // convertirlo a booleano posta antes de pasarlo al service.
    const gestion = puedeVerInactivos(req);
    const { categoria, q, pagina, por_pagina, marca, estado, stock } = req.query;
    const lista = await listaPara(req, gestion);
    // ?oferta=1: solo productos con precio anterior mayor al vigente para su lista.
    const ids = req.query.oferta === "1" ? await idsProductosEnOferta(lista?.id) : undefined;
    const { productos, pagination } = await listarProductos({
      categoria, q, pagina, por_pagina, marca, ids,
      incluirDescendientes: req.query.incluirDescendientes !== "false",
      soloActivos: !gestion,
      // Filtros de la gestión de artículos: un cliente no puede pedir inactivos ni stock.
      estado: gestion && ["activos", "inactivos"].includes(estado) ? estado : undefined,
      stock: gestion && FILTROS_STOCK.includes(stock) ? stock : undefined,
    });
    const data = await aplicarListaAProductos(productos, lista);
    return res.json({ ok: true, data, total: pagination.total, pagina: pagination.page, total_paginas: pagination.totalPages, lista_precio: lista?.nombre ?? null });
  } catch (error) {
    console.error("Error al listar productos:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar productos" });
  }
}

export async function obtenerProductoController(req, res) {
  try {
    const gestion = puedeVerInactivos(req);
    const producto = await obtenerProductoPorId(req.params.id, { soloActivos: !gestion });
    if (!producto) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    const [data] = await aplicarListaAProductos([producto], await listaPara(req, gestion));
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al obtener el producto" });
  }
}

export async function crearProductoController(req, res) {
  try {
    const { categoria_id, nombre } = req.body ?? {};
    if (!categoria_id || !nombre?.trim()) {
      return res.status(400).json({ ok: false, mensaje: "Elegí la familia y escribí el nombre del artículo." });
    }
    const { datos, error } = validarVariedad(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: error });
    // Un artículo nuevo sin permiso de precios se carga en $0 y lo completa quien sí lo tiene.
    if (sinPermisoPrecios(req) && cambiaPrecios(null, datos)) return respuestaSinPermiso(res, errorSinPermisoPrecios());
    const producto = await crearProductoConVariedad(req.body, datos);
    return res.status(201).json({ ok: true, mensaje: "Producto creado correctamente", data: producto });
  } catch (error) {
    if (error.codigo === "MARCA_INVALIDA") return res.status(400).json({ ok: false, codigo: error.codigo, mensaje: error.message });
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ ok: false, mensaje: "Ya existe un producto con ese nombre en esta categoría" });
    }
    console.error("Error al crear producto:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al crear el producto" });
  }
}

export async function actualizarProductoController(req, res) {
  try {
    if (!req.body?.categoria_id || !req.body?.nombre?.trim()) {
      return res.status(400).json({ ok: false, mensaje: "Elegí la familia y escribí el nombre del artículo." });
    }
    const { datos, error } = validarVariedad(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: error });
    const producto = await actualizarProductoConVariedad(req.params.id, req.body, datos, { sinPermisoPrecios: sinPermisoPrecios(req) });
    if (!producto) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    return res.json({ ok: true, mensaje: "Producto actualizado correctamente", data: producto });
  } catch (error) {
    if (error.codigo === "SIN_PERMISO_PRECIOS") return respuestaSinPermiso(res, error);
    if (error.codigo === "MARCA_INVALIDA") return res.status(400).json({ ok: false, codigo: error.codigo, mensaje: error.message });
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ ok: false, mensaje: "Ya existe un producto con ese nombre en esta categoría" });
    }
    console.error("Error al actualizar producto:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al actualizar el producto" });
  }
}

export async function cambiarEstadoProductoController(req, res) {
  try {
    const { activo } = req.body ?? {};
    if (typeof activo !== "boolean") return res.status(400).json({ ok: false, mensaje: "activo debe ser true o false" });
    const producto = await cambiarEstadoProducto(req.params.id, activo);
    if (!producto) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    return res.json({ ok: true, mensaje: activo ? "Producto activado" : "Producto desactivado", data: producto });
  } catch (error) {
    console.error("Error al cambiar estado del producto:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al cambiar el estado" });
  }
}

export async function eliminarProductoController(req, res) {
  try {
    const producto = await eliminarProducto(req.params.id);
    if (!producto) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    return res.json({ ok: true, mensaje: "Producto eliminado correctamente", data: null });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al eliminar el producto" });
  }
}

export async function ajustarPreciosMasivoController(req, res) {
  try {
    const { porcentaje, producto_id, categoria_id, confirmarTodoElCatalogo } = req.body ?? {};
    if (porcentaje === undefined || porcentaje === null || Number.isNaN(Number(porcentaje))) {
      return res.status(400).json({ ok: false, mensaje: "porcentaje es requerido" });
    }
    if (!producto_id && !categoria_id && !confirmarTodoElCatalogo) {
      return res.status(400).json({ ok: false, mensaje: "Falta confirmar que el ajuste aplica a todo el catálogo" });
    }
    const cantidad = await ajustarPreciosMasivo({ porcentaje, producto_id, categoria_id });
    return res.json({ ok: true, mensaje: `${cantidad} variedad(es) actualizada(s)`, data: { cantidad } });
  } catch (error) {
    console.error("Error al ajustar precios masivamente:", error);
    return res.status(error.status ?? 500).json({ ok: false, mensaje: error.status ? error.message : "Error interno al ajustar los precios" });
  }
}

/**
 * Carrusel de ofertas del home: productos activos en oferta para la lista de
 * quien mira, del mayor descuento al menor. `?limite=` hasta MAX_OFERTAS.
 */
export async function listarOfertasController(req, res) {
  try {
    const limite = Math.min(MAX_OFERTAS, Math.max(1, Math.floor(Number(req.query.limite)) || 12));
    const lista = await listaPara(req, false);
    // Se piden de más: alguno puede estar inactivo y se descarta al filtrar.
    const ids = await idsProductosEnOferta(lista?.id, { limite: limite * 2 });
    if (!ids.length) return res.json({ ok: true, data: [], lista_precio: lista?.nombre ?? null });
    const { productos } = await listarProductos({ ids, soloActivos: true, por_pagina: limite * 2 });
    const orden = new Map(ids.map((id, i) => [id, i]));
    const ordenados = [...productos].sort((a, b) => orden.get(a.id) - orden.get(b.id)).slice(0, limite);
    return res.json({ ok: true, data: await aplicarListaAProductos(ordenados, lista), lista_precio: lista?.nombre ?? null });
  } catch (error) {
    console.error("Error al listar ofertas:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar las ofertas" });
  }
}

/** Ficha del artículo (gestión): precio especial de cada presentación en otras listas. */
export async function preciosEnListasController(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ ok: false, mensaje: "Artículo inválido" });
    return res.json({ ok: true, data: await preciosEnListas(id) });
  } catch (error) {
    console.error("Error al listar precios por lista:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar los precios por lista" });
  }
}
