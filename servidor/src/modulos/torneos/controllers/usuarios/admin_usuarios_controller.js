import { crearUsuarioConRoles ,listarUsuarios} from "../../services/usuarios/admin_usuarios_service.js";


export async function crearUsuarioController(req, res) {
  try {
    const result = await crearUsuarioConRoles(req.body ?? {});
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (error) {
    console.error("crearUsuarioController:", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_CREAR_USUARIO",
      mensaje: "No se pudo crear el usuario",
    });
  }
}


export async function listarUsuariosController(req, res) {
  try {
    const { buscar, rol, activo, page, limit } = req.query ?? {};
    const result = await listarUsuarios({ buscar, rol, activo, page, limit });
    return res.json(result);
  } catch (error) {
    console.error("listarUsuariosController:", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_USUARIOS",
      mensaje: "No se pudo listar usuarios",
    });
  }
}
