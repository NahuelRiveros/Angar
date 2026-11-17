# Módulo: usuarios (`USU`)

## Objetivo

Que cada persona entre al sistema con una cuenta propia y segura: el cliente para comprar y
seguir sus pedidos, el personal para trabajar en el panel.

## Alcance

- **Incluye:** ingreso con email o usuario, ingreso con Google, registro de clientes,
  recuperación de contraseña, duración y cierre de la sesión, límites de intentos y los datos de
  facturación de cada persona.
- **No incluye:** qué puede hacer cada rol una vez adentro (permisos y panel, specs propias) ni los
  datos de entrega ni cuándo se piden los de facturación (lo decide cada rubro, ej. el primer pedido).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Visitante | Registrarse, ingresar, recuperar su contraseña |
| Cliente y personal | Ingresar, salir, recuperar su contraseña |
| Admin | Dar de alta, bajar o desactivar cuentas del personal (spec de permisos) |

## Reglas

### Ingreso

| Código | Regla | Estado |
| --- | --- | --- |
| USU-01 | Se ingresa con email **o** nombre de usuario en el mismo campo, sin distinguir mayúsculas. Con "@" se trata como email; sin "@", como usuario. Con el campo vacío se pide \"Ingresá tu email o usuario.\" sin buscar ninguna cuenta. | ✅ `checkout.integration.mjs` › "login con email o nombre de usuario, sin distinguir mayúsculas"; `ux_rules.test.mjs` › "login distingue email de nombre de usuario…" |
| USU-02 | Con datos incorrectos se muestra "Email, usuario o contraseña incorrectos", sin decir cuál de los dos falló. | ✅ `storefront.spec.js` › "inicia sesión con nombre de usuario y muestra el error de credenciales" |
| USU-03 | Una cuenta dada de baja recibe el mismo mensaje que una contraseña incorrecta. | ⚠️ sin test |
| USU-04 | Una cuenta desactivada o una persona cargada sin usuario recibe el mismo mensaje que USU-02, también al ingresar con Google: nadie puede averiguar si una cuenta existe. Por qué no entra alguien del personal lo ve el admin en "Personal". | ✅ `checkout.integration.mjs` › "USU-04, USU-06 y USU-09: mensaje genérico, 30 días de sesión para clientes y 24 h para el personal" |
| USU-05 | Más de 10 intentos en 15 minutos desde la misma IP para la misma cuenta se frenan con "Demasiados intentos. Intentá en 15 minutos." | ⚠️ sin test |
| USU-06 | La sesión de un cliente dura 30 días; la de quien tiene cualquier rol del personal, 24 horas. Después hay que volver a ingresar. | ✅ `checkout.integration.mjs` › "USU-04, USU-06 y USU-09: mensaje genérico, 30 días de sesión para clientes y 24 h para el personal"; `ux_rules.test.mjs` › "USU-06 y USU-09: …" |
| USU-07 | Cambiar la contraseña cierra todas las sesiones abiertas con la contraseña anterior. | ⚠️ sin test |
| USU-09 | Una sesión abierta como cliente deja de valer si esa persona pasa a tener un rol del personal: tiene que volver a ingresar. | ✅ `checkout.integration.mjs` › "USU-04, USU-06 y USU-09: mensaje genérico, 30 días de sesión para clientes y 24 h para el personal"; `ux_rules.test.mjs` › "USU-06 y USU-09: …" |
| USU-08 | Después de ingresar se vuelve a la página interna de donde se venía, con sus filtros; nunca a otro sitio ni otra vez al login. Sin página previa, va al catálogo. | ✅ `ux_rules.test.mjs` › "redirecciones internas conservan filtros y rechazan otros orígenes y login" |

### Registro

| Código | Regla | Estado |
| --- | --- | --- |
| USU-10 | Registrarse solo es posible si la instalación tiene el registro público habilitado. | ⚠️ sin test |
| USU-11 | Se piden nombre, apellido, email válido y contraseña de 8 a 72 caracteres. | ⚠️ sin test |
| USU-12 | No puede haber dos cuentas con el mismo email: "Ya existe una cuenta con ese email". | ⚠️ sin test |
| USU-13 | El nombre de usuario es opcional: 3 a 30 caracteres entre letras, números, punto, guion y guion bajo (sin "@"), se guarda en minúsculas y no puede repetirse. La pantalla avisa si ya está en uso. | ✅ `checkout.integration.mjs` › "registro con usuario opcional: guarda en minúsculas, rechaza repetido e inválido"; `storefront.spec.js` › "registro con usuario opcional muestra si ya está en uso…" |
| USU-14 | Toda cuenta creada por registro (o la primera vez con Google) recibe el rol de `permisosConfig.rolAlRegistrarse`: `cliente`, salvo que el rubro declare otro en `proyecto/permisos_rubros.js` (PER-37). | ⚠️ sin test |
| USU-15 | Más de 5 registros por hora desde la misma IP se frenan. | ⚠️ sin test |
| USU-16 | Lo que el visitante tenía en el carrito se conserva al registrarse o ingresar. | ✅ `storefront.spec.js` › "el cliente conserva carrito al registrarse…" (detalle en la spec del carrito) |
| USU-43 | Quien se registra sin venir de otra página va al destino que declare el rubro (`registro.destino` en su `modulo.js`, ej. su perfil de bienvenida); sin rubro que lo declare, al destino de siempre. Si venía de otra página, vuelve ahí. | ⚠️ sin test (revisado en el navegador) |

### Ingreso con Google

