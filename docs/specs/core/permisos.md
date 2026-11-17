# Módulo: permisos y personal (`PER`)

## Objetivo

Que cada persona del equipo pueda hacer solo lo que su trabajo necesita, y que el dueño decida
desde el panel, sin programar, qué puede hacer cada rol.

## Alcance

- **Incluye:** roles y permisos, la pantalla "Roles y permisos", la pantalla "Personal" (altas,
  bajas, contraseñas y rol del equipo) y el control de permisos en el servidor.
- **No incluye:** ingresar al sistema ([usuarios.md](usuarios.md)), qué secciones del panel ve
  cada uno (spec del panel) ni qué hace cada permiso dentro de un rubro (spec de cada rubro).

## Actores

| Quién | Qué puede hacer acá |
| --- | --- |
| Administrador del sistema (`super_admin`) | Todo, incluido crear, editar o quitar gerentes generales. No aparece en "Personal". Es quien mantiene la plataforma. |
| Gerente general (`admin`) | Todo, salvo tocar a otros gerentes generales o al Administrador del sistema. |
| Rol con "Gestionar personal" | Altas, bajas, contraseñas y rol de quienes no son gerente general. |
| Rol con "Roles y permisos" | Crear y borrar roles y elegir sus permisos. |
| Encargado (`supervisor`), Vendedor y roles creados en el panel | Solo lo que tengan tildado. |
| Cliente | Nada del personal: no es un rol del equipo. |

## Permisos que existen

Forman una sola lista (`permisosConfig`): los del core se escriben en `core/permisos_config.js` y los de los rubros del
proyecto en `proyecto/permisos_rubros.js`.
"De entrada" = quién lo recibe la primera vez que el permiso aparece en la base; después manda el panel.

| Permiso | Grupo | Qué habilita | De entrada | Requiere |
| --- | --- | --- | --- | --- |
| `contenido.editar` ("Editar banners") | Contenido de la tienda | Carrusel del inicio, cinta de anuncios e imágenes | nadie | — |
| `usuarios.gestionar` | Equipo | Altas, bajas, contraseñas y rol del personal | nadie | — |
| `permisos.gestionar` | Equipo | Crear roles y elegir sus permisos | nadie | — |
| `pedidos.ver` … `clientes.ver` | Pedidos, Cobros, Catálogo, Clientes | Los 7 de la distribuidora | ver la spec del rubro | — |

## Reglas

### Quién tiene qué

| Código | Regla | Estado |
| --- | --- | --- |
| PER-01 | El Gerente general y el Administrador del sistema tienen todos los permisos siempre; en "Roles y permisos" aparecen con todo tildado y no se pueden editar. | ✅ `ux_rules.test.mjs` › "permisos: admin y super admin tienen todo; el resto, solo lo asignado y conocido" |
| PER-02 | Cualquier otro rol tiene solo los permisos tildados para él, y solo los que el sistema conoce. | ✅ mismo test que PER-01 |
| PER-03 | Una pantalla o acción que pide varios permisos se habilita con uno solo, salvo que diga que pide todos (la importación pide "Editar artículos" y "Cambiar precios"). | ✅ `ux_rules.test.mjs` › "panel de gestión: cada uno ve las secciones de sus permisos…"; `storefront.spec.js` › "rol sin permiso de precios…" |
| PER-04 | El servidor controla cada permiso en cada acción: ocultar un botón no alcanza, pedirlo directo a la API también se rechaza ("No tenés permiso para esta acción."). | ✅ `checkout.integration.mjs` › "HTTP: cliente no gestiona notas y el supervisor sí, con sus permisos" |
| PER-05 | Quitar un permiso a un rol tiene efecto en el próximo pedido de esas personas, sin que vuelvan a ingresar. | ⚠️ sin test |

### Roles

