---
name: crud-admin
description: Construye o adapta listados y formularios administrativos de MiPadel para entidades existentes, con permisos, filtros, paginación y confirmaciones.
---

# Administración de una entidad

Leer CLAUDE.md, la pantalla más cercana y frontend/src/hooks/use_crud_page.js.
Reutilizar controles de frontend/src/controls/ui/ y servicios comunes del servidor.

Definir listado, detalle y operaciones requeridas sin inventar capacidades de borrado.
Mantener permisos concretos de cada router; los permisos de un área no son una regla global
para todas las entidades. Aplicar api-endpoint si falta una operación.

Listado paginado con límites, orden permitido, búsqueda y filtros; conservar filtros
en navegación cuando corresponda. Usar debounce para búsquedas y TanStack Query si encaja.
Un formulario reutilizable para alta/edición; validación y errores del servidor visibles.
Confirmar acciones destructivas con confirm_dialog; cubrir carga, vacío, error y envío.
Desactivar, borrar y anular tienen efectos distintos: seguir el contrato del servicio.

Verificar reglas y autorización en servidor; interacción con Playwright cuando cambie el flujo.
Usar los comandos de CLAUDE.md. No suponer una suite de Testing Library o MSW instalada.
