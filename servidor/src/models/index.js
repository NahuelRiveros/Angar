/**
 * models/index.js
 *
 * Registro central de modelos y asociaciones para el schema v3.
 * Importar SOLO desde aquí — nunca importar modelos individuales directamente.
 *
 * Uso en server.js:
 *   import "../models/index.js";  // efectos colaterales: registra asociaciones
 */

import { ImportacionCatalogo, ImportacionCatalogoLote } from "./distribuidora/importacion_catalogo.js";
import { NotaPedidoEstadoLog } from "./distribuidora/nota_pedido_estado_log.js";
import { OperacionCarrito } from "./distribuidora/operacion_carrito.js";
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

// ── alumnos/ — membresías de gimnasio ────────────────────────────────────────
import { Alumno }          from "./alumno/alumno.js";
import { AlumnoEstado }    from "./alumno/alumno_estado.js";
import { AlumnoEstadoLog } from "./alumno/alumno_estado_log.js";
import { Membresia }       from "./alumno/membresia.js";
import { Ingreso }         from "./alumno/ingreso.js";
import { PlanTipo }        from "./alumno/plan_tipo.js";

// ── kinesiologia/ — pacientes y patologías ───────────────────────────────────
import { PacienteKinesiologia } from "./kinesiologia/paciente_kinesiologia.js";
import { Patologia }        from "./kinesiologia/patologia.js";
import { PacientePatologia } from "./kinesiologia/paciente_patologia.js";
import { FichaKinesiologica } from "./kinesiologia/ficha_kinesiologica.js";
import { SesionKinesiologia } from "./kinesiologia/sesion_kinesiologia.js";
import { RecordatorioKinesiologia } from "./kinesiologia/recordatorio_kinesiologia.js";

// ── seguimiento/ — asignación profesional y avances de ejercicio ────────────
import { AsignacionProfesional } from "./seguimiento/asignacion_profesional.js";
import { Ejercicio }        from "./seguimiento/ejercicio.js";
import { TipoEjercicio }    from "./seguimiento/tipo_ejercicio.js";
import { GrupoMuscular }    from "./seguimiento/grupo_muscular.js";
import { RegistroEjercicio } from "./seguimiento/registro_ejercicio.js";

// ── kiosco/ — productos y stock ───────────────────────────────────────────────
import { Producto }         from "./kiosco/producto.js";
import { CategoriaProducto } from "./kiosco/categoria_producto.js";
import { MovimientoStock }  from "./kiosco/movimiento_stock.js";

// ── home/ — contenido configurable del home (imágenes/videos en Cloudinary) ──
import { HomeArea }         from "./home/home_area.js";
import { HomeContenido }    from "./home/home_contenido.js";
import { HomeTexto }        from "./home/home_texto.js";
import { HomePilar }        from "./home/home_pilar.js";
import { HomeContacto }     from "./home/home_contacto.js";

// ── sistema/ — licenciamiento por módulo de negocio (gym / kinesiología) ────
import { ModuloNegocio }    from "./sistema/modulo_negocio.js";
import { BannerAnuncio }    from "./sistema/banner_anuncio.js";

// ── productos/ — catálogo de la tienda online (módulo eccomerce_indumentaria) ─
// "ProductoTienda" (tabla producto_tienda), no "Producto" — ya existe ese
// nombre para el kiosco del gym (models/kiosco/producto.js), dominio distinto.
import { Categoria }        from "./productos/categoria.js";
import { Marca }             from "./productos/marca.js";
import { Talle }             from "./productos/talle.js";
import { Color }             from "./productos/color.js";
import { ProductoTienda }    from "./productos/producto.js";
import { Stock }             from "./productos/stock.js";
import { EnvioOpcion }       from "./productos/envio_opcion.js";
import { CondicionIva }      from "./productos/condicion_iva.js";

// ── carrito/ — carrito de compras (módulo eccomerce_indumentaria) ────────────
import { Carrito }           from "./carrito/carrito.js";
import { CarritoItem }       from "./carrito/carrito_item.js";

