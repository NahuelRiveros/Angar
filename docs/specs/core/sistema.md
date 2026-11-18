# Módulo: sistema (`SIS`)

## Objetivo

Lo que sostiene cualquier instalación, sea del rubro que sea: el cobro mensual del software al
cliente, los banners de la tienda y un servidor que
arranca y responde de forma segura.

## Alcance

- **Incluye:** la suscripción del software (MercadoPago), qué rubros tiene la instalación,
  los banners de la tienda (carrusel y cinta), la subida de imágenes y el comportamiento del servidor
  (salud, CORS, variables de entorno, diagnóstico del Administrador del sistema).
- **No incluye:** quién entra a cada pantalla ([permisos.md](permisos.md), [panel.md](panel.md)).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Dueño del software (vos) | Cobrar la suscripción, extenderla o fijarla, también sin ingresar (con la clave secreta). |
| Administrador del sistema | Ver y ajustar la suscripción. |
| Gerente general | Ver el estado de la suscripción, sus avisos y pagarla. |
| Rol con "Editar banners" | Carrusel, cinta e imágenes. |
| Visitante | Ver el home y la cinta. |

## Reglas

### Suscripción del software

| Código | Regla | Estado |
| --- | --- | --- |
| SIS-01 | Cada instalación tiene una suscripción con fecha de vencimiento. Su estado es: **activo** (faltan más de 10 días), **aviso** (faltan de 1 a 10), **gracia** (venció hace 10 días o menos) o **vencido** (más de 10). | ✅ `ux_rules.test.mjs` › "SIS-01: 10 días de gracia después del vencimiento…" |
| SIS-02 | Desde "aviso", el admin ve en el panel una franja con el estado y un acceso para pagar. | ⚠️ sin test |
| SIS-03 | El admin paga con MercadoPago el precio mensual configurado. Un pago aprobado extiende la suscripción 30 días; antes de extender, el servidor confirma el pago consultando a MercadoPago (no le cree al aviso que llega). | ⚠️ sin test |
| SIS-04 | Un mismo pago extiende la suscripción una sola vez, aunque MercadoPago avise varias veces. | ✅ `checkout.integration.mjs` › "SIS-04: el mismo pago avisado varias veces por MercadoPago extiende la suscripción una sola vez" |
| SIS-05 | Con el plan vencido, el personal (Gerente general incluido) no puede crear ni modificar nada desde el panel, con el aviso "Plan vencido. Renovalo para registrar nuevos datos."; sí puede ver, ingresar y pagar. La tienda sigue funcionando para los clientes y los visitantes. el Administrador del sistema nunca se bloquea. | ✅ `ux_rules.test.mjs` › "SIS-05: con el plan vencido se bloquea al personal…" |
| SIS-06 | Si no se puede consultar el estado de la suscripción, no se bloquea nada: un problema técnico no frena el negocio. | ⚠️ sin test |
| SIS-07 | El estado se consulta como mucho cada 5 minutos, para no despertar la base en cada pedido. | ⚠️ sin test |
| SIS-08 | el Administrador del sistema ve el estado y el historial de pagos, extiende días o fija una fecha. El dueño del software puede hacer lo mismo sin ingresar, con la clave secreta del servidor. | ⚠️ sin test |
| SIS-56 | Una instalación puede no cobrarse el software (`suscripcionDelSoftware: false` en `proyecto/client_config.js`, ej. un producto propio): no hay bloqueo, ni rutas `/api/suscripcion`, ni plan inicial, ni aviso, ni pantallas del plan. Sin ese dato queda prendida. | ✅ `core_roles.test.mjs` › "SIS-56: …" |

### Rubros de la instalación

| Código | Regla | Estado |
| --- | --- | --- |
| SIS-21 | Qué rubros tiene una instalación lo decide solo `gate_config.js` (código, tablas y menús). No hay interruptor en vivo: prender o apagar un rubro es un cambio de configuración y un nuevo despliegue. | ⚠️ sin test |

### Home de tienda y banners

