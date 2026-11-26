# Módulos opcionales (`MOD`)

## Objetivo

Que todos los proyectos usen **el mismo core** y cada uno tenga solo lo que necesita: los módulos
(catálogo, stock, pedidos, cobros, turnos, suscripciones) viajan con el core apagados y se prenden
según el tipo de proyecto.

## Las tres capas

| Capa | Qué es | Dónde |
| --- | --- | --- |
| Núcleo | Siempre prendido: usuarios, permisos, panel, banners, archivos | `core/`, `servidor/src/core/`, `frontend/src/core/` |
| Módulo opcional | Lo que repiten varios proyectos; se prende o apaga | `…/core/opcionales/<modulo>/` |
| Rubro | Lo propio de un proyecto | `servidor/src/modulos/`, `frontend/src/modules/` |

Un rubro puede apoyarse en un módulo opcional prendido. Un módulo opcional nunca importa un rubro (COR-01).

## Reglas

| Código | Regla | Estado |
| --- | --- | --- |
| MOD-01 | El core tiene una lista única de módulos opcionales (`core/modulos_opcionales.js`). Lo que no figura en `proyecto/gate_config.js` cuenta como apagado. | ✅ `core_modulos.test.mjs` |
| MOD-02 | Un módulo apagado no crea tablas, ni rutas, ni menús, ni pantallas, ni permisos en el panel. | ✅ `core_modulos.test.mjs`; tablas: `core_modulos.integration.mjs` |
| MOD-03 | Apagar un módulo nunca borra datos: quedan sus tablas y lo tildado en "Roles y permisos", y vuelven al prenderlo. | ✅ `core_modulos.integration.mjs` |
| MOD-04 | Prender un módulo sin los que necesita impide arrancar y el mensaje dice cuáles faltan. | ✅ `core_modulos.test.mjs` |
| MOD-05 | Prender un módulo que todavía no está en el core impide arrancar con un mensaje claro. | ✅ `core_modulos.test.mjs` |
| MOD-06 | Los módulos se cargan después de los que necesitan, sin importar el orden en que se escriban. | ✅ `core_modulos.test.mjs` |
| MOD-07 | Las tablas de un módulo llevan su prefijo. Si una tabla o un permiso choca con un rubro, o la tabla figura en `tablas_retiradas.js`, el servidor no arranca **y no borra nada**. | ✅ `core_modulos.test.mjs` |
| MOD-08 | Cada cambio a las tablas de un módulo es un par `NNN_nombre.subir.sql` / `.deshacer.sql`. Al arrancar se aplican las que faltan de los módulos prendidos, en orden, cada una en su transacción y una sola vez aunque arranquen dos servidores. | ✅ `core_modulos.test.mjs`, `core_modulos.integration.mjs` |
| MOD-09 | Deshacer una migración es manual y solo contra una base local; nunca en producción. | ✅ `core_modulos.test.mjs`, `core_modulos.integration.mjs` |
| MOD-10 | `nuevo_proyecto.mjs --tipo <tipo>` escribe `gate_config.js` con los módulos de ese tipo prendidos y el resto apagados; `--con <modulo>` suma otros, con lo que necesiten. Los que todavía no existen quedan apagados y se avisa. No pisa un `gate_config.js` existente. | ✅ `core_modulos.test.mjs` |
| MOD-11 | La plantilla lista todos los módulos, apagados. | ✅ `core_modulos.test.mjs` |
| MOD-12 | Prender o apagar un rubro hace que el próximo arranque revise las tablas: la huella incluye `gate_config.js` y `servidor/src/proyecto/modulos.js`. | ✅ `core_modulos.test.mjs` |
| MOD-13 | Un proyecto que ya existe trae este core sin agregar archivos y se comporta igual. | ✅ `core_modulos.test.mjs` |
| MOD-14 | El núcleo llega a los módulos opcionales solo por sus registros. | ✅ `core_modulos.test.mjs` |
| MOD-15 | Cada proyecto adapta la tienda en `proyecto/tienda_config.js` (opcional; los valores por defecto y su control están en `core/tienda_opciones.js`): exigir cuenta, formas de entrega y textos. Si está mal escrito, el servidor no arranca. | ✅ `tienda_adaptacion.test.mjs` y recorrido real |
| MOD-16 | Si un rubro declara una pantalla (o `comprar`) con la misma dirección que un módulo, se usa la del rubro. | ✅ `tienda_adaptacion.test.mjs` |
| MOD-17 | Los módulos se enganchan sin conocerse (`servidor/src/core/opcionales/enganches.js`): `disponibilidad` y `cambioDePedido`, declarados en `enganches` de su modulo.js. Uno desconocido frena el arranque. | ✅ `stock.test.mjs` y `stock.integration.mjs` |
| MOD-18 | Un rubro suma datos con su propia tabla unida a la del módulo (ej. por `variante_id`); el arranque rechaza una tabla de rubro con el prefijo de un módulo. Un código de permiso que usa un rubro no cuenta como de un módulo apagado. | ✅ `core_modulos.test.mjs` y `catalogo.integration.mjs` |
| COR-22 | Los `package.json` (y sus lock) son de cada proyecto: `core_subir` no los manda y `core_traer` no los toca. Cada librería que importa el core tiene que estar en el `package.json` del proyecto. | ✅ `core_estructura.test.mjs` |

## Cómo se agrega un módulo al core

1. Spec de cambio aprobada, con sus códigos.
2. Servidor: `servidor/src/core/opcionales/<modulo>/` con `modulo.js` (`codigo`, `modelos`, `migraciones`,
   `rutas` y, si hace falta, `arranque` y `seed`) y su línea en `CARGADORES` de `opcionales/registro.js`.
3. Web: `frontend/src/core/opcionales/<modulo>/` con `modulo.js` y `modulo_pantallas.jsx`, y sus líneas en
   `registro.js` y `registro_pantallas.js`.
4. En `core/modulos_opcionales.js`: sus `permisos` y sacar `disponible: false`. Regenerar la plantilla con `textoGateConfig()`.
5. Migraciones probadas (subir y deshacer). Una ya publicada no se edita: se agrega otra.
