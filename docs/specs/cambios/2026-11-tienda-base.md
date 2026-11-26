# Cambio: base de tienda (catálogo, stock y pedidos)

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| Hecho | Dueño del proyecto | 2026-11-25 | [core/catalogo.md](../core/catalogo.md), [core/pedidos.md](../core/pedidos.md), [core/stock.md](../core/stock.md) |

## Por qué

Los proyectos con tienda repiten lo mismo (productos, stock, carrito, pedidos) y difieren en el resto.
Esta base es **lo que no cambia de un negocio a otro**. Lo particular lo agrega cada proyecto sin tocar
el módulo.

Los códigos empiezan con M (`MCA`, `MST`, `MPE`) para no confundirse con los `CAT` y `PED` de DistribuCG.

## Requisitos

### Catálogo (`MCA`)

| Código | Requisito | Estado |
| --- | --- | --- |
| MCA-01 | Un producto tiene nombre, categoría, descripción, fotos y si está activo o destacado. | ✅ |
| MCA-02 | Lo que se vende es la **variante** (nombre, código, precio, disponible). Todo producto tiene al menos una; si tiene una sola, no se muestra ni se pide elegir. | ✅ |
| MCA-03 | Una variante sin precio muestra "Consultar precio" y no se puede agregar al carrito. El precio anterior, si es mayor, se muestra tachado. | ✅ |
| MCA-04 | Hasta 5 fotos por producto, ordenables; la primera es la principal. | ✅ |
| MCA-05 | Las categorías se ordenan, se ocultan y no se borran si tienen productos. Dos niveles (Accesorios › Cascos); el segundo es opcional. | ✅ |
| MCA-06 | La web muestra solo lo activo de categorías activas, con buscador, filtro por categoría y páginas. Lo disponible va primero. | ✅ |
| MCA-07 | La dirección web de un producto no cambia al renombrarlo. Dos iguales no chocan: "casco", "casco-2". | ✅ |
| MCA-08 | Dar de baja un producto lo saca de la web y conserva los pedidos viejos. | ✅ |
| MCA-09 | Editar pide el permiso `catalogo.editar`, que también alcanza para subir fotos. Guardar sobre un cambio de otra persona avisa en vez de pisarlo. | ✅ |

### Stock (`MST`)

| Código | Requisito | Estado |
| --- | --- | --- |
| MST-01 | El stock se controla por variante y es opcional: la que no lo controla usa su "disponible" sí/no. | ✅ |
| MST-02 | La cantidad solo cambia con movimientos: entrada, salida, ajuste o pedido. Cada uno guarda cantidad, saldo, motivo, persona y fecha, y no se edita ni se borra. | ✅ |
| MST-03 | Salidas y ajustes piden motivo. La cantidad nunca queda negativa, ni con dos operaciones simultáneas. | ✅ |
| MST-04 | Un pedido descuenta una sola vez y devuelve una sola vez: descuenta al **confirmar** y devuelve al cancelar o volver a Recibido. | ✅ |
| MST-05 | Si falta stock, el pedido no avanza y el mensaje dice qué variante y cuánto hay. | ✅ |
| MST-06 | El panel marca lo que está en el mínimo o por debajo y lo agotado. La web dice "Sin stock", nunca la cantidad exacta. | ✅ |
| MST-07 | Mover stock pide el permiso `stock.mover`. | ✅ |

### Pedidos (`MPE`)

| Código | Requisito | Estado |
| --- | --- | --- |
| MPE-01 | El carrito se guarda en el navegador (30 días). No usa tablas. | ✅ |
| MPE-02 | Al enviar, el navegador manda solo variante y cantidad: precios y total los calcula el servidor, en centavos enteros. | ✅ |
| MPE-03 | Si cambió un precio o algo ya no está, no se crea el pedido y se le muestra qué cambió, sin perder lo cargado. | ✅ |
| MPE-04 | Un doble clic o un reintento no crea dos pedidos. | ✅ |
| MPE-05 | El pedido guarda copia de nombre, variante y precio: si el producto cambia, el pedido no. | ✅ |
| MPE-06 | Se pide sin cuenta, con nombre y celular. Si la persona ingresó, el pedido además queda en "Mis pedidos". Un proyecto puede exigir cuenta (MOD-15). | ✅ |
| MPE-12 | El cliente elige retiro o envío a coordinar; para envío deja dirección y localidad. Sin costo de envío. Un proyecto puede apagar el envío (MOD-15). | ✅ |
| MPE-07 | Estados: Recibido → Confirmado → Listo → Entregado. Cancelar, volver atrás o reabrir pide motivo. Cada cambio queda en el historial con persona y fecha. | ✅ |
| MPE-08 | Dos personas no se pisan: si el pedido cambió, avisa y pide actualizar. | ✅ |
| MPE-09 | El cliente sigue su pedido con un link secreto, sin celular ni dirección a la vista, y lo puede mandar por WhatsApp al negocio. | ✅ |
| MPE-10 | El panel lista pedidos por estado y busca por número, nombre o celular. `pedidos.ver` para ver, `pedidos.gestionar` para cambiar. | ✅ |
| MPE-11 | Pedir es público: hasta 10 pedidos por hora por conexión (COR-21). | ✅ |