| Código | Regla | Estado |
| --- | --- | --- |
| PER-10 | Se crean roles desde el panel con un nombre de 3 a 40 caracteres. No puede repetirse ni usar el nombre de un rol del sistema. | ✅ `storefront.spec.js` › "roles y permisos: dependencias al tildar, guardar juntos, crear y borrar roles"; `checkout.integration.mjs` › "permisos: sincronización sin pisar el panel, staff → supervisor, roles nuevos…" |
| PER-11 | Tildar un permiso suma los que requiere; destildarlo quita los que dependen de él. Los cambios del rol se guardan juntos. | ✅ `storefront.spec.js` › mismo test que PER-10 |
| PER-12 | Solo se borran roles creados desde el panel y sin personas asignadas; si tiene personas, se avisa cuántas y que antes hay que cambiarles el rol. | ✅ `storefront.spec.js` › mismo test que PER-10 |
| PER-13 | Los roles del sistema (Administrador del sistema, Gerente general, Encargado, Vendedor, Cliente) no se borran. El rol "profesional", que quedó del gimnasio, se borra al arrancar si nadie lo tiene; si alguien lo tiene, se conserva y se avisa en el registro del servidor. | ✅ `checkout.integration.mjs` › "PER-13: el arranque borra el rol profesional si nadie lo tiene…" (que no se borren los del sistema: ⚠️) |
| PER-14 | Los roles del sistema se muestran como Administrador del sistema, Gerente general, Encargado, Vendedor y Cliente: nunca "admin" ni "super admin". El nombre vive en `permisosConfig.nombresRol` y, si cambia, se actualiza en la base al arrancar. El código interno (`super_admin`, `admin`, `supervisor`) no cambia. | ✅ `core_roles.test.mjs` › "PER-14: …" (la actualización en la base: ⚠️) |
| PER-37 | Un rubro puede declarar en `proyecto/permisos_rubros.js` sus propios roles sin permisos del personal (`ROLES_DE_RUBROS.fuera`: código y nombre, ej. jugador y organizador) y el rol de quien se registra (`alRegistrarse`). Esos roles se crean solos al arrancar, no aparecen en el panel de permisos ni en Personal, y su sesión dura como la de un cliente. Sin declararlos, solo existe `cliente`. | ✅ `core_roles.test.mjs` › "PER-37: …" |

### Personal

| Código | Regla | Estado |
| --- | --- | --- |
| PER-20 | Para dar de alta a alguien se piden email, contraseña de 8 a 72 caracteres (la misma regla que los clientes, USU-11), nombre, apellido y documento (solo números); el email y el documento no pueden estar repetidos. Lo mismo al cambiarle la contraseña. Las contraseñas de antes siguen sirviendo para ingresar. | ✅ `checkout.integration.mjs` › "PER-20: el personal necesita 8 caracteres…"; `ux_rules.test.mjs` › "PER-20: la contraseña del personal sigue la misma regla…" (email y documento repetidos: ⚠️) |
| PER-21 | Solo el Administrador del sistema crea un Gerente general, le cambia la contraseña, lo activa o desactiva, lo borra o le da o quita ese rol. | ⚠️ sin test |
| PER-22 | El rol Administrador del sistema no se asigna desde ningún lado, y el rol cliente no se asigna desde "Personal". | ⚠️ sin test |
| PER-23 | Nadie puede borrarse a sí mismo. | ⚠️ sin test |
| PER-24 | Borrar a alguien del personal es una baja: deja de poder ingresar y sale de la lista, pero su historial (pedidos, cobros registrados) se conserva. | ⚠️ sin test |
| PER-25 | Los Administradores del sistema no aparecen en la lista de "Personal". | ⚠️ sin test |
| PER-26 | Ningún camino de la API permite dar los roles Gerente general o Administrador del sistema por fuera de estas reglas: no existe `/api/admin/usuarios`; el alta pasa solo por "Personal". | ✅ `ux_rules.test.mjs` › "PER-26: la API no tiene /admin/usuarios…" |

### Sincronización al arrancar

