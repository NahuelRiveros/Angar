import { Router } from "express";
import {
  listarStaffController,
  crearStaffController,
  actualizarStaffController,
  cambiarPasswordStaffController,
  cambiarEstadoStaffController,
  cambiarRolStaffController,
  listarRolesStaffController,
  eliminarStaffController,
} from "../../controllers/usuarios/admin_staff_controller.js";

import { requireAuth, requirePermiso } from "../../middleware/auth_middleware.js";

export const staffRouter = Router();

staffRouter.use(requireAuth, requirePermiso("usuarios.gestionar"));

// 📋 listar usuarios (staff/admin)
staffRouter.get("/", listarStaffController);

// roles que se pueden asignar (incluye los creados en el panel de permisos)
staffRouter.get("/roles", listarRolesStaffController);

// ➕ crear staff
staffRouter.post("/", crearStaffController);

// ✏️ editar datos (nombre, apellido, email, documento)
staffRouter.put("/:usuarioId", actualizarStaffController);

// 🔑 cambiar contraseña
staffRouter.patch("/:usuarioId/password", cambiarPasswordStaffController);

// 🔄 activar / desactivar usuario
staffRouter.patch("/:usuarioId/estado", cambiarEstadoStaffController);

// 🎭 cambiar rol (por usuario_rol_id, la fila específica de la relación)
staffRouter.patch("/rol/:usuarioRolId", cambiarRolStaffController);

// 🗑️ eliminar (baja definitiva, soft-delete)
staffRouter.delete("/:usuarioId", eliminarStaffController);