| Código | Regla | Estado |
| --- | --- | --- |
| USU-20 | El botón "Continuar con Google" aparece solo si la instalación tiene Google configurado. | ⚠️ sin test |
| USU-21 | Se rechaza una cuenta de Google con el email sin verificar: se le pide ingresar con email y contraseña. | ✅ `checkout.integration.mjs` › "Google: crea cliente, vincula por email verificado y rechaza credenciales dudosas" |
| USU-22 | Si ya existe una cuenta con ese email, se vincula a Google; si esa cuenta ya estaba vinculada a otro Google, se rechaza. | ✅ mismo test que USU-21 |
| USU-23 | Si no existe la cuenta (y el registro público está habilitado), se crea como cliente con una contraseña al azar que nadie conoce. | ✅ mismo test que USU-21 |
| USU-24 | Los errores de Google se muestran en pantalla y, si Google no carga, se ofrece reintentar. | ✅ `storefront.spec.js` › "continuar con Google envía la credencial, muestra errores y si Google no carga ofrece reintentar" |
| USU-25 | Una cuenta de Google sin apellido completa sus datos antes de su primer pedido. | ✅ `checkout.integration.mjs` › "sin apellido (cuenta de Google)…"; `storefront.spec.js` › "cliente de Google sin apellido…" |

### Recuperación de contraseña

| Código | Regla | Estado |
| --- | --- | --- |
| USU-30 | Al pedir la recuperación, la respuesta es la misma exista o no la cuenta: "Si existe una cuenta con ese email, recibirás un enlace…". | ⚠️ sin test |
| USU-31 | Si la instalación no tiene correo configurado, se avisa "La recuperación por email no está disponible. Contactá a la empresa." | ⚠️ sin test |
| USU-32 | El enlace vence a los 20 minutos. | ✅ `ux_rules.test.mjs` › "recuperación vence y deja de servir después del cambio de contraseña" |
| USU-33 | El enlace sirve una sola vez: después de cambiar la contraseña deja de funcionar, y el ingreso acepta la nueva. | ✅ `checkout.integration.mjs` › "enlace de recuperación se utiliza una vez y el login acepta la nueva clave" |
| USU-34 | La nueva contraseña cumple lo mismo que en el registro (8 a 72 caracteres). | ⚠️ sin test |
| USU-35 | Una cuenta desactivada o dada de baja no puede recuperar: el enlace se informa como no válido. | ⚠️ sin test |
| USU-36 | Más de 5 pedidos o cambios por hora desde la misma IP se frenan. | ⚠️ sin test |

### Datos de facturación

| Código | Regla | Estado |
| --- | --- | --- |
| USU-40 | Cada persona puede tener **un** juego de datos de facturación (condición frente al IVA, CUIT o DNI, razón social y domicilio fiscal). Son opcionales: el registro no los pide y se completan cuando el sistema los necesita. Cada uno ve y edita solo los suyos (`GET` y `PUT /api/perfil/fiscal`, con sesión). | ✅ `core_api.test.mjs` › "USU-40: …" (guardar contra la base: ⚠️) |
| USU-41 | Los datos se validan con `core/fiscal_config.js`, igual que en la web: CUIT con dígito verificador (DNI solo para consumidor final), guardado como `20-12345678-6`; razón social vacía = se factura a nombre y apellido. | ✅ `core_api.test.mjs` › "USU-41: …" |
| USU-42 | El documento de la persona es opcional: un cliente que se registra no lo carga (antes se inventaba uno). Si se carga, no puede repetirse. | ⚠️ sin test con base |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Registro público | `client_config.js` › `auth.publicRegistration` | Sí, con la tienda activa |
| Largo de la contraseña | `client_config.js` › `auth.passwordMinLength` / `passwordMaxLength` | 8 a 72 |
| Vencimiento del enlace de recuperación | `client_config.js` › `auth.resetMinutes` | 20 minutos |
| Duración de la sesión | `client_config.js` › `auth.sesionClienteDias` / `sesionPersonalHoras` | 30 días clientes · 24 horas personal |
| Ingreso con Google | variables `GOOGLE_ID_CLIENTE` (servidor) y `VITE_GOOGLE_ID_CLIENTE` (web); los nombres anteriores se siguen leyendo | Configurado |
| Límites de intentos | `servidor/src/core/routes/usuarios/auth_router.js` | Ingreso 10 / 15 min · registro 10 / hora · recuperación 5 / hora |

## Dónde está el código

- Servidor: `routes/usuarios/auth_router.js` → `controllers/usuarios/auth_controller.js` →
  `services/usuarios/auth_service.js` y `password_recovery_service.js`; reglas en
  `services/common/nombre_usuario.js` y `auth_tokens.js`; sesión en `middleware/auth_middleware.js`; forma de la
  entrada en `services/usuarios/auth_esquemas.js` (Zod); datos de facturación en `routes/usuarios/perfil_router.js` →
  `services/usuarios/perfil_fiscal_service.js` (tabla `persona_fiscal`).
- Frontend: `modules/usuarios/login_page.jsx`, `register_page.jsx`, `recovery_page.jsx`;
  textos en `config/auth_config.js`; redirecciones en `controls/acceso/return_to.js`.

## Decisiones

| Fecha | Regla | Decisión | Quién |
| --- | --- | --- | --- |
| 2026-11-10 | USU-40 a USU-42 | Datos de facturación 1:1 por persona y en el core (sirven a cualquier sistema que facture); documento opcional, sin inventar uno al registrarse. | Dueño del proyecto (recomendación aceptada) |
| 2026-11-08 | USU-04 | Mensaje genérico para todos (clientes y personal), también con Google. Se descartó mostrar "Usuario inactivo" porque revela que la cuenta existe. | Dueño del proyecto |
| 2026-11-08 | USU-06 | Clientes 30 días, personal 24 horas. Se descartaron 24 horas para todos (el cliente que compra cada semana tenía que volver a ingresar) y 7 días. | Dueño del proyecto |

## Preguntas abiertas

Ninguna.
