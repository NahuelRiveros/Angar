# Cambio: el personal se da de alta con usuario y contraseña

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| Hecho | Dueño del proyecto | 2026-11-12 | [core/permisos.md](../core/permisos.md) |

## Por qué

Para sumar a alguien del equipo hoy se pide email y documento obligatorios. Mucha gente del local no tiene (o
no quiere dar) un email de trabajo; lo natural es darle un usuario y una contraseña. El email sirve solo para
que pueda recuperar la contraseña por su cuenta.

## Requisitos

| Código | Requisito | Estado |
| --- | --- | --- |
| PER-34 | **Alta con usuario.** En "Personal", un integrante nuevo se crea con usuario, contraseña, nombre y apellido (obligatorios) y rol. Email y documento son opcionales. El usuario sigue las reglas de siempre (3 a 30: letras, números, punto, guion o guion bajo; sin distinguir mayúsculas) y no se puede repetir. Con ese usuario ingresa por la misma pantalla de ingreso. | ✅ |
| PER-35 | **Editar.** Al editar se puede cambiar el usuario, el nombre, el apellido y, opcionales, el email y el documento; dejar el email vacío lo borra. Si el email o el documento ya son de otra persona, se avisa. La lista de "Personal" muestra el usuario. | ✅ |
| PER-36 | **Recuperar la contraseña.** Con email cargado, la persona la recupera sola ("Olvidé mi contraseña"); sin email, se la cambia un administrador desde "Personal" (como hasta ahora). El formulario lo explica. | ✅ |

**Fuera de alcance:** cambiar cómo se registran los clientes (siguen con email), pedir el usuario a quienes ya
existen (los que no tienen usuario siguen entrando con su email).

## Diseño

- **API:** `POST /api/admin/staff` y `PUT /api/admin/staff/:id` reciben `nombre_usuario`; `email` y `documento`
  pueden venir vacíos. La lista devuelve el usuario.
- **Base de datos:** sin cambios (`usuario.nombre_usuario`, `persona.email` y `persona.documento` ya admiten vacío).
- **Pantallas:** `core/controls/modales/staff_form_modal.jsx` (usuario arriba, email y documento marcados
  "opcional") y la tabla de `staff_page.jsx`.

## Tareas

1. [x] Servidor: alta y edición con usuario; email y documento opcionales (tests de integración).
2. [x] Frontend: formulario y lista.
3. [x] `node scripts/verificar.mjs --completo` en verde y captura del formulario.
4. [x] Pasar las reglas a `core/permisos.md`, subir el core a CoreSistem y marcar este cambio como hecho.

## Decisiones

| Fecha | Regla | Decisión | Quién |
| --- | --- | --- | --- |
| 2026-11-12 | PER-34 a PER-36 | Usuario, contraseña, nombre y apellido obligatorios; email y documento opcionales. Se hace en Stilos y se sube a CoreSistem. | Dueño del proyecto |