// ── distribuidora/ — catálogo tipo supermercado + nota de pedido (módulo
// eccomerce_distribuidora). Tablas propias, sin relación con productos/ ni
// carrito/ (indumentaria) — dos verticales de e-commerce separadas a propósito.
import { CategoriaDistribuidora }   from "./distribuidora/categoria_distribuidora.js";
import { ProductoDistribuidora }    from "./distribuidora/producto_distribuidora.js";
import { MarcaDistribuidora, MarcaCategoriaDistribuidora } from "./distribuidora/marca_distribuidora.js";
import { ListaPrecio, ListaPrecioLocalidad, ListaPrecioItem } from "./distribuidora/lista_precio.js";
import { VariedadDistribuidora }    from "./distribuidora/variedad_distribuidora.js";
import { CarritoDistribuidora }     from "./distribuidora/carrito_distribuidora.js";
import { CarritoDistribuidoraItem } from "./distribuidora/carrito_distribuidora_item.js";
import { NotaPedido }               from "./distribuidora/nota_pedido.js";
import { NotaPedidoItem }           from "./distribuidora/nota_pedido_item.js";
import { NotaPedidoPago }           from "./distribuidora/nota_pedido_pago.js";
import { PerfilClienteDistribuidora } from "./distribuidora/perfil_cliente_distribuidora.js";

