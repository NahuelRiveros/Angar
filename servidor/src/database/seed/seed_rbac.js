import { Rol, Modulo } from "../../models/index.js";

export async function seed_rbac() {
  const roles = [
    { codigo: "super_admin", descripcion: "Super administrador de la plataforma" },
    { codigo: "admin",       descripcion: "Administrador de la plataforma" },
    // Equipo de la plataforma (atención a organizadores). Sus permisos se editan en el panel.
    { codigo: "soporte",     descripcion: "Soporte" },
    // Paga la suscripción y gestiona sus propios torneos.
    { codigo: "organizador", descripcion: "Organizador de torneos" },
    // Rol que se asigna al auto-registrarse (POST /auth/register).
    { codigo: "jugador",     descripcion: "Jugador" },
  ];
  for (const rol of roles) {
    await Rol.findOrCreate({ where: { codigo: rol.codigo }, defaults: rol });
  }

  // Secciones del panel de gestión de roles — reflejan las áreas reales de la app (routes/)
  const modulos = [
    { codigo: "usuarios",     descripcion: "Usuarios y equipo",              orden: 2 },
    { codigo: "home",         descripcion: "Contenido del home",             orden: 9 },
    { codigo: "suscripcion",  descripcion: "Suscripciones",                  orden: 10 },
  ];
  for (const modulo of modulos) {
    await Modulo.findOrCreate({ where: { codigo: modulo.codigo }, defaults: modulo });
  }
}
