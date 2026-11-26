# Módulo opcional: pedidos (`MPE`)

## Objetivo

Que alguien arme un carrito con lo del catálogo, mande su pedido sin crear cuenta y lo siga con un link,
y que el negocio lo atienda desde el panel. Necesita el módulo catálogo. Cobros, stock y costos de envío
quedan afuera (ver la spec del cambio `cambios/2026-11-tienda-base.md`).

## Reglas

Tests: `pedidos.test.mjs` (reglas y API sin base), `pedidos.integration.mjs` (PostgreSQL) y `pedidos.spec.js` (navegador).

| Código | Regla | Estado |
| --- | --- | --- |
| MPE-01 | El carrito se guarda en el navegador (30 días, hasta 50 productos distintos y 99 unidades de cada uno). No usa tablas. Se ve igual en todas las pestañas. | ✅ navegador |
| MPE-02 | Al enviar, el navegador manda variante, cantidad y el precio que vio. Precios y total los calcula el servidor en centavos enteros; el precio visto solo sirve para avisar (MPE-03). | ✅ reglas, PostgreSQL y navegador |
| MPE-03 | Si cambió un precio, o algo ya no se vende (oculto, sin stock, sin precio, dado de baja), no se crea el pedido: la respuesta (409) dice qué cambió, el carrito se corrige solo y lo escrito en el formulario queda. | ✅ reglas, PostgreSQL y navegador |
| MPE-04 | Cada envío lleva una clave (`clave_envio`): un reintento o un doble clic con la misma devuelve el mismo pedido. Un carrito distinto es otra clave. | ✅ PostgreSQL y navegador |
| MPE-05 | Cada línea guarda copia de nombre, opción, código y precio: si el producto cambia o se da de baja, el pedido no. | ✅ reglas y PostgreSQL |
| MPE-06 | Se pide sin cuenta, con nombre y celular. Si la persona ingresó, el pedido queda además en "Mis pedidos". Si su sesión venció justo, se manda como invitado. | ✅ reglas, PostgreSQL y navegador |
| MPE-07 | Estados Recibido → Confirmado → Listo → Entregado, de a un paso. Volver un paso, cancelar (antes de Entregado) o reabrir (Cancelado → Recibido) pide motivo. Cada cambio queda en el historial con persona y fecha. | ✅ reglas, PostgreSQL y navegador |
| MPE-08 | Cambiar de estado manda la versión del pedido: si otra persona lo cambió antes, avisa y ofrece actualizar. | ✅ PostgreSQL y navegador |
| MPE-09 | El cliente sigue su pedido con un link secreto (`/pedido/:clave`): ve pasos, productos y total, pero no celular, dirección ni motivos. Lo puede copiar o mandar por WhatsApp. | ✅ reglas, PostgreSQL y navegador |
| MPE-10 | El panel lista por estado (con cuántos hay en cada uno) y busca por número, nombre (sin acentos) o celular. `pedidos.ver` para ver; `pedidos.gestionar` (incluye ver) para cambiar el estado. | ✅ reglas, PostgreSQL y navegador |
| MPE-11 | Pedir es público, con un tope de 10 pedidos creados por hora por conexión (COR-21). Los rechazados no cuentan. | ✅ reglas y PostgreSQL |
| MPE-12 | Retiro en el local o envío a coordinar; el envío pide dirección y localidad. Sin costo de envío. | ✅ reglas y navegador |

## Datos y API

- Tablas `ped_pedido`, `ped_item` (unida a `cat_variante`) y `ped_historial`, con su migración.
- `/api/pedidos`: `POST /` (enviar), `GET /seguir/:clave` (público), `GET /mios` (con sesión); `panel/...` con permiso.
- Pantallas `/carrito`, `/pedido/:clave`, `/mis-pedidos`, `/admin/pedidos` y `/admin/pedidos/:id`. El ícono del
  carrito va en la barra.
- El catálogo no conoce a este módulo: pregunta si alguna pantalla activa trae `comprar` (`{ Ficha, useTarjeta }`)
  y, si la hay, suma "Agregar al carrito" en la ficha y "Agregar" en la tarjeta de los productos con una sola opción.
- Sin consultas periódicas: el seguimiento y el panel se actualizan al volver a la pestaña o con el botón.
- Cada proyecto puede exigir cuenta, apagar el envío o cambiar los textos en `proyecto/tienda_config.js` (MOD-15).
  Con cuenta obligatoria, el carrito pide ingresar (y ofrece crear una si el registro está abierto).
