import {
  listarAreas,
  obtenerContenidoPublico,
  listarContenidoAdmin,
  crearContenido,
  actualizarContenido,
  cambiarEstadoContenido,
  eliminarContenido,
  obtenerConfigPublica,
  listarTextosAdmin,
  actualizarTextos,
  listarPilaresAdmin,
  crearPilar,
  actualizarPilar,
  cambiarEstadoPilar,
  eliminarPilar,
  listarContactosAdmin,
  crearContacto,
  actualizarContacto,
  cambiarEstadoContacto,
  eliminarContacto,
  actualizarLayoutArea,
} from "../../services/home/home_service.js";

export async function listarAreasController(_req, res) {
  try {
    const areas = await listarAreas();
    return res.json({ ok: true, data: areas });
  } catch (error) {
    console.error("Error al listar áreas del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar áreas" });
  }
}

export async function obtenerContenidoPublicoController(_req, res) {
  try {
    const data = await obtenerContenidoPublico();
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("Error al obtener contenido del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al obtener contenido del home" });
  }
}

export async function listarContenidoAdminController(req, res) {
  try {
    const area_id = req.query.area_id ? Number(req.query.area_id) : undefined;
    const data = await listarContenidoAdmin({ area_id });
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("Error al listar contenido del home (admin):", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar contenido" });
  }
}

export async function crearContenidoController(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: "Falta el archivo a subir" });
    }

    const resultado = await crearContenido({
      area_id: Number(req.body.area_id),
      titulo: req.body.titulo,
      descripcion: req.body.descripcion,
      orden: req.body.orden,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });

    if (!resultado.ok) {
      const status = resultado.codigo === "AREA_NO_EXISTE" ? 404 : 400;
      return res.status(status).json(resultado);
    }

    return res.status(201).json(resultado);
  } catch (error) {
    console.error("Error al crear contenido del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al subir el contenido" });
  }
}

export async function actualizarContenidoController(req, res) {
  try {
    const contenido = await actualizarContenido(req.params.id, req.body);
    if (!contenido) return res.status(404).json({ ok: false, mensaje: "Contenido no encontrado" });
    return res.json({ ok: true, mensaje: "Contenido actualizado correctamente", data: contenido });
  } catch (error) {
    console.error("Error al actualizar contenido del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al actualizar el contenido" });
  }
}

export async function cambiarEstadoContenidoController(req, res) {
  try {
    const { activo } = req.body;
    if (typeof activo !== "boolean") {
      return res.status(400).json({ ok: false, mensaje: "El campo activo debe ser booleano" });
    }
    const contenido = await cambiarEstadoContenido(req.params.id, activo);
    if (!contenido) return res.status(404).json({ ok: false, mensaje: "Contenido no encontrado" });
    return res.json({
      ok: true,
      mensaje: activo ? "Contenido activado correctamente" : "Contenido desactivado correctamente",
      data: contenido,
    });
  } catch (error) {
    console.error("Error al cambiar estado del contenido del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al cambiar estado" });
  }
}

export async function eliminarContenidoController(req, res) {
  try {
    const eliminado = await eliminarContenido(req.params.id);
    if (!eliminado) return res.status(404).json({ ok: false, mensaje: "Contenido no encontrado" });
    return res.json({ ok: true, mensaje: "Contenido eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar contenido del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al eliminar el contenido" });
  }
}

// ─── Config pública (textos + pilares + contactos + layout) ─────────────────

export async function obtenerConfigPublicaController(_req, res) {
  try {
    const data = await obtenerConfigPublica();
    return res.json({ ok: true, ...data });
  } catch (error) {
    console.error("Error al obtener la config del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al obtener la config del home" });
  }
}

// ─── Textos ───────────────────────────────────────────────────────────────

export async function listarTextosAdminController(_req, res) {
  try {
    const data = await listarTextosAdmin();
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("Error al listar textos del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar textos" });
  }
}

