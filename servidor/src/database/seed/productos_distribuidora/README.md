# Productos iniciales por familia

Cada archivo contiene una familia y exporta su lista agrupada por
`Familia › Categoría`. `index.js` importa las listas explícitamente,
exporta `PRODUCTOS_POR_FAMILIA` y reúne `PRODUCTOS_INICIALES`.
Estos módulos solo contienen datos: importarlos no conecta a la base.

El archivo `../seed_productos_distribuidora.js` conserva la función que
ejecuta la carga y reexporta `PRODUCTOS_INICIALES` para mantener compatibles
los consumidores existentes.

## Agregar productos

1. Abrir el archivo de la familia correspondiente.
2. Usar una categoría y una marca ya definidas en los seeds de familias y
   marcas; la marca debe estar asociada a esa categoría o a su familia.
3. Agregar `nombre`, `marca`, `imagen_url` HTTPS y `fuente_url`.
   La fuente es documentación del dato y no se guarda en la base.
4. Verificar la presentación y la imagen en la ficha de origen.
5. Ejecutar `npm --prefix servidor test` desde la raíz.

El nombre admite hasta 150 caracteres y la imagen hasta 500. No renombrar
un artículo ya sembrado para actualizarlo: la identidad es nombre +
categoría y un renombre puede crear otro artículo. Los registros existentes
se editan desde gestión; el seed agrega faltantes.

Al incorporar una familia nueva, crear su archivo con una exportación
`PRODUCTOS_...` y registrarla en `index.js`. La prueba de organización
detecta archivos JavaScript que quedaron sin importar y rutas ajenas a
la familia. El catálogo completo se contrasta con las marcas y categorías
reales y se prueba que la repetición no agregue duplicados.

## Ejecutar la carga

Desde la raíz: `npm --prefix servidor run seed:distribuidora`.

Ese comando escribe en la base configurada. El arranque automático solo
carga productos si su tabla está vacía. Todos se crean inactivos y sin
presentaciones; los precios, códigos internos y bultos se completan desde
gestión antes de publicar. No se consulta ninguna web al ejecutar el seed.

Fuentes y alcance: [catálogo inicial](../../../../../docs/catalogo-inicial-distribuidora.md).
