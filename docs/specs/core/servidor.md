# Servidor: rutas, controllers, services y consultas (`SRV`)

## Objetivo

Que todo módulo o rubro nuevo arme su API igual y con menos código: las respuestas, los errores y las
consultas que se repiten están una sola vez en el core. Complementa la ficha de la web (`componentes.md`).

## Las capas

| Capa | Hace | No hace |
| --- | --- | --- |
| Ruta (`*_router.js`) | Arma el camino: `requireAuth`, `requirePermiso("x.y")`, `validar({ body, params, query })` con Zod en español. | Lógica ni consultas. |
| Controller (`*_controller.js`) | Una línea por ruta con `datos(...)` o `hecho(...)`. | `try/catch`, `res.status(500)`, leer `req.body` crudo. |
| Service (`services/*.js`) | Las reglas del negocio y las consultas, con transacción si toca plata o stock. Errores esperados con `ErrorApp`. | Saber de `req`/`res`. |

## Piezas

### Controllers — `controllers/common/responder.js`

| Pieza | Respuesta | Ejemplo |
| --- | --- | --- |
| `datos(hacer)` | `{ ok: true, data }` | `export const listar = datos(({ query }) => service.listar(query));` |
| `hecho(codigo, mensaje, hacer, estado)` | `{ ok: true, codigo, mensaje, data? }` (`estado` 201 al crear) | `export const crear = hecho("PRODUCTO_CREADO", "Producto creado.", ({ body }, usuario) => service.crear(body, usuario.usuario_id), 201);` |

`hacer(datos, usuario, req)`: `datos` es lo validado (`{ body, params, query }`); `usuario`, el de la sesión.
Un error (de Zod, de `ErrorApp` o inesperado) lo responde el manejador central de `app.js`.

### Consultas — `services/common/consultas.js`

| Pieza | Para qué |
| --- | --- |
| `obtenerOFallar(Modelo, id, mensaje, { transaction, bloquear, ...opciones })` | La fila o un 404 con el mensaje. `id`: número u objeto (where). `bloquear`: la toma hasta el fin de la transacción. |
| `exigirVersion(fila, version, mensaje)` | Si otra persona la cambió (versión distinta), 409 `CAMBIO_SIMULTANEO` en vez de pisarla. |
| `sinRepetir(accion, mensaje)` | El "valor repetido" de la base como 409 `DUPLICADO` con mensaje claro. |
| `contiene(columna, q)`, `buscarTexto(columnas, q)` | Búsqueda en Sequelize sin mayúsculas ni acentos; `%` y `_` se buscan como texto. |
| `patronBusqueda(q)`, `patronSinAcentos(q)`, `sinAcentosSql(columna)` | Lo mismo para SQL escrito a mano: `${sinAcentosSql("p.nombre")} LIKE :q` con `replacements: { q: patronSinAcentos(texto) }`. |
| `paginar(Modelo, opciones, { page, limit })` | Una página con un modelo: `{ items, paginacion }`. |
| `paginarSql({ columnas, desde, orden, replacements, page, limit })` | Una página con SQL escrito a mano (la consulta y su total). |
| `quienLoHizo("h.usuario_id")` | `{ columna, union }` para sumar el nombre de quien hizo cada cambio a un historial. |
| `listarOpciones(Modelo, …)` (`select_options.js`) | Opciones `{ value, label }` para un select. |
| `crearCrudService(Modelo, config)` (`crud_service.js`) | Listar, obtener y cambiar estado de una tabla simple (usa `buscarTexto`). |
| `normalizarPaginacion`, `armarPaginacion` (`pagination.js`) | El cálculo de página, límite y total. |

## Reglas

| Código | Regla | Estado |
| --- | --- | --- |
| SRV-01 | Los controllers usan `datos`/`hecho`, sin `try/catch`: todos los errores llegan al manejador central y se responden igual. | ✅ `core_consultas.test.mjs` |
| SRV-02 | Buscar texto no distingue mayúsculas ni acentos, y lo que escribe la persona (incluidos `%` y `_`) nunca funciona como comodín. | ✅ `core_consultas.test.mjs` |
| SRV-03 | Lo que pueden editar dos personas a la vez lleva `version`: `exigirVersion` avisa en vez de pisar. | ✅ `core_consultas.test.mjs` y PostgreSQL |
| SRV-04 | El "quién lo hizo" de los historiales sale de `quienLoHizo`. | ✅ `core_consultas.test.mjs` y PostgreSQL |
| SRV-05 | SQL escrito a mano: los datos de la persona van siempre como `replacements`; en el texto solo van nombres fijos del código (columnas, filtros de una lista, schema). | ✅ revisado en los 4 proyectos |
| SRV-06 | Los módulos del core (catálogo, pedidos, stock) usan solo estas piezas. | ✅ |

Los rubros de los proyectos actuales siguen con su código; pasarlos a estas piezas es opcional y de a uno.