| Código | Regla | Estado |
| --- | --- | --- |
| SIS-30 | El home de tienda (de la plantilla, ver SIS-53) muestra arriba el carrusel de promociones y, debajo, el inicio que aporta el rubro (su propia portada y productos). Sin rubro, el core muestra el nombre y la frase de la tienda, con "Ver catálogo" si hay tienda. Si los banners no cargan, el carrusel no aparece y la tienda se sigue viendo, sin mensaje de error. | ⚠️ sin test (revisado en capturas) |
| SIS-31 | El carrusel pasa solo cada 5 segundos (se frena con el mouse o el foco encima, y no se mueve si la persona pidió menos movimiento), tiene flechas, puntos y se desliza con el dedo. Con un solo banner no hay controles. | ⚠️ sin test (revisado en capturas) |
| SIS-32 | Un banner es de **carrusel** (imagen) o de **cinta** (texto en la franja superior, en todo el sitio). Ambos se cargan en "Banners y promociones". | ✅ `core_banners.test.mjs` › \"SIS-32: …\"; migración de la cinta vieja: `checkout.integration.mjs` › "SIS-32, SIS-34, SIS-39 y COR-10: …" |
| SIS-33 | Subir o borrar imágenes (a Cloudinary) lo puede hacer quien tiene "Editar banners" o "Editar artículos". | ⚠️ sin test |
| SIS-34 | Un banner se ve solo si está activo y hoy (hora de Argentina) está entre su "desde" y su "hasta", ambos incluidos. Sin "desde" vale desde ya; sin "hasta" no vence. | ✅ `core_banners.test.mjs` › \"SIS-34: …\"; `checkout.integration.mjs` › "SIS-32, SIS-34, SIS-39 y COR-10: …" |
| SIS-35 | El enlace de un banner solo puede ser una página de la tienda (empieza con "/") o un sitio `https://`. | ✅ `core_banners.test.mjs` › "SIS-35: …" |
| SIS-36 | El panel muestra cada banner con su estado: Vigente, Programado, Vencido o Inactivo. | ✅ `core_banners.test.mjs` › "SIS-34 y SIS-36: …" |
| SIS-37 | Ver los banners vigentes no pide ingresar; crearlos, editarlos, activarlos o borrarlos pide "Editar banners". | ✅ `core_api.test.mjs` › "SIS-37: …" (con el permiso: ⚠️) |
| SIS-38 | Las imágenes se piden a Cloudinary al ancho en que se muestran. | ⚠️ sin test |
| SIS-39 | Como máximo 8 banners de carrusel y 4 de cinta activos a la vez (los vencidos no cuentan); al pasarse: "Desactivá uno antes de sumar otro". | ✅ `checkout.integration.mjs` › "SIS-32, SIS-34, SIS-39 y COR-10: …" |
| SIS-50 | Un banner de carrusel puede tener una imagen vertical para el celular. Se usa si todos los banners del carrusel la tienen, para que todas las diapositivas midan lo mismo; si no, se recorta la de computadora. | ⚠️ sin test (revisado en capturas) |
| SIS-51 | Las columnas de texto únicas (persona, usuario, rol, permiso, módulo, catálogos) se declaran como índice con nombre fijo (`<tabla>_<columna>_key`): sincronizar los modelos varias veces no agrega restricciones repetidas ([cambio](../cambios/2026-11-indices-unicos.md)). | ✅ `ropa.integration.mjs` (Stilos) › "Arranque: sincronizar dos veces…" |
| SIS-52 | Después de sincronizar, el arranque borra las restricciones `<nombre>_key<N>` que repiten las mismas columnas que `<nombre>_key` en la misma tabla (solo en el schema del proyecto); deja la original. | ✅ `ropa.integration.mjs` (Stilos) › "SIS-52…" |

### Marco del sitio (barra, menú, pie e impresión)

El diseño del marco es el de MiPadel (pedido del dueño, 2026-11-17); los colores, el logo y las frases son de cada proyecto.