### Cómo lo adapta cada proyecto (`MOD`)

| Código | Requisito | Estado |
| --- | --- | --- |
| MOD-15 | Opciones en `proyecto/tienda_config.js` (opcional, con valores por defecto en el core): exigir cuenta, formas de entrega, etiquetas, si muestra precios. | ✅ exigir cuenta, entregas y textos; ocultar precios, cuando lo pida un proyecto |
| MOD-16 | Si un rubro declara una pantalla con la misma dirección que un módulo, se usa la del rubro. | ✅ |
| MOD-17 | Un módulo o rubro puede engancharse a otro sin que se conozcan: `disponibilidad` (qué se puede vender), `precios` (ej. lista por cliente) y `cambioDePedido` (dentro de la misma transacción). Así stock funciona con pedidos, y pedidos sin stock. | ✅ `disponibilidad` y `cambioDePedido`; `precios`, cuando lo pida un proyecto |
| MOD-18 | Un rubro agrega datos con su propia tabla unida a `cat_variante` o `cat_producto` (talle, IVA, bulto). Nunca se agregan columnas a las del módulo desde un proyecto. | ✅ el arranque rechaza una tabla de rubro con el prefijo de un módulo |

**Fuera de alcance:** marcas, talles y colores, listas de precio, IVA, promociones, cupones, cobros y
comprobantes, pago online, costo de envío, importar Excel, venta en mostrador, avisos por correo.

## Diseño

- **Tablas:** `cat_categoria`, `cat_producto`, `cat_variante`, `cat_foto`; `stk_existencia`, `stk_movimiento`;
  `ped_pedido`, `ped_item`, `ped_historial`. Con migraciones (MOD-08). Plata en `NUMERIC(12,2)`.
- **API:** `/api/catalogo` (público y panel), `/api/stock` (panel), `/api/pedidos` (enviar y seguir: público; resto: panel).
- **Web:** `/catalogo`, `/catalogo/:slug`, `/carrito`, `/pedido/:clave`. **Panel:** Productos, Categorías, Stock, Pedidos.
- **Reutiliza del core:** tarjeta de producto, semáforo de stock, carrito persistente, subida de imágenes, paginado.
  La tarjeta dice siempre "IVA incluido": pasa a ser un texto opcional.
- **Rendimiento:** catálogo público en caché (servidor y TanStack Query); sin consultas periódicas.

## Decisiones

| Fecha | Código | Decisión |
| --- | --- | --- |
| 2026-11-25 | MST-04 | El stock se descuenta al confirmar el pedido, no al enviarlo. |
| 2026-11-25 | MPE-06 | Pedir no exige cuenta; tenerla es opcional. |
| 2026-11-25 | MCA-05 | Categorías de dos niveles, el segundo opcional. |
| 2026-11-25 | MST-01 | Con control de stock, el «hay stock» lo decide la cantidad (> 0); la casilla del producto queda para lo que no controla. |
| 2026-11-25 | MOD-15 | Ocultar precios y el enganche `precios` quedan para cuando un proyecto los pida (hoy ninguno). |
| 2026-11-25 | MPE-12 | Retiro o envío a coordinar, sin costo de envío en la base. |

## Tareas

1. [x] Aprobar la spec.
2. [x] Catálogo: tests, servidor, panel, web.
3. [x] Pedidos con carrito: tests, servidor, panel, web.
4. [x] Stock y enganches: tests, servidor, panel.
5. [x] Adaptación por proyecto (MOD-15 a MOD-18) con un rubro de prueba.
6. [x] Proyecto `ecommerce` de ejemplo de punta a punta, capturas en escritorio y celular.
7. [x] Los 4 proyectos actuales siguen en verde con los módulos apagados.

## Riesgos

- Que la base crezca: lo que pida un solo proyecto va a su rubro; al módulo, solo lo que sirva a dos o más.
- Cambiar una regla del módulo cambia a todos los que lo usan: cada cambio con spec, migración y opción por defecto igual a la anterior.