// Cada entrada es una asociación explícita y unidireccional — igual que antes,
// solo que ahora es un array de datos en vez de llamadas sueltas. aplicarRelaciones
// valida cada una (modelo importado, alias no duplicado, belongsToMany con
// "through") y, si algo quedó mal, tira un error que señala exactamente qué
// entrada falló y por qué.
aplicarRelaciones([
  { tipo: "hasMany", from: NotaPedido, to: NotaPedidoEstadoLog, foreignKey: "nota_pedido_id", as: "historial_estados" },
  { tipo: "belongsTo", from: NotaPedidoEstadoLog, to: Usuario, foreignKey: "usuario_id", as: "autor" },
  // ─── Persona ↔ Catálogos ────────────────────────────────────────────────
  { tipo: "belongsTo", from: Persona, to: TipoDocumento, foreignKey: "tipo_documento_id", as: "tipo_documento" },
  { tipo: "belongsTo", from: Persona, to: Sexo,          foreignKey: "sexo_id",           as: "sexo" },
  { tipo: "belongsTo", from: Persona, to: TipoPersona,   foreignKey: "tipo_persona_id",   as: "tipo_persona" },

  // ─── Persona ↔ Alumno (1:1) ─────────────────────────────────────────────
  { tipo: "hasOne",    from: Persona, to: Alumno,  foreignKey: "persona_id", as: "alumno" },
  { tipo: "belongsTo", from: Alumno,  to: Persona, foreignKey: "persona_id", as: "persona" },

  // ─── Alumno ↔ Estado ────────────────────────────────────────────────────
  { tipo: "belongsTo", from: Alumno,       to: AlumnoEstado, foreignKey: "estado_id", as: "estado" },
  { tipo: "hasMany",   from: AlumnoEstado, to: Alumno,       foreignKey: "estado_id" },

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

  // ─── Alumno ↔ Membresia (1:N) ───────────────────────────────────────────
  { tipo: "hasMany",   from: Alumno,    to: Membresia, foreignKey: "alumno_id", as: "membresias" },
  { tipo: "belongsTo", from: Membresia, to: Alumno,    foreignKey: "alumno_id", as: "alumno" },

  // ─── Membresia ↔ PlanTipo ───────────────────────────────────────────────
  { tipo: "belongsTo", from: Membresia, to: PlanTipo,  foreignKey: "plan_tipo_id", as: "plan_tipo" },
  { tipo: "hasMany",   from: PlanTipo,  to: Membresia, foreignKey: "plan_tipo_id" },

  // ─── Membresia ↔ Usuario (cobrado_por) ──────────────────────────────────
  { tipo: "belongsTo", from: Membresia, to: Usuario, foreignKey: "cobrado_por_id", as: "cobrado_por" },

  // ─── Membresia ↔ Ingreso (1:N) ──────────────────────────────────────────
  { tipo: "hasMany",   from: Membresia, to: Ingreso,   foreignKey: "membresia_id", as: "ingresos" },
  { tipo: "belongsTo", from: Ingreso,   to: Membresia, foreignKey: "membresia_id", as: "membresia" },

  // ─── AlumnoEstadoLog ─────────────────────────────────────────────────────
  { tipo: "belongsTo", from: AlumnoEstadoLog, to: Alumno,       foreignKey: "alumno_id",          as: "alumno" },
  { tipo: "belongsTo", from: AlumnoEstadoLog, to: AlumnoEstado, foreignKey: "estado_anterior_id", as: "estado_anterior" },
  { tipo: "belongsTo", from: AlumnoEstadoLog, to: AlumnoEstado, foreignKey: "estado_nuevo_id",    as: "estado_nuevo" },
  { tipo: "belongsTo", from: AlumnoEstadoLog, to: Usuario,      foreignKey: "modificado_por",     as: "modificado_por_usuario" },
  { tipo: "hasMany",   from: Alumno,          to: AlumnoEstadoLog, foreignKey: "alumno_id",       as: "estado_logs" },

  // ─── Producto ↔ MovimientoStock (1:N) ───────────────────────────────────
  { tipo: "hasMany",   from: Producto,        to: MovimientoStock, foreignKey: "producto_id", as: "movimientos" },
  { tipo: "belongsTo", from: MovimientoStock, to: Producto,        foreignKey: "producto_id", as: "producto" },
  { tipo: "belongsTo", from: MovimientoStock, to: Usuario,         foreignKey: "registrado_por_id", as: "registrado_por" },

  // ─── Producto ↔ CategoriaProducto (N:1) ─────────────────────────────────
  { tipo: "hasMany",   from: CategoriaProducto, to: Producto,          foreignKey: "categoria_id", as: "productos" },
  { tipo: "belongsTo", from: Producto,          to: CategoriaProducto, foreignKey: "categoria_id", as: "categoria" },

  // ─── Persona ↔ PacienteKinesiologia (1:1) ───────────────────────────────
  { tipo: "hasOne",    from: Persona,               to: PacienteKinesiologia, foreignKey: "persona_id", as: "paciente_kinesiologia" },
  { tipo: "belongsTo", from: PacienteKinesiologia,  to: Persona,              foreignKey: "persona_id", as: "persona" },

  // ─── Persona ↔ AsignacionProfesional (1:N) ──────────────────────────────
  { tipo: "hasMany",   from: Persona,               to: AsignacionProfesional, foreignKey: "persona_id", as: "asignaciones_profesionales" },
  { tipo: "belongsTo", from: AsignacionProfesional, to: Persona,               foreignKey: "persona_id", as: "persona" },

  // ─── Usuario (profesor) ↔ AsignacionProfesional (1:N) ───────────────────
  { tipo: "hasMany",   from: Usuario,               to: AsignacionProfesional, foreignKey: "profesor_id", as: "asignaciones_como_profesor" },
  { tipo: "belongsTo", from: AsignacionProfesional, to: Usuario,               foreignKey: "profesor_id", as: "profesor" },

  // ─── Ejercicio ↔ Catálogos ───────────────────────────────────────────────
  { tipo: "hasMany",   from: TipoEjercicio,  to: Ejercicio,     foreignKey: "tipo_ejercicio_id", as: "ejercicios" },
  { tipo: "belongsTo", from: Ejercicio,      to: TipoEjercicio, foreignKey: "tipo_ejercicio_id", as: "tipo_ejercicio" },
  { tipo: "hasMany",   from: GrupoMuscular,  to: Ejercicio,     foreignKey: "grupo_muscular_id", as: "ejercicios" },
  { tipo: "belongsTo", from: Ejercicio,      to: GrupoMuscular, foreignKey: "grupo_muscular_id", as: "grupo_muscular" },

  // ─── Persona ↔ RegistroEjercicio (1:N) ──────────────────────────────────
  { tipo: "hasMany",   from: Persona,           to: RegistroEjercicio, foreignKey: "persona_id", as: "registros_ejercicio" },
  { tipo: "belongsTo", from: RegistroEjercicio, to: Persona,           foreignKey: "persona_id", as: "persona" },

  // ─── Ejercicio ↔ RegistroEjercicio (1:N) ────────────────────────────────
  { tipo: "hasMany",   from: Ejercicio,         to: RegistroEjercicio, foreignKey: "ejercicio_id", as: "registros" },
  { tipo: "belongsTo", from: RegistroEjercicio, to: Ejercicio,         foreignKey: "ejercicio_id", as: "ejercicio" },

  // ─── Usuario ↔ RegistroEjercicio (quién lo cargó) ───────────────────────
  { tipo: "hasMany",   from: Usuario,           to: RegistroEjercicio, foreignKey: "registrado_por_id", as: "registros_ejercicio_cargados" },
  { tipo: "belongsTo", from: RegistroEjercicio, to: Usuario,           foreignKey: "registrado_por_id", as: "registrado_por" },

  // ─── PacientePatologia → PacienteKinesiologia / Patologia (acceso directo al puente) ──
  { tipo: "belongsTo", from: PacientePatologia, to: PacienteKinesiologia, foreignKey: "paciente_kinesiologia_id", as: "paciente_kinesiologia" },
  { tipo: "belongsTo", from: PacientePatologia, to: Patologia,            foreignKey: "patologia_id",             as: "patologia" },

  // ─── PacienteKinesiologia ↔ Patologia (N:N vía PacientePatologia) ───────
  { tipo: "belongsToMany", from: PacienteKinesiologia, to: Patologia,            through: PacientePatologia, foreignKey: "paciente_kinesiologia_id", otherKey: "patologia_id",             as: "patologias" },
  { tipo: "belongsToMany", from: Patologia,            to: PacienteKinesiologia, through: PacientePatologia, foreignKey: "patologia_id",             otherKey: "paciente_kinesiologia_id", as: "pacientes" },

  // ─── HomeArea ↔ HomeContenido (1:N) ──────────────────────────────────────
  { tipo: "hasMany",   from: HomeArea,      to: HomeContenido, foreignKey: "area_id", as: "contenidos" },
  { tipo: "belongsTo", from: HomeContenido, to: HomeArea,      foreignKey: "area_id", as: "area" },

  // ─── PacientePatologia ↔ FichaKinesiologica (1:1) ───────────────────────
  { tipo: "hasOne",    from: PacientePatologia,  to: FichaKinesiologica,  foreignKey: "paciente_patologia_id", as: "ficha" },
  { tipo: "belongsTo", from: FichaKinesiologica, to: PacientePatologia,   foreignKey: "paciente_patologia_id", as: "paciente_patologia" },
  { tipo: "belongsTo", from: FichaKinesiologica, to: Usuario,             foreignKey: "creado_por_id",         as: "creado_por" },

  // ─── FichaKinesiologica ↔ SesionKinesiologia ↔ RecordatorioKinesiologia (1:N:N) ──
  { tipo: "hasMany",   from: FichaKinesiologica,       to: SesionKinesiologia,        foreignKey: "ficha_id",          as: "sesiones" },
  { tipo: "belongsTo", from: SesionKinesiologia,       to: FichaKinesiologica,        foreignKey: "ficha_id",          as: "ficha" },
  { tipo: "belongsTo", from: SesionKinesiologia,       to: Usuario,                   foreignKey: "registrado_por_id", as: "registrado_por" },
  { tipo: "hasMany",   from: SesionKinesiologia,       to: RecordatorioKinesiologia,  foreignKey: "sesion_id",         as: "recordatorios" },
  { tipo: "belongsTo", from: RecordatorioKinesiologia, to: SesionKinesiologia,        foreignKey: "sesion_id",         as: "sesion" },

  // ─── Categoria ↔ Categoria (jerárquica, padre/subcategorías) ────────────
  { tipo: "belongsTo", from: Categoria, to: Categoria, foreignKey: "padre_id", as: "padre" },
  { tipo: "hasMany",   from: Categoria, to: Categoria, foreignKey: "padre_id", as: "subcategorias" },

  // ─── ProductoTienda ↔ Categoria / Marca ──────────────────────────────────
  { tipo: "belongsTo", from: ProductoTienda, to: Categoria, foreignKey: "categoria_id", as: "categoria" },
  { tipo: "hasMany",   from: Categoria,      to: ProductoTienda, foreignKey: "categoria_id", as: "productos" },
  { tipo: "belongsTo", from: ProductoTienda, to: Marca,     foreignKey: "marca_id",     as: "marca" },
  { tipo: "hasMany",   from: Marca,          to: ProductoTienda, foreignKey: "marca_id", as: "productos" },

  // ─── Stock ↔ ProductoTienda / Talle / Color (una fila = una variante) ───
  { tipo: "belongsTo", from: Stock,          to: ProductoTienda, foreignKey: "producto_id", as: "producto" },
  { tipo: "hasMany",   from: ProductoTienda, to: Stock,          foreignKey: "producto_id", as: "variantes" },
  { tipo: "belongsTo", from: Stock, to: Talle, foreignKey: "talle_id", as: "talle" },
  { tipo: "belongsTo", from: Stock, to: Color, foreignKey: "color_id", as: "color" },

  // ─── Carrito ↔ Usuario (1:1) ─────────────────────────────────────────────
  { tipo: "belongsTo", from: Carrito, to: Usuario, foreignKey: "usuario_id", as: "usuario" },
  { tipo: "hasOne",    from: Usuario, to: Carrito, foreignKey: "usuario_id", as: "carrito" },

  // ─── CarritoItem ↔ Carrito / ProductoTienda / Stock ─────────────────────
  { tipo: "belongsTo", from: CarritoItem, to: Carrito,       foreignKey: "carrito_id",  as: "carrito" },
  { tipo: "hasMany",   from: Carrito,     to: CarritoItem,   foreignKey: "carrito_id",  as: "items" },
  { tipo: "belongsTo", from: CarritoItem, to: ProductoTienda, foreignKey: "producto_id", as: "producto" },
  { tipo: "belongsTo", from: CarritoItem, to: Stock,          foreignKey: "stock_id",    as: "variante" },

  // ─── CategoriaDistribuidora ↔ CategoriaDistribuidora (jerárquica) ───────
  { tipo: "belongsTo", from: CategoriaDistribuidora, to: CategoriaDistribuidora, foreignKey: "padre_id", as: "padre" },
  { tipo: "hasMany",   from: CategoriaDistribuidora, to: CategoriaDistribuidora, foreignKey: "padre_id", as: "subcategorias" },

  // ─── ProductoDistribuidora ↔ CategoriaDistribuidora ─────────────────────
  { tipo: "belongsTo", from: ProductoDistribuidora,  to: CategoriaDistribuidora, foreignKey: "categoria_id", as: "categoria" },
  { tipo: "hasMany",   from: CategoriaDistribuidora, to: ProductoDistribuidora,  foreignKey: "categoria_id", as: "productos" },

  // ─── MarcaDistribuidora ↔ ProductoDistribuidora / categorías donde se ofrece ──
  { tipo: "belongsTo", from: ProductoDistribuidora, to: MarcaDistribuidora, foreignKey: "marca_id", as: "marca_ref" },
  { tipo: "hasMany",   from: MarcaDistribuidora, to: ProductoDistribuidora, foreignKey: "marca_id", as: "productos" },
  { tipo: "hasMany",   from: MarcaDistribuidora, to: MarcaCategoriaDistribuidora, foreignKey: "marca_id", as: "categorias" },
  { tipo: "belongsTo", from: MarcaCategoriaDistribuidora, to: CategoriaDistribuidora, foreignKey: "categoria_id", as: "categoria" },

  // ─── ListaPrecio ↔ localidades / precios por presentación ───────────────
  { tipo: "hasMany",   from: ListaPrecio, to: ListaPrecioLocalidad, foreignKey: "lista_id", as: "localidades" },
  { tipo: "hasMany",   from: ListaPrecio, to: ListaPrecioItem, foreignKey: "lista_id", as: "items" },
  { tipo: "belongsTo", from: ListaPrecioItem, to: VariedadDistribuidora, foreignKey: "variedad_id", as: "variedad" },

  // ─── VariedadDistribuidora ↔ ProductoDistribuidora (una fila = una variedad) ──
  { tipo: "belongsTo", from: VariedadDistribuidora, to: ProductoDistribuidora, foreignKey: "producto_id", as: "producto" },
  { tipo: "hasMany",   from: ProductoDistribuidora, to: VariedadDistribuidora, foreignKey: "producto_id", as: "variedades" },

  // ─── CarritoDistribuidora ↔ Usuario (1:1) ────────────────────────────────
  { tipo: "belongsTo", from: CarritoDistribuidora, to: Usuario, foreignKey: "usuario_id", as: "usuario" },
  { tipo: "hasOne",    from: Usuario, to: CarritoDistribuidora, foreignKey: "usuario_id", as: "carrito_distribuidora" },

  // ─── CarritoDistribuidoraItem ↔ CarritoDistribuidora / ProductoDistribuidora / VariedadDistribuidora ──
  { tipo: "belongsTo", from: CarritoDistribuidoraItem, to: CarritoDistribuidora, foreignKey: "carrito_id",  as: "carrito" },
  { tipo: "hasMany",   from: CarritoDistribuidora,     to: CarritoDistribuidoraItem, foreignKey: "carrito_id", as: "items" },
  { tipo: "belongsTo", from: CarritoDistribuidoraItem, to: ProductoDistribuidora, foreignKey: "producto_id", as: "producto" },
  { tipo: "belongsTo", from: CarritoDistribuidoraItem, to: VariedadDistribuidora, foreignKey: "variedad_id", as: "variedad" },

  // ─── NotaPedido ↔ Usuario (1:N) ──────────────────────────────────────────
  { tipo: "belongsTo", from: NotaPedido, to: Usuario,    foreignKey: "usuario_id", as: "usuario" },
  { tipo: "hasMany",   from: Usuario,    to: NotaPedido, foreignKey: "usuario_id", as: "notas_pedido" },

  // ─── NotaPedidoItem ↔ NotaPedido / ProductoDistribuidora / VariedadDistribuidora ──
  { tipo: "belongsTo", from: NotaPedidoItem, to: NotaPedido, foreignKey: "nota_pedido_id", as: "nota_pedido" },
  { tipo: "hasMany",   from: NotaPedido,     to: NotaPedidoItem, foreignKey: "nota_pedido_id", as: "items" },
  { tipo: "belongsTo", from: NotaPedidoItem, to: ProductoDistribuidora, foreignKey: "producto_id", as: "producto" },
  { tipo: "belongsTo", from: NotaPedidoItem, to: VariedadDistribuidora, foreignKey: "variedad_id", as: "variedad" },

  // ─── NotaPedidoPago — ledger de pagos (soporta pagos parciales) ─────────
  { tipo: "belongsTo", from: NotaPedidoPago, to: NotaPedido, foreignKey: "nota_pedido_id", as: "nota_pedido" },
  { tipo: "hasMany",   from: NotaPedido,     to: NotaPedidoPago, foreignKey: "nota_pedido_id", as: "pagos" },
  { tipo: "belongsTo", from: NotaPedidoPago, to: Usuario, foreignKey: "registrado_por", as: "registrado_por_usuario" },
  { tipo: "belongsTo", from: NotaPedidoPago, to: Usuario, foreignKey: "anulado_por",    as: "anulado_por_usuario" },

  // ─── PerfilClienteDistribuidora ↔ Usuario (1:1) ──────────────────────────
  { tipo: "belongsTo", from: PerfilClienteDistribuidora, to: Usuario, foreignKey: "usuario_id", as: "usuario" },
  { tipo: "hasOne",    from: Usuario, to: PerfilClienteDistribuidora, foreignKey: "usuario_id", as: "perfil_distribuidora" },
]);

