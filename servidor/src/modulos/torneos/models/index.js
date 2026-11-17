/**
 * Modelos y asociaciones del rubro torneos. Re-exporta los del core para que el rubro importe
 * todo desde acá; el core no conoce estos modelos.
 */
import { aplicarRelaciones } from "../../../core/models/common/relaciones.js";
import {
  Sexo, TipoDocumento, TipoPersona, Rol, Modulo, Permiso, RolPermiso,
  Persona, PersonaFiscal, Usuario, UsuarioRol, BannerPromocion,
} from "../../../core/models/index.js";
import { generarCodigoJugador } from "../services/common/codigo_jugador.js";
import { Jugador } from "./jugador.js";
import { AvisoUsuario } from "./usuario/aviso_usuario.js";

// ── home/ — portada de MiPadel, editable desde el panel (imágenes/videos en Cloudinary) ──
import { HomeArea } from "./home/home_area.js";
import { HomeContenido } from "./home/home_contenido.js";
import { HomeTexto } from "./home/home_texto.js";
import { HomePilar } from "./home/home_pilar.js";
import { HomeContacto } from "./home/home_contacto.js";

// ── suscripcion/ — plan mensual de cada organizador y sus pagos ─────────────
import { Suscripcion } from "./suscripcion/suscripcion.js";
import { PagoSuscripcion } from "./suscripcion/pago_suscripcion.js";

// ── torneos/ — torneos de cada organizador, sus categorías y premios ─────────
import { Torneo } from "./torneos/torneo.js";
import { TorneoCategoria } from "./torneos/torneo_categoria.js";
import { TorneoPremio } from "./torneos/torneo_premio.js";
import { Inscripcion } from "./torneos/inscripcion.js";
import { Zona } from "./torneos/zona.js";
import { Partido } from "./torneos/partido.js";

aplicarRelaciones([
  // ─── Usuario ↔ Jugador (1:1) ────────────────────────────────────────────
  { tipo: "hasOne",    from: Usuario, to: Jugador, foreignKey: "usuario_id", as: "jugador" },
  { tipo: "belongsTo", from: Jugador, to: Usuario, foreignKey: "usuario_id", as: "usuario" },

  // ─── HomeArea ↔ HomeContenido (1:N) ──────────────────────────────────────
  { tipo: "hasMany",   from: HomeArea,      to: HomeContenido, foreignKey: "area_id", as: "contenidos" },
  { tipo: "belongsTo", from: HomeContenido, to: HomeArea,      foreignKey: "area_id", as: "area" },

  // ─── Usuario ↔ Suscripcion (1:1) y sus pagos (1:N) ───────────────────────
  { tipo: "hasOne",    from: Usuario,         to: Suscripcion,     foreignKey: "usuario_id", as: "suscripcion" },
  { tipo: "belongsTo", from: Suscripcion,     to: Usuario,         foreignKey: "usuario_id", as: "usuario" },
  { tipo: "hasMany",   from: Usuario,         to: PagoSuscripcion, foreignKey: "usuario_id", as: "pagos_suscripcion" },
  { tipo: "belongsTo", from: PagoSuscripcion, to: Usuario,         foreignKey: "registrado_por", as: "registrado_por_usuario" },

  // ─── Torneo → categorías → premios ──────────────────────────────────────
  { tipo: "belongsTo", from: Torneo,          to: Usuario,         foreignKey: "organizador_id", as: "organizador" },
  { tipo: "hasMany",   from: Torneo,          to: TorneoCategoria, foreignKey: "torneo_id", as: "categorias" },
  { tipo: "belongsTo", from: TorneoCategoria, to: Torneo,          foreignKey: "torneo_id", as: "torneo" },
  { tipo: "hasMany",   from: TorneoCategoria, to: TorneoPremio,    foreignKey: "categoria_id", as: "premios" },

  // ─── Inscripciones, zonas y partidos de una categoría ────────────────────
  { tipo: "belongsTo", from: Inscripcion, to: Torneo,          foreignKey: "torneo_id", as: "torneo" },
  { tipo: "belongsTo", from: Inscripcion, to: TorneoCategoria, foreignKey: "categoria_id", as: "categoria" },
  { tipo: "hasMany",   from: Zona,        to: Inscripcion,     foreignKey: "zona_id", as: "parejas" },
  { tipo: "hasMany",   from: Zona,        to: Partido,         foreignKey: "zona_id", as: "partidos" },
]);

// Toda cuenta nueva nace con su jugador (y su código), en la misma transacción: si algo falla,
// no queda una cuenta sin código. Las de antes las completa el arranque del rubro.
Usuario.addHook("afterCreate", "torneos_jugador", async (usuario, { transaction }) => {
  await Jugador.create({ usuario_id: usuario.id, codigo: generarCodigoJugador() }, { transaction });
});

export {
  Sexo, TipoDocumento, TipoPersona,
  Rol, Modulo, Permiso, RolPermiso,
  Persona, PersonaFiscal, Usuario, UsuarioRol, BannerPromocion,
  Jugador, AvisoUsuario,
  HomeArea, HomeContenido, HomeTexto, HomePilar, HomeContacto,
  Suscripcion, PagoSuscripcion,
  Torneo, TorneoCategoria, TorneoPremio, Inscripcion, Zona, Partido,
};
