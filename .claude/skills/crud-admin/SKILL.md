---
name: crud-admin
description: Construye o adapta listados y formularios del panel (alta, edición, baja) para una entidad, con permisos, filtros en la dirección, páginas y confirmaciones, usando el kit del core.
---

# Administración de una entidad

Leer CLAUDE.md, la pantalla más parecida y las fichas docs/specs/core/componentes.md y servidor.md.
Ejemplo completo a copiar: el panel de productos del catálogo (frontend/src/core/opcionales/catalogo/admin/).

- Listado: `Pantalla` + `Encabezado`, `SearchField`, `Pestanas` (filtros con cantidad), `SegunConsulta`
  (cargando / error / vacío), `Lista` + `FilaLista`, `Pagination`. Filtros en la dirección con `useFiltrosUrl`.
- Formulario: `Formulario` (con `barra` si la pantalla es larga) para alta y edición; `version` para no pisar
  cambios de otra persona (el servidor responde CAMBIO_SIMULTANEO).
- Confirmar lo que no se deshace con `ConfirmDialog`; lo que pide motivo, con `ConfirmarConMotivo`.
- Desactivar, dar de baja y borrar son cosas distintas: seguir el contrato del service.
- Permisos concretos por acción (`requirePermiso("x.ver")`, `"x.editar"`), también en el menú y la ruta.
- Si falta la operación en el servidor, aplicar api-endpoint.

Probar en el servidor reglas y permisos; el flujo, con Playwright y API simulada. Capturas en celular.