| Código | Regla | Estado |
| --- | --- | --- |
| SIS-53 | El home es de cada proyecto: la portada ("/") es `frontend/src/proyecto/inicio.jsx` y el core no trae uno. La plantilla de proyectos nuevos trae como punto de partida un home de tienda (banners, nombre y el inicio que aporte el rubro). | ✅ `core_estructura.test.mjs` › "SIS-53: …" |
| SIS-54 | La barra muestra el menú en forma de píldora desde 1024 px y, en celular, un menú lateral con la marca, los links y una tarjeta para ingresar o crear cuenta. Sus frases (`menuMovil` en `brand_config.js`: lema, título, texto y pie) son del proyecto; sin ellas se usan textos neutros. El logo puede ser imagen (`gc-mark`) o símbolo y nombre con acento (`simbolo-y-texto`). El panel ofrece "Ver tienda" si hay tienda y "Ver sitio" si no. | ⚠️ sin test (revisado en capturas) |
| SIS-55 | Al imprimir una página del sitio no salen la cinta, la barra, el aviso de suscripción ni el pie: solo el contenido. | ⚠️ sin test |
### Seguridad y API del core
| SIS-57 | Un rubro puede poner avisos para todo el sitio debajo de la barra (`avisosSitio` en sus pantallas, ej. "tu plan vence en 5 días"); cada aviso decide solo si se muestra. Al imprimir no salen. | ⚠️ sin test (lo cubren las pruebas del navegador de MiPadel) |

| Código | Regla | Estado |
| --- | --- | --- |
| COR-10 | Al arrancar, todas las tablas del schema quedan con RLS activado y, en Supabase, sin acceso para `anon` ni `authenticated`: la API REST de Supabase no puede leer ni escribir nada. Avisa si `BD_ESQUEMA=public`. | ✅ `core_seguridad.test.mjs`; `checkout.integration.mjs` › "SIS-32, SIS-34, SIS-39 y COR-10: …" |
| COR-20 | Una entrada inválida responde 400 `DATOS_INVALIDOS` con el primer error en español y la lista por campo; los errores esperados de un service (`ErrorApp`) responden con su código y estado. | ✅ `core_api.test.mjs` › "COR-20: …" |

### Servidor y despliegue

| Código | Regla | Estado |
| --- | --- | --- |
| SIS-40 | `/api/health` responde sin consultar la base, para que el chequeo de Render no la despierte; con `?bd=1` sí la revisa. | ✅ `despliegue.test.mjs` › "/api/health responde sin tocar la base" |
| SIS-41 | La API solo acepta pedidos desde la tienda configurada (aunque tenga "/" al final); otros orígenes reciben 403. | ✅ `despliegue.test.mjs` › "CORS acepta la tienda configurada…" |
| SIS-42 | Las variables pegadas en Render con comillas o espacios se limpian solas. | ✅ `despliegue.test.mjs` › "variables pegadas con comillas o espacios en Render se limpian" |
| SIS-43 | Si la dirección de la base está incompleta, el servidor no arranca y explica qué falta, sin mostrar el valor. | ✅ `despliegue.test.mjs` › "BD_URL con solo el host frena el arranque…" (variable `BD_URL_SUPABASE`) |
| SIS-44 | El revisor de `.env` avisa nombres viejos y valores de ejemplo, sin mostrar ningún valor. | ✅ `despliegue.test.mjs` › "verificar_env avisa nombres viejos y valores de ejemplo…" |
| SIS-45 | En producción, la web usa la API de DistribuCG y rechaza el dominio anterior antes de mandar credenciales. | ✅ `despliegue.test.mjs` › "la API de producción usa DistribuCG…"; "producción permite el frontend de DistribuCG…" |
| SIS-46 | El diagnóstico del Administrador del sistema (`npm run admin:verificar`) detecta usuario, contraseña y estados que impiden ingresar, sin devolver nunca la contraseña ni su hash. | ✅ `ropa.integration.mjs` › "Super admin (core)…" (Stilos) |
| SIS-47 | Variables de entorno con nombres claros: `CLAVE_SESIONES`, `URL_FRONTEND_VERCEL` (también es el origen permitido por CORS), `URL_API_RENDER`, `BD_URL_SUPABASE`, `BD_ESQUEMA`, `CLOUDINARY_NOMBRE_CUENTA`, `CLOUDINARY_CLAVE_API`, `CLOUDINARY_SECRETO_API`, `GOOGLE_ID_CLIENTE`. Los nombres anteriores se siguen leyendo, y el revisor de `.env` pide renombrarlos. Con base remota, SSL se activa solo. | ✅ `core_env.test.mjs` |
| SIS-48 | El Administrador del sistema se crea una sola vez con `SUPERADMIN_USUARIO` y `SUPERADMIN_CONTRASENA`; su email es fijo en el core (`SUPERADMIN_EMAIL_FIJO`), igual en todos los proyectos, para recuperar el acceso. Un deploy nunca pisa una contraseña existente. | ✅ `ropa.integration.mjs` › "Super admin (core)…" (Stilos) |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Precio mensual del software | variable `SOFTWARE_PRECIO` del servidor | `[COMPLETAR: confirmar en Render]` |
| Días de aviso y de gracia | `services/sistema/software_suscripcion_service.js` | 10 de aviso · 10 de gracia |
| Cada cuánto se revisa la suscripción | `middleware/suscripcion_middleware.js` | 5 minutos |
| Clave secreta del dueño del software | variable `SEED_SECRET` (header `x-seed-token`) | — |
| Qué módulos existen | `gate_config.js` | Distribuidora |
| Tope de banners activos | `services/sistema/banner_reglas.js` › `TOPE_ACTIVOS` | 8 de carrusel · 4 de cinta |
| Contactos del pie de página | `frontend/src/proyecto/config/home_config.js` › `HOME_CONTACTOS` | `[COMPLETAR]` por proyecto |

