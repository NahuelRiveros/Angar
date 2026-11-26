# Cambio: módulos opcionales y tipos de proyecto

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| En curso (etapa 1 de 7) | Dueño del proyecto | 2026-11-25 | [core/modulos.md](../core/modulos.md) |

## Por qué

El core que usan todos los proyectos tiene que ser **el mismo**. Hoy trae lo común (usuarios, permisos,
panel), pero carrito, pedidos, stock o turnos se copian de un proyecto a otro. La idea: que esos módulos
viajen con el core **apagados** y que cada proyecto prenda solo los de su tipo, sin tablas de más.

## Decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-25 | El core se mejora directo en CoreSistem; los proyectos lo traen con `core_traer`. |
| 2026-11-25 | Los módulos opcionales usan migraciones (subir/deshacer). Las tablas del core y las de los rubros siguen con `sync`. |
| 2026-11-25 | DistribuCG, Stilos y MiPadel no se migran: traen el mismo core con los módulos apagados. |
| 2026-11-25 | Se hace por etapas; esta es la 1: la base, sin ningún módulo todavía. |

## Requisitos

Las reglas MOD-01 a MOD-14 y COR-21 están en [core/modulos.md](../core/modulos.md), con su test.

**Fuera de alcance:** los módulos en sí (catálogo, pedidos, cobros, stock, turnos, suscripciones: etapas 2 a 7).

## Diseño

- **Lista y tipos:** `core/modulos_opcionales.js`, compartida por servidor, web y scripts.
- **Servidor:** `servidor/src/core/opcionales/<modulo>/`, con su registro en `opcionales/registro.js`.
- **Web:** `frontend/src/core/opcionales/<modulo>/`, con `registro.js` y `registro_pantallas.js`.
- **Base:** tabla `_migraciones`, que solo se crea si hay algún módulo prendido. Nada cambia en las tablas actuales.
- **Comandos:** `npm --prefix servidor run migrar:estado` y `npm --prefix servidor run migrar:deshacer -- <modulo>`.

## Tareas

1. [x] Tests de los requisitos.
2. [x] Servidor, web, permisos y scripts.
3. [x] Prueba en una copia limpia con PostgreSQL local.
4. [x] Reglas en `docs/specs/core/modulos.md`.
5. [ ] Traerlo a los proyectos (cuando el dueño confirme commit y push).

## Riesgos

- Un módulo con nombres repetidos en un proyecto viejo: lo frena MOD-07 antes de tocar la base.
- Una migración que falla a mitad: cada una va en su transacción y el servidor no arranca a medias.
- La huella de los modelos cambia una vez al traer este core: el primer arranque vuelve a sincronizar.
