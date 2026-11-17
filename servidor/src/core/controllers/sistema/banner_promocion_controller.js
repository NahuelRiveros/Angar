import * as banners from "../../services/sistema/banner_promocion_service.js";

// Controllers delgados: la entrada ya viene validada en req.datos (middleware/validar.js) y los
// errores esperados los lanza el service como ErrorApp; los responde el manejador de app.js.

export async function listarVigentesController(_req, res) {
  return res.json({ ok: true, data: await banners.listarVigentes() });
}

export async function listarTodosController(_req, res) {
  return res.json({ ok: true, data: await banners.listarTodos() });
}

export async function crearController(req, res) {
  const data = await banners.crear(req.datos.body);
  return res.status(201).json({ ok: true, codigo: "BANNER_CREADO", mensaje: "Banner creado.", data });
}

export async function actualizarController(req, res) {
  const data = await banners.actualizar(req.datos.params.id, req.datos.body);
  return res.json({ ok: true, codigo: "BANNER_ACTUALIZADO", mensaje: "Banner actualizado.", data });
}

export async function cambiarEstadoController(req, res) {
  const { activo } = req.datos.body;
  const data = await banners.cambiarEstado(req.datos.params.id, activo);
  return res.json({ ok: true, codigo: "BANNER_ESTADO", mensaje: activo ? "Banner activado." : "Banner desactivado.", data });
}

export async function eliminarController(req, res) {
  await banners.eliminar(req.datos.params.id);
  return res.json({ ok: true, codigo: "BANNER_ELIMINADO", mensaje: "Banner eliminado." });
}