## Dónde está el código

- Servidor: suscripción en `routes/sistema/suscripcion_router.js` → `controllers/sistema/suscripcion_controller.js` →
  `services/sistema/software_suscripcion_service.js` y `mercadopago_service.js`, bloqueo en
  `middleware/suscripcion_middleware.js`; banners en `routes/sistema/banner_promocion_router.js` → `controllers/sistema/banner_promocion_controller.js` →
  `services/sistema/banner_promocion_service.js` (reglas en `banner_reglas.js`), imágenes en `routes/upload_router.js`;
  RLS en `database/seguridad_tablas.js`; validación en `middleware/validar.js` y errores en `services/common/errores.js`; salud y CORS en `app.js` y `routes/index.js`.
- Frontend: `controls/suscripcion/suscripcion_banner.jsx`, `modules/usuarios/admin/suscripcion_page.jsx`,
  `modules/usuarios/super_admin/` (suscripción), `modules/usuarios/admin/banners_page.jsx`, `modules/home/` (home y carrusel), `controls/layout/anuncios_banner.jsx` (cinta).

## Mejoras técnicas detectadas

- **Patrón viejo de errores:** suscripción, personal, permisos y recuperación todavía devuelven `{ ok: false }`
  con try/catch en el controller. Pasarlos a `validar` + `ErrorApp` cuando se toquen.

## Decisiones

| Fecha | Regla | Decisión | Quién |
| --- | --- | --- | --- |
| 2026-11-11 | SIS-47, SIS-48 | Menos variables y con nombres claros: una sola URL de la tienda (también CORS), super admin con usuario y contraseña y email fijo. Los nombres viejos se siguen leyendo para no romper proyectos ya desplegados. Hecho en Stilos y subido al core. | Dueño del proyecto |
| 2026-11-10 | SIS-20 a SIS-22 | Se retira "Módulos habilitados" (tabla `modulo_negocio`): era de otra idea de sistema. Queda solo `gate_config.js` (SIS-21). | Dueño del proyecto |
| 2026-11-10 | SIS-30 a SIS-50 | Home solo de tienda; banners con fechas cargados desde el panel; la cinta se unifica con el carrusel; tope 8 y 4; imagen opcional para celular. Spec: `cambios/2026-11-home-tienda.md`. | Dueño del proyecto |
| 2026-11-08 | SIS-05 | Con el plan vencido se bloquea el panel (el equipo no carga ni modifica nada, salvo pagar) y la tienda sigue vendiendo, para no cortarle las ventas al negocio. Se descartaron bloquear todo y no bloquear nunca. | Dueño del proyecto |
| 2026-11-08 | SIS-01 | 10 días de gracia: se cobra a mes vencido y el cliente paga en los primeros días del mes. | Dueño del proyecto |
| 2026-11-08 | SIS-04 | Arreglar el pago duplicado en la misma spec de cambio que SIS-05. | Dueño del proyecto |

## Preguntas abiertas

Ninguna.
