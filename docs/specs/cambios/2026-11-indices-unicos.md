# Cambio: índices únicos repetidos en la base

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| Hecho | Dueño del proyecto | 2026-11-16 | [core/sistema.md](../core/sistema.md) |

## Por qué

En la base local de Stilos había **164 restricciones únicas de más**: `persona.email` y `persona.documento`,
`usuario.nombre_usuario`, `rol.codigo`, `permiso.codigo` y las tablas del rubro (`prenda.slug`, `marca_ropa.nombre`…)
tenían hasta 11 copias cada una (`…_key`, `…_key1`, … `…_key10`). Sequelize agrega una cada vez que sincroniza
(`sync({ alter: true })`) un modelo con `unique: true` en una columna de texto. No rompen datos, pero ocupan lugar,
hacen más lentas las escrituras y crecen en cada deploy que cambia los modelos (también en producción).

## Requisitos

| Código | Requisito | Estado |
| --- | --- | --- |
| SIS-51 | **No se crean más.** Las columnas de texto únicas se declaran como índice con nombre fijo, el mismo de la restricción original (`<tabla>_<columna>_key`): sincronizar dos veces no agrega nada. Siguen siendo únicas (no se puede repetir un email, un usuario, un slug…). | ✅ |
| SIS-52 | **Se limpian las que ya hay.** Después de sincronizar los modelos, el arranque borra las restricciones `<nombre>_key<N>` que repiten exactamente las mismas columnas que `<nombre>_key` en la misma tabla, solo en el schema del proyecto. Deja la original. Idempotente. | ✅ |

**Fuera de alcance:** índices compuestos de `rol_permiso` y `usuario_rol` (un índice y una restricción sobre las
mismas columnas: 2, no crecen); las columnas enteras únicas (`usuario.persona_id`, `persona_fiscal.persona_id`,
`cliente_ropa.usuario_id`), que no se duplican.

## Diseño

- **Core:** `servidor/src/core/database/indices_repetidos.js` (`borrarUnicosRepetidos`), llamado desde
  `bootstrap.js` después de `sincronizar_modelos()`. Modelos del core: `persona` (email, documento), `sexo`,
  `tipo_documento`, `tipo_persona` (descripcion), `modulo`, `permiso`, `rol` (codigo), `usuario` (nombre_usuario,
  google_id). Se sube a CoreSistem; DistribuCG lo trae con `core_traer`.
- **Rubro Stilos:** `categoria_ropa.slug`, `prenda.slug`, `marca_ropa.nombre`, `color_ropa.nombre`,
  `grupo_talle.nombre`, `grupo_caracteristica.nombre`, `pedido_whatsapp.clave_envio` y `clave_seguimiento`.
- **Base de datos:** no cambia ningún dato; solo se borran restricciones duplicadas. El nombre de la que queda es
  el mismo de siempre (el registro de clientes mira `usuario_nombre_usuario_key`).

## Tareas

1. [x] Test: sincronizar dos veces todos los modelos no deja únicos repetidos; la limpieza borra copias y deja una;
   lo único se sigue respetando.
2. [x] Modelos del core y del rubro; limpieza en el arranque.
3. [x] `node scripts/verificar.mjs --completo` en verde y arrancar contra la base local (que tiene las copias).
4. [x] Pasar las reglas a `core/sistema.md`, subir el core a CoreSistem y marcar este cambio como hecho.

## Riesgos

- **DistribuCG:** al traer el core se limpian sus tablas, pero sus modelos de rubro con `unique: true` seguirán
  sumando copias hasta que se cambien igual que acá (la limpieza las borra en cada sincronización).
