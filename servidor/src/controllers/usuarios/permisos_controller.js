import { permisosConfig } from "../../../../permisos_config.js";
import {
  listarRolesConPermisos, guardarPermisosDeRol, crearRol, eliminarRol,
} from "../../services/usuarios/permisos_service.js";

const esId = (valor) => /^\d+$/.test(String(valor ?? ""));
const rolNoEncontrado = (res) => res.status(404).json({ ok: false, mensaje: "Rol no encontrado" });

function responderError(res, error, contexto, generico) {
  if (!error.status) console.error(`Error al ${contexto}:`, error);
  return res.status(error.status ?? 500).json({ ok: false, codigo: error.codigo, mensaje: error.status ? error.message : generico });
}

export async function listarPermisosController(_req, res) {
  try {
    const { grupos, permisos } = permisosConfig;
    return res.json({ ok: true, data: { grupos, permisos: permisos.map(({ porDefecto: _interno, ...p }) => p), roles: await listarRolesConPermisos() } });
  } catch (error) {
    return responderError(res, error, "listar permisos", "Error interno al listar los permisos");
  }
}

export async function crearRolController(req, res) {
  try {
    const rol = await crearRol({ nombre: req.body?.nombre, permisos: req.body?.permisos ?? [] });
    return res.status(201).json({ ok: true, mensaje: "Rol creado", data: { id: rol.id, codigo: rol.codigo, nombre: rol.descripcion } });
  } catch (error) {
    return responderError(res, error, "crear rol", "Error interno al crear el rol");
  }
}

export async function guardarPermisosRolController(req, res) {
  try {
    if (!esId(req.params.id)) return rolNoEncontrado(res);
    const rol = await guardarPermisosDeRol(Number(req.params.id), req.body?.permisos);
    if (!rol) return rolNoEncontrado(res);
    return res.json({ ok: true, mensaje: "Permisos guardados", data: rol });
  } catch (error) {
    return responderError(res, error, "guardar permisos", "Error interno al guardar los permisos");
  }
}

export async function eliminarRolController(req, res) {
  try {
    if (!esId(req.params.id)) return rolNoEncontrado(res);
    const rol = await eliminarRol(Number(req.params.id));
    if (!rol) return rolNoEncontrado(res);
    return res.json({ ok: true, mensaje: "Rol eliminado" });
  } catch (error) {
    return responderError(res, error, "eliminar rol", "Error interno al eliminar el rol");
  }
}
