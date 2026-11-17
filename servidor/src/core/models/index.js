/**
 * models/index.js
 *
 * Registro central de modelos y asociaciones para el schema v3.
 * Importar SOLO desde aquí — nunca importar modelos individuales directamente.
 *
 * Uso en server.js:
 *   import "./models/index.js";  // efectos colaterales: registra asociaciones
 */

import { aplicarRelaciones } from "./common/relaciones.js";

// ── persona/ — identidad base y sus catálogos ────────────────────────────────
import { Persona }         from "./persona/persona.js";
import { Sexo }            from "./persona/sexo.js";
import { TipoDocumento }   from "./persona/tipo_documento.js";
import { TipoPersona }     from "./persona/tipo_persona.js";
import { PersonaFiscal }   from "./persona/persona_fiscal.js";

// ── usuarios/ — login y RBAC ──────────────────────────────────────────────────
import { Usuario }         from "./usuario/usuario.js";
import { UsuarioRol }      from "./usuario/usuario_rol.js";
import { Rol }             from "./usuario/rol.js";
import { RolPermiso }      from "./usuario/rol_permiso.js";
import { Permiso }         from "./usuario/permiso.js";
import { Modulo }          from "./usuario/modulo.js";

// ── sistema/ — banners de la tienda ──────────────────────────────────────────
import { BannerPromocion }  from "./sistema/banner_promocion.js";

// Cada entrada es una asociación explícita y unidireccional — igual que antes,
// solo que ahora es un array de datos en vez de llamadas sueltas. aplicarRelaciones
// valida cada una (modelo importado, alias no duplicado, belongsToMany con
// "through") y, si algo quedó mal, tira un error que señala exactamente qué
// entrada falló y por qué.
aplicarRelaciones([
  // ─── Persona ↔ Catálogos ────────────────────────────────────────────────
  { tipo: "belongsTo", from: Persona, to: TipoDocumento, foreignKey: "tipo_documento_id", as: "tipo_documento" },
  { tipo: "belongsTo", from: Persona, to: Sexo,          foreignKey: "sexo_id",           as: "sexo" },
  { tipo: "belongsTo", from: Persona, to: TipoPersona,   foreignKey: "tipo_persona_id",   as: "tipo_persona" },

  // ─── Persona ↔ PersonaFiscal (1:1, opcional) ────────────────────────────
  { tipo: "hasOne",    from: Persona,       to: PersonaFiscal, foreignKey: "persona_id", as: "fiscal" },
  { tipo: "belongsTo", from: PersonaFiscal, to: Persona,       foreignKey: "persona_id", as: "persona" },

  // ─── Persona ↔ Usuario (1:1) ────────────────────────────────────────────
  { tipo: "hasOne",    from: Persona, to: Usuario, foreignKey: "persona_id", as: "usuario" },
  { tipo: "belongsTo", from: Usuario, to: Persona, foreignKey: "persona_id", as: "persona" },

  // ─── Usuario ↔ Rol (N:N) ────────────────────────────────────────────────
  { tipo: "belongsToMany", from: Usuario, to: Rol,     through: UsuarioRol, foreignKey: "usuario_id", otherKey: "rol_id",     as: "roles" },
  { tipo: "belongsToMany", from: Rol,     to: Usuario, through: UsuarioRol, foreignKey: "rol_id",     otherKey: "usuario_id", as: "usuarios" },

  // ─── UsuarioRol → Usuario / Rol (acceso directo al puente, ej. listarStaff) ──
  { tipo: "belongsTo", from: UsuarioRol, to: Usuario, foreignKey: "usuario_id", as: "usuario" },
  { tipo: "belongsTo", from: UsuarioRol, to: Rol,     foreignKey: "rol_id",     as: "rol" },

  // ─── Módulo ↔ Permiso (1:N) ─────────────────────────────────────────────
  { tipo: "hasMany",   from: Modulo,  to: Permiso, foreignKey: "modulo_id", as: "permisos" },
  { tipo: "belongsTo", from: Permiso, to: Modulo,  foreignKey: "modulo_id", as: "modulo" },

  // ─── Rol ↔ Permiso (N:N vía RolPermiso) ─────────────────────────────────
  { tipo: "belongsToMany", from: Rol,     to: Permiso, through: RolPermiso, foreignKey: "rol_id",     otherKey: "permiso_id", as: "permisos" },
  { tipo: "belongsToMany", from: Permiso, to: Rol,     through: RolPermiso, foreignKey: "permiso_id", otherKey: "rol_id",     as: "roles" },
]);

export {
  Sexo,
  TipoDocumento,
  TipoPersona,
  Rol,
  Modulo,
  Permiso,
  RolPermiso,
  Persona,
  PersonaFiscal,
  Usuario,
  UsuarioRol,
  BannerPromocion,
};