| Código | Regla | Estado |
| --- | --- | --- |
| PER-30 | Al arrancar, la lista de permisos de la base queda igual a la del código. Un permiso nuevo se da a sus roles "de entrada"; lo que se tildó o destildó en el panel no se pisa. | ✅ `checkout.integration.mjs` › "permisos: sincronización sin pisar el panel…" |
| PER-31 | Un permiso que se saca del código se borra de la base junto con sus asignaciones. Por eso los permisos de un rubro se cuentan aunque el rubro esté apagado. | ✅ mismo test que PER-30 (la parte del rubro apagado: ⚠️) |
| PER-32 | El rol viejo "staff" se renombra "supervisor" conservando sus personas y permisos. | ✅ mismo test que PER-30 |
| PER-33 | Todos los permisos (core y rubros) forman una sola lista: los del core en `core/permisos_config.js` y los de los rubros en `proyecto/permisos_rubros.js`; la lista no cambia de códigos, grupos, orden ni roles de entrada. | ✅ `ux_rules.test.mjs` › "PER-33: todos los permisos en permisos_config.js…" |
| PER-34 | En "Personal", un integrante nuevo se crea con usuario, contraseña, nombre y apellido (obligatorios) y rol; email y documento son opcionales. El usuario no se repite (sin distinguir mayúsculas) y con él ingresa ([cambio](../cambios/2026-11-personal-con-usuario.md)). | ✅ `ropa.integration.mjs` (Stilos) › "PER-34 a PER-36 (core)…" |
| PER-35 | Al editar se cambian usuario, nombre, apellido y, opcionales, email y documento (vacío lo borra); repetidos se avisan. La lista muestra el usuario. | ✅ `ropa.integration.mjs` (Stilos) › "PER-34 a PER-36 (core)…" |
| PER-36 | Con email, la persona recupera la contraseña sola; sin email, se la cambia un administrador desde "Personal". El formulario lo explica. | ✅ `ropa.integration.mjs` (Stilos) › "PER-34 a PER-36 (core)…"; pantalla: capturas |

## Configuración

| Qué | Dónde | Valor actual |
| --- | --- | --- |
| Roles con todo | `core/permisos_config.js` › `rolesTotales` | Administrador del sistema, Gerente general |
| Roles que no son del personal | `core/permisos_config.js` › `rolesFuera` | cliente |
| Qué rol tiene cada permiso | Base de datos (`rol_permiso`), se edita en `/admin/permisos` | — |

## Dónde está el código

- Servidor: `middleware/auth_middleware.js` (`requirePermiso`, carga de roles y permisos en cada pedido);
  `routes/usuarios/permisos_router.js` y `staff_router.js` → `services/usuarios/permisos_service.js` y
  `admin_staff_service.js`; sincronización en `database/seed/seed_rbac.js`.
- Frontend: `modules/usuarios/admin/permisos_page.jsx` y `staff_page.jsx`; `controls/acceso/acceso.js`
  (`cumpleAcceso`) para mostrar u ocultar según permisos.

## Decisiones

| Fecha | Regla | Decisión | Quién |
| --- | --- | --- | --- |
| 2026-11-08 | PER-26 | Borrar `POST` y `GET /api/admin/usuarios`: nadie las usa y la primera permitía crear un super admin. Se descartó agregarles el control de "Personal". | Dueño del proyecto |
| 2026-11-10 | PER-14 | Nombres profesionales: Administrador del sistema, Gerente general, Encargado, Vendedor, Cliente. Secciones del panel "Gestión" y "Configuración". Se cambia solo el nombre visible; el código interno queda para no cerrar las sesiones abiertas. | Dueño del proyecto |
| 2026-11-08 | PER-20 | El personal también necesita 8 caracteres como mínimo. Las contraseñas actuales siguen sirviendo: se exige solo al crear o cambiar. | Dueño del proyecto |
| 2026-11-08 | PER-13 | Sacar el rol "profesional", revisando antes que nadie lo tenga. | Dueño del proyecto |
| 2026-11-08 | — | Todos los permisos (core y rubros) en un solo archivo, `permisos_config.js`, con un bloque por rubro. Se descartó tenerlos en dos archivos: para un proyecto nuevo se borra el bloque del rubro a mano. | Dueño del proyecto |
| 2026-11-10 | COR-04 | Al separar el core (CoreSistem), los permisos de los rubros pasan a `proyecto/permisos_rubros.js`: así el core se copia sin el bloque de la distribuidora y un proyecto nuevo no borra nada a mano. Siguen formando una sola lista con los mismos códigos (PER-33). | Dueño del proyecto (separar el core) |

## Preguntas abiertas

Ninguna.
