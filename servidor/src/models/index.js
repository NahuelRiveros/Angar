/**
 * models/index.js
 *
 * Registro central de modelos y asociaciones para el schema v3.
 * Importar SOLO desde aquí — nunca importar modelos individuales directamente.
 *
 * Uso en server.js:
 *   import "../models/index.js";  // efectos colaterales: registra asociaciones
 */

import { aplicarRelaciones } from "./common/relaciones.js";

// ── persona/ — identidad base y sus catálogos ────────────────────────────────
import { Persona }         from "./persona/persona.js";
import { Sexo }            from "./persona/sexo.js";
import { TipoDocumento }   from "./persona/tipo_documento.js";
import { TipoPersona }     from "./persona/tipo_persona.js";

// ── usuarios/ — login y RBAC ──────────────────────────────────────────────────
import { Usuario }         from "./usuario/usuario.js";
import { UsuarioRol }      from "./usuario/usuario_rol.js";
import { Rol }             from "./usuario/rol.js";
import { RolPermiso }      from "./usuario/rol_permiso.js";
import { Permiso }         from "./usuario/permiso.js";
import { Modulo }          from "./usuario/modulo.js";

// ── home/ — contenido configurable del home (imágenes/videos en Cloudinary) ──
import { HomeArea }         from "./home/home_area.js";
import { HomeContenido }    from "./home/home_contenido.js";
import { HomeTexto }        from "./home/home_texto.js";
import { HomePilar }        from "./home/home_pilar.js";
import { HomeContacto }     from "./home/home_contacto.js";

// ── sistema/ — cinta de anuncios ───────────
import { BannerAnuncio }    from "./sistema/banner_anuncio.js";

// ── suscripcion/ — plan mensual de cada organizador y sus pagos ─────────────
import { Suscripcion }      from "./suscripcion/suscripcion.js";
import { PagoSuscripcion }  from "./suscripcion/pago_suscripcion.js";

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

  // ─── HomeArea ↔ HomeContenido (1:N) ──────────────────────────────────────
  { tipo: "hasMany",   from: HomeArea,      to: HomeContenido, foreignKey: "area_id", as: "contenidos" },
  { tipo: "belongsTo", from: HomeContenido, to: HomeArea,      foreignKey: "area_id", as: "area" },

  // ─── Usuario ↔ Suscripcion (1:1) y sus pagos (1:N) ───────────────────────
  { tipo: "hasOne",    from: Usuario,         to: Suscripcion,     foreignKey: "usuario_id", as: "suscripcion" },
  { tipo: "belongsTo", from: Suscripcion,     to: Usuario,         foreignKey: "usuario_id", as: "usuario" },
  { tipo: "hasMany",   from: Usuario,         to: PagoSuscripcion, foreignKey: "usuario_id", as: "pagos_suscripcion" },
  { tipo: "belongsTo", from: PagoSuscripcion, to: Usuario,         foreignKey: "registrado_por", as: "registrado_por_usuario" },
]);

export {
  Sexo, TipoDocumento, TipoPersona,
  Rol, Modulo, Permiso, RolPermiso,
  Persona, Usuario, UsuarioRol,
  HomeArea, HomeContenido, HomeTexto, HomePilar, HomeContacto,
  BannerAnuncio,
  Suscripcion, PagoSuscripcion,
};