export {
  OperacionCarrito, NotaPedidoEstadoLog, ImportacionCatalogo, ImportacionCatalogoLote,
  Sexo, TipoDocumento, TipoPersona, AlumnoEstado,
  Rol, Modulo, Permiso, RolPermiso,
  Persona, Usuario, UsuarioRol,
  PlanTipo, Alumno, Membresia, Ingreso, AlumnoEstadoLog,
  Producto, MovimientoStock, CategoriaProducto,
  PacienteKinesiologia, AsignacionProfesional,
  TipoEjercicio, GrupoMuscular, Ejercicio, RegistroEjercicio,
  Patologia, PacientePatologia,
  FichaKinesiologica, SesionKinesiologia, RecordatorioKinesiologia,
  HomeArea, HomeContenido, HomeTexto, HomePilar, HomeContacto,
  ModuloNegocio, BannerAnuncio,
  Categoria, Marca, Talle, Color, ProductoTienda, Stock, EnvioOpcion, CondicionIva,
  Carrito, CarritoItem,
  CategoriaDistribuidora, ProductoDistribuidora, VariedadDistribuidora, MarcaDistribuidora, MarcaCategoriaDistribuidora,
  ListaPrecio, ListaPrecioLocalidad, ListaPrecioItem,
  CarritoDistribuidora, CarritoDistribuidoraItem, NotaPedido, NotaPedidoItem, NotaPedidoPago,
  PerfilClienteDistribuidora,
};