export async function actualizarTextosController(req, res) {
  try {
    const r = await actualizarTextos(req.body);
    if (!r.ok) return res.status(400).json(r);
    return res.json(r);
  } catch (error) {
    console.error("Error al actualizar textos del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al actualizar textos" });
  }
}

// ─── Pilares ──────────────────────────────────────────────────────────────

export async function listarPilaresAdminController(_req, res) {
  try {
    const data = await listarPilaresAdmin();
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("Error al listar pilares del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar pilares" });
  }
}

export async function crearPilarController(req, res) {
  try {
    const r = await crearPilar(req.body);
    if (!r.ok) return res.status(400).json(r);
    return res.status(201).json(r);
  } catch (error) {
    console.error("Error al crear pilar del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al crear el pilar" });
  }
}

export async function actualizarPilarController(req, res) {
  try {
    const r = await actualizarPilar(req.params.id, req.body);
    if (!r.ok) return res.status(r.codigo === "NO_EXISTE" ? 404 : 400).json(r);
    return res.json(r);
  } catch (error) {
    console.error("Error al actualizar pilar del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al actualizar el pilar" });
  }
}

export async function cambiarEstadoPilarController(req, res) {
  try {
    const { activo } = req.body;
    if (typeof activo !== "boolean") {
      return res.status(400).json({ ok: false, mensaje: "El campo activo debe ser booleano" });
    }
    const r = await cambiarEstadoPilar(req.params.id, activo);
    if (!r.ok) return res.status(404).json(r);
    return res.json(r);
  } catch (error) {
    console.error("Error al cambiar estado del pilar:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al cambiar estado" });
  }
}

export async function eliminarPilarController(req, res) {
  try {
    const r = await eliminarPilar(req.params.id);
    if (!r.ok) return res.status(404).json(r);
    return res.json(r);
  } catch (error) {
    console.error("Error al eliminar pilar del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al eliminar el pilar" });
  }
}

// ─── Contacto ─────────────────────────────────────────────────────────────

export async function listarContactosAdminController(_req, res) {
  try {
    const data = await listarContactosAdmin();
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("Error al listar contactos del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al listar contactos" });
  }
}

export async function crearContactoController(req, res) {
  try {
    const r = await crearContacto(req.body);
    if (!r.ok) return res.status(400).json(r);
    return res.status(201).json(r);
  } catch (error) {
    console.error("Error al crear contacto del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al crear el contacto" });
  }
}

export async function actualizarContactoController(req, res) {
  try {
    const r = await actualizarContacto(req.params.id, req.body);
    if (!r.ok) return res.status(r.codigo === "NO_EXISTE" ? 404 : 400).json(r);
    return res.json(r);
  } catch (error) {
    console.error("Error al actualizar contacto del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al actualizar el contacto" });
  }
}

export async function cambiarEstadoContactoController(req, res) {
  try {
    const { activo } = req.body;
    if (typeof activo !== "boolean") {
      return res.status(400).json({ ok: false, mensaje: "El campo activo debe ser booleano" });
    }
    const r = await cambiarEstadoContacto(req.params.id, activo);
    if (!r.ok) return res.status(404).json(r);
    return res.json(r);
  } catch (error) {
    console.error("Error al cambiar estado del contacto:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al cambiar estado" });
  }
}

export async function eliminarContactoController(req, res) {
  try {
    const r = await eliminarContacto(req.params.id);
    if (!r.ok) return res.status(404).json(r);
    return res.json(r);
  } catch (error) {
    console.error("Error al eliminar contacto del home:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al eliminar el contacto" });
  }
}

// ─── Layout de área ───────────────────────────────────────────────────────

export async function actualizarLayoutAreaController(req, res) {
  try {
    const r = await actualizarLayoutArea(req.params.id, req.body?.layout);
    if (!r.ok) return res.status(r.codigo === "NO_EXISTE" ? 404 : 400).json(r);
    return res.json(r);
  } catch (error) {
    console.error("Error al actualizar el layout del área:", error);
    return res.status(500).json({ ok: false, mensaje: "Error interno al actualizar el layout" });
  }
}
