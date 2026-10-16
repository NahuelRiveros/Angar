import {
  listarProductos, obtenerProductoPorId, crearProductoConVariedad, actualizarProductoConVariedad, cambiarEstadoProducto, eliminarProducto,
  ajustarPreciosMasivo, listarMarcas,
} from "../../services/distribuidora/producto_distribuidora_service.js";
import { validarVariedad, FILTROS_STOCK } from "../../services/common/articulo_rules.js";

// admin/staff gestionan el catálogo y necesitan seguir viendo los productos
// desactivados (para poder reactivarlos); cualquier otro rol ve solo lo activo.
function puedeVerInactivos(req) {
  const roles = req.user?.roles ?? [];
  return roles.includes("admin") || roles.includes("staff");
}

export async function listarProductosController(req, res) {
  try {
    // req.query siempre trae strings — "false" es truthy en JS, hay que
    // convertirlo a booleano posta antes de pasarlo al service.
    const gestion = puedeVerInactivos(req);
    const { categoria, q, pagina, por_pagina, marca, estado, stock } = req.query;
    const { productos, pagination } = await listarProductos({
      categoria, q, pagina, por_pagina, marca,
      incluirDescendientes: req.query.incluirDescendientes !== "false",
      soloActivos: !gestion,
      // Filtros de la gestión de artículos: un cliente no puede pedir inactivos ni stock.
      estado: gestion && ["activos", "inactivos"].includes(estado) ? estado : undefined,
      stock: gestion && FILTROS_STOCK.includes(stock) ? stock : undefined,
    });
    return res.json({ ok: true, data: productos, total: pagination.total, pagina: pagination.page, total_paginas: pagination.totalPages });
  } catch (error) {
    console.error("Error al listar productos:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar productos" });
  }
}

export async function obtenerProductoController(req, res) {
  try {
    const producto = await obtenerProductoPorId(req.params.id, { soloActivos: !puedeVerInactivos(req) });
    if (!producto) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    return res.json({ ok: true, data: producto });
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
    const producto = await crearProductoConVariedad(req.body, datos);
    return res.status(201).json({ ok: true, mensaje: "Producto creado correctamente", data: producto });
  } catch (error) {
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
    const producto = await actualizarProductoConVariedad(req.params.id, req.body, datos);
    if (!producto) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    return res.json({ ok: true, mensaje: "Producto actualizado correctamente", data: producto });
  } catch (error) {
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

export async function listarMarcasController(_req, res) {
  try {
    return res.json({ ok: true, data: await listarMarcas() });
  } catch (error) {
    console.error("Error al listar marcas:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar las marcas" });
  }
}
