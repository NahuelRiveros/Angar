# Módulo opcional: catálogo (`MCA`)

## Objetivo

Publicar lo que vende un negocio: categorías, productos con sus opciones, precios y fotos. Es la base
común; lo particular (talles, IVA, listas de precio) lo suma el rubro de cada proyecto.

## Reglas

Tests: `catalogo.test.mjs` (reglas), `catalogo.integration.mjs` (PostgreSQL) y `catalogo.spec.js` (navegador).

| Código | Regla | Estado |
| --- | --- | --- |
| MCA-01 | Un producto tiene nombre, categoría, descripción, fotos y si está activo o destacado. Los destacados (hasta 8) salen en el inicio. | ✅ reglas, PostgreSQL y navegador |
| MCA-02 | Lo que se vende es la **variante** (nombre, código, precio, disponible). Todo producto tiene al menos una; si tiene una sola, no se muestra ni se pide elegir. Con varias, cada una lleva un nombre distinto. Una variante quitada conserva su fila. | ✅ reglas, PostgreSQL y navegador |
| MCA-03 | Una variante sin precio muestra "Consultar precio". El precio anterior tiene que ser mayor y se muestra tachado. La tarjeta muestra el precio más bajo de lo disponible. | ✅ reglas y navegador |
| MCA-04 | Hasta 5 fotos por producto, ordenables; la primera es la principal. Solo `https`. | ✅ reglas, PostgreSQL y navegador |
| MCA-05 | Categorías de dos niveles (el segundo, opcional), ordenables y ocultables. No se borran si tienen subcategorías o tuvieron productos. | ✅ reglas, PostgreSQL y navegador |
| MCA-06 | La web muestra solo lo activo de categorías activas (también la de arriba), con buscador por nombre o código, filtro por categoría y páginas. Lo disponible va primero. No pide ingresar. | ✅ reglas, PostgreSQL y navegador |
| MCA-07 | La dirección web de un producto no cambia al renombrarlo. Dos iguales no chocan: "casco", "casco-2". | ✅ reglas y PostgreSQL |
| MCA-08 | Dar de baja un producto lo saca de la web y del panel, y conserva su fila para lo que la nombra. | ✅ PostgreSQL y navegador |
| MCA-09 | Editar pide el permiso `catalogo.editar`, que también alcanza para subir fotos. Guardar sobre un cambio de otra persona avisa en vez de pisarlo. | ✅ reglas, PostgreSQL y navegador |

Sin carrito ni cantidades: eso es de los módulos pedidos y stock.

## Datos y API

- Tablas `cat_categoria`, `cat_producto`, `cat_variante`, `cat_foto`. Un rubro que necesite más datos crea su
  tabla unida a `cat_variante` o `cat_producto`; nunca agrega columnas a estas.
- `/api/catalogo`: `categorias`, `destacados`, `productos` y `productos/:slug` (públicos); `panel/...` con permiso.
- Lo público queda un minuto en memoria (menos las búsquedas escritas) y se vacía con cada cambio del panel.
- Pantallas `/catalogo`, `/catalogo/:slug`, `/admin/catalogo/productos` y `/admin/catalogo/categorias`. Los hooks
  de `frontend/src/core/opcionales/catalogo/hooks.js` sirven para que un proyecto arme las suyas.
- El botón de WhatsApp de la ficha aparece si `whatsapp` está completo en `proyecto/client_config.js`.
