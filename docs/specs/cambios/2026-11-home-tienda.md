# Cambio: home de tienda con banners de promoción

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| Hecha (falta llevarla a DistribuCG) | Dueño del proyecto | 2026-11-10 | [sistema.md](../core/sistema.md) |

## Por qué

Los sistemas que salen de esta base son tiendas online. El home no tiene que contar quiénes
somos: tiene que vender. Muestra el nombre, las promociones del momento y los productos. Las
promociones cambian por fecha (Navidad, Hot Sale, liquidaciones), y hoy eso exige tocar cinco
tablas y una pantalla pensada para un sitio institucional.

## Requisitos

| Código | Requisito | Estado |
| --- | --- | --- |
| SIS-30 | El home de la tienda muestra, en este orden: el nombre de la tienda, el carrusel de banners de promoción y los productos que aporta el rubro. Sin banners vigentes, el carrusel no aparece. | 🚧 |
| SIS-31 | El carrusel pasa solo cada 5 segundos, se puede mover con flechas y puntos y, en el celular, deslizando con el dedo. Con un solo banner no se mueve ni muestra controles. | 🚧 |
| SIS-32 | Un banner es de tipo **carrusel** (imagen) o **cinta** (texto en la franja superior del sitio). Ambos se cargan desde una sola pantalla, "Banners y promociones". | 🚧 |
| SIS-34 | Un banner se ve solo si está activo y la fecha de hoy (hora de Argentina) está entre su "desde" y su "hasta", ambos días incluidos. Sin "desde" vale desde ya; sin "hasta" no vence. | 🚧 |
| SIS-35 | Si el banner tiene enlace, tocarlo lleva ahí. Solo se aceptan enlaces internos de la tienda (empiezan con "/") o `https://`. | 🚧 |
| SIS-36 | El admin ve todos los banners con su estado: "Vigente", "Programado" (todavía no empezó), "Vencido" o "Inactivo". | 🚧 |
| SIS-37 | Crear, editar, activar o borrar banners lo puede hacer quien tiene "Editar banners" (antes "Editar el home"). Ver los vigentes lo puede hacer cualquiera, sin ingresar. | 🚧 |
| SIS-38 | Las imágenes se piden a Cloudinary al ancho en que se muestran. | 🚧 |
| SIS-39 | Como máximo 8 banners de carrusel y 4 de cinta activos a la vez; al pasarse se avisa "Desactivá uno antes de sumar otro". | 🚧 |
| SIS-50 | Un banner de carrusel puede tener una segunda imagen, vertical, para el celular (opcional). Sin ella se usa la misma imagen recortada. | 🚧 |

Se retira la regla anterior SIS-30 (galería por áreas, en grilla o carrusel). SIS-31 (textos por
defecto) y SIS-32 (cinta de anuncios) se reemplazan por las de arriba. SIS-33 (subir imágenes) no cambia.

**Fuera de alcance:** las secciones institucionales (quiénes somos, pilares, galería, cómo pedir),
los videos en el carrusel, las estadísticas de clics y las promociones de precio (son del rubro).

## Diseño

- **API** (`/api/banners`, reemplaza `/api/home` y `/api/banner-anuncio`):
  - `GET /` (público): los vigentes, `{ carrusel: [...], cinta: [...] }`. Con caché corta, para no despertar la base en cada visita.
  - `GET /admin`, `POST /`, `PUT /:id`, `PATCH /:id/estado` y `DELETE /:id`, con el permiso `contenido.editar`.
  - Validación con Zod y errores en español.
- **Base de datos:**
  - Nueva tabla `banner_promocion`: `id`, `tipo` (`carrusel`/`cinta`), `titulo` (texto de la cinta o alt de la imagen), `imagen_url`, `imagen_celular_url` (SIS-50), `enlace`, `orden`, `activo`, `vigente_desde`, `vigente_hasta` (DATEONLY), `creado_en` y `actualizado_en`.
  - Se retiran del core `home_area`, `home_contenido`, `home_texto`, `home_pilar`, `home_contacto` y `banner_anuncio`.
  - En instalaciones existentes, cada proyecto las agrega a su `proyecto/tablas_retiradas.js` cuando quiera borrarlas.
  - Migración de las cintas existentes: se copian una sola vez, desde el proyecto (DistribuCG), las filas de `banner_anuncio` a `banner_promocion` como `cinta`, antes de retirarla.
- **Pantallas:**
  - Home: nombre de la tienda, carrusel y el espacio del rubro (`InicioTienda`).
  - Admin "Banners y promociones" (reemplaza "Contenido del home" y "Cinta de anuncios"): pestañas Carrusel y Cinta, lista con estado y fechas, formulario con subida de imagen, vista previa y elección de fechas.
  - Las tres situaciones: cargando, error con reintentar y sin banners.
  - Pensado para celular.
- **Configuración** (`home_config.js` del proyecto): solo quedan los contactos del pie de página. Los textos institucionales se borran.

## Tareas

1. [x] Tests de las reglas (vigencia por fecha, enlaces, validación, permisos). El carrusel se revisó con capturas y la API simulada; no hay test de Playwright en el core.
2. [x] Servidor: modelo, service, controller y router de `banner_promocion`; retirar el home y `banner_anuncio`.
3. [x] Frontend: home de tienda, carrusel nuevo, pantalla de admin, cinta leyendo de `/api/banners`; borrar lo institucional.
4. [x] Specs: `sistema.md`, `panel.md` y `permisos.md`.
5. [x] `node scripts/verificar.mjs` en verde (el `--completo` necesita la base local) y capturas del home y del admin, en escritorio y celular.
6. [x] Pasar las reglas a `sistema.md` y marcar este cambio como hecho.
7. [ ] Llevar el cambio a DistribuCG (o la próxima subida del core lo pisa).

## Riesgos

- **DistribuCG pierde su contenido actual del home** al actualizar el core. Hay que avisar antes y migrar las cintas.
- **Fechas:** "hasta el 25/12" tiene que incluir todo ese día en hora de Argentina, no cortar a las 21 h por UTC.
- **Costo:** el `GET` público lo llama cada visita. La caché del servidor y de TanStack Query evita consultar la base cada vez.

## Notas de la implementación

- No se guarda el `public_id` de Cloudinary: el campo de imagen ya borra las subidas que se reemplazan sin guardar.
- La imagen de celular se usa solo si **todos** los banners del carrusel la tienen: si no, las diapositivas tendrían alturas distintas y el carrusel saltaría (visto en las capturas).
- La regla que en el borrador era SIS-33 (subir imágenes) se mantiene con ese código.

## Decisiones

| Fecha | Regla | Decisión | Quién |
| --- | --- | --- | --- |
| 2026-11-10 | SIS-30 | Home solo de tienda (nombre, promociones, productos); se descarta el home institucional. | Dueño del proyecto |
| 2026-11-10 | SIS-32/34 | Banners cargados desde el panel con fecha desde/hasta; la cinta se unifica en la misma tabla. Carrusel como formato. | Dueño del proyecto |
| 2026-11-10 | SIS-39/50 | Tope 8 de carrusel y 4 de cinta; imagen opcional para celular; migrar las cintas de DistribuCG. | Dueño del proyecto |
