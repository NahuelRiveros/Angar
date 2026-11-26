# Módulo opcional: stock (`MST`)

## Objetivo

Saber cuánto hay de cada opción de producto, que la web diga "Sin stock" sola cuando se termina y que los
pedidos confirmados descuenten. Necesita el módulo catálogo. Funciona con o sin el módulo pedidos.

## Reglas

Tests: `stock.test.mjs` (reglas y API sin base), `stock.integration.mjs` (PostgreSQL, con catálogo y pedidos) y `stock.spec.js` (navegador).

| Código | Regla | Estado |
| --- | --- | --- |
| MST-01 | El stock se controla por variante y es opcional: se elige cuáles controlan ("Controlar", con la cantidad de hoy). La que no lo controla usa su casilla "Hay stock" del catálogo. Dejar de controlar vuelve a la casilla y conserva los movimientos. | ✅ PostgreSQL y navegador |
| MST-02 | La cantidad solo cambia con movimientos: inicio, entrada, salida, ajuste, pedido o devolución. Cada uno guarda cantidad (con signo), saldo, motivo, persona y fecha, y no se edita ni se borra (lo impide la base). | ✅ PostgreSQL y navegador |
| MST-03 | Salidas y ajustes piden motivo. Entrada suma, salida resta, ajuste deja la cantidad contada. Nunca queda negativa, ni con dos operaciones a la vez (fila bloqueada). | ✅ reglas, PostgreSQL y navegador |
| MST-04 | Un pedido descuenta al pasar a Confirmado y devuelve al cancelarse o volver a Recibido. Una sola vez: se mira lo ya movido por ese pedido. Ir y volver entre Confirmado, Listo y Entregado no mueve nada. | ✅ reglas y PostgreSQL |
| MST-05 | Si falta stock, el pedido no avanza y el mensaje dice qué opción, cuánto pide y cuánto hay. | ✅ PostgreSQL y recorrido real |
| MST-06 | El panel marca "Agotado" (0) y "Bajo" (en el mínimo o por debajo) y los muestra primero; el filtro "Para reponer" junta los dos. La web dice "Sin stock" cuando llega a 0, nunca la cantidad. | ✅ reglas, PostgreSQL y navegador |
| MST-07 | Todo lo de stock pide el permiso `stock.mover` (de entrada, el Encargado). | ✅ reglas y navegador |

## Cómo se engancha (MOD-17)

- **Catálogo:** al cambiar la cantidad, stock escribe el "disponible" de la variante (cantidad > 0) y vacía la
  caché del catálogo cuando se guardó. Así la web, sus filtros y pedidos no saben nada de stock. El enganche
  `disponibilidad` le avisa al catálogo qué opciones maneja: el formulario no muestra la casilla y al guardar no
  la pisa.
- **Pedidos:** el enganche `cambioDePedido` corre dentro de la transacción del cambio de estado: si falta stock,
  el pedido no cambia.

## Datos y API

- Tablas `stk_existencia` (una fila por variante controlada) y `stk_movimiento`, con su migración.
- `/api/stock` (todo con `stock.mover`): `GET /`, `GET|POST /:variante_id/movimientos`, `POST|DELETE /:variante_id/control`, `PUT /:variante_id/minimo`.
- Pantalla `/admin/stock`.
