import {
  listarStaff,
  listarRolesAsignables,
  crearStaff,
  actualizarStaff,
  cambiarPasswordStaff,
  cambiarEstadoStaff,
  cambiarRolStaff,
  eliminarStaff,
} from "../../services/usuarios/admin_staff_service.js";

// 📋 listar
export async function listarRolesStaffController(_req, res) {
  try {
    return res.json({ ok: true, data: await listarRolesAsignables() });
  } catch (e) {
    console.error("listarRolesStaffController:", e);
    return res.status(500).json({ ok: false, mensaje: "No se pudieron listar los roles" });
  }
}

export async function listarStaffController(_req, res) {
  try {
    const data = await listarStaff();
    return res.json({ ok: true, data });
  } catch (e) {
    console.error("listarStaffController:", e);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_STAFF",
      mensaje: "No se pudo listar el staff",
    });
  }
}

// ➕ crear
export async function crearStaffController(req, res) {
  try {
    const { email, password, nombre, apellido, documento, rol_codigo } = req.body ?? {};
    const solicitanteEsSuperAdmin = (req.user?.roles ?? []).includes("super_admin");

    const result = await crearStaff({
      email,
      password,
      nombre,
      apellido,
      documento,
      rol_codigo,
      solicitanteEsSuperAdmin,
    });

    if (!result.ok) {
      return res.status(result.codigo === "SIN_PERMISO" ? 403 : 400).json(result);
    }

    return res.status(201).json(result);
  } catch (e) {
    console.error("crearStaffController:", e);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_CREAR_STAFF",
      mensaje: "No se pudo crear el staff",
    });
  }
}

// ✏️ actualizar datos
export async function actualizarStaffController(req, res) {
  try {
    const { usuarioId } = req.params;
    const { nombre, apellido, email, documento } = req.body ?? {};

    const result = await actualizarStaff(usuarioId, {
      nombre,
      apellido,
      email,
      documento,
    });

    if (!result.ok) {
      return res.status(
        result.codigo === "NO_ENCONTRADO" ? 404 : 400
      ).json(result);
    }

    return res.json(result);
  } catch (e) {
    console.error("actualizarStaffController:", e);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ACTUALIZAR_STAFF",
      mensaje: "No se pudo actualizar el staff",
    });
  }
}

// 🔑 cambiar contraseña
export async function cambiarPasswordStaffController(req, res) {
  try {
    const { usuarioId } = req.params;
    const { password } = req.body ?? {};
    const solicitanteEsSuperAdmin = (req.user?.roles ?? []).includes("super_admin");

    const result = await cambiarPasswordStaff(usuarioId, password, solicitanteEsSuperAdmin);

    if (!result.ok) {
      const status = result.codigo === "NO_ENCONTRADO" ? 404
        : result.codigo === "SIN_PERMISO" ? 403
        : 400;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (e) {
    console.error("cambiarPasswordStaffController:", e);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_PASSWORD_STAFF",
      mensaje: "No se pudo cambiar la contraseña",
    });
  }
}

// 🔄 activar / desactivar
export async function cambiarEstadoStaffController(req, res) {
  try {
    const { usuarioId } = req.params;
    const { activo } = req.body ?? {};
    const solicitanteEsSuperAdmin = (req.user?.roles ?? []).includes("super_admin");

    if (typeof activo !== "boolean") {
      return res.status(400).json({
        ok: false,
        codigo: "ESTADO_INVALIDO",
        mensaje: "El campo activo debe ser booleano",
      });
    }

    const result = await cambiarEstadoStaff(usuarioId, activo, solicitanteEsSuperAdmin);

    if (!result.ok) {
      const status = result.codigo === "NO_ENCONTRADO" ? 404
        : result.codigo === "SIN_PERMISO" ? 403
        : 400;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (e) {
    console.error("cambiarEstadoStaffController:", e);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ESTADO_STAFF",
      mensaje: "No se pudo cambiar el estado",
    });
  }
}

// 🎭 cambiar rol
export async function cambiarRolStaffController(req, res) {
  try {
    const { usuarioRolId } = req.params;
    const { rol_codigo } = req.body ?? {};
    const solicitanteEsSuperAdmin = (req.user?.roles ?? []).includes("super_admin");

    const result = await cambiarRolStaff(usuarioRolId, rol_codigo, solicitanteEsSuperAdmin);

    if (!result.ok) {
      const status = result.codigo === "NO_ENCONTRADO" ? 404
        : result.codigo === "SIN_PERMISO" ? 403
        : 400;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (e) {
    console.error("cambiarRolStaffController:", e);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ROL_STAFF",
      mensaje: "No se pudo cambiar el rol",
    });
  }
}

// 🗑️ eliminar
export async function eliminarStaffController(req, res) {
  try {
    const { usuarioId } = req.params;
    const solicitanteEsSuperAdmin = (req.user?.roles ?? []).includes("super_admin");

    const result = await eliminarStaff(usuarioId, solicitanteEsSuperAdmin, req.user?.usuario_id);

    if (!result.ok) {
      const status = result.codigo === "NO_ENCONTRADO" ? 404
        : result.codigo === "SIN_PERMISO" ? 403
        : 400;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (e) {
    console.error("eliminarStaffController:", e);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ELIMINAR_STAFF",
      mensaje: "No se pudo eliminar el usuario",
    });
  }
}