---
name: react-component
description: Crea o modifica componentes y pantallas React (tienda o panel) usando el kit del core, los colores del tema y TanStack Query, con los estados de carga, error y vacío y pensando en el celular.
---

# Componente o pantalla

Leer CLAUDE.md y la ficha del kit: docs/specs/core/componentes.md. **Si la pieza está en el kit, se usa esa.**

- Kit: frontend/src/core/controls/ui/ (ActionButton, Formulario, FilaLista, Pestanas, SelectorOpciones,
  ConfirmarConMotivo, Pasos, Etiqueta, Precio, SearchField, campos, Modal, Pagination, SegunConsulta…),
  utils/ (formatearPrecio, linkWhatsapp, formatearFechaHora, mostrarErrores) y hooks/ (useFiltrosUrl).
- Lo que sirve a dos o más proyectos va al kit; lo de un solo negocio, al rubro (frontend/src/modules/<rubro>/).
- Colores: solo variables del tema (`bg-(--kt-teal-700)`, `text-(--kt-ink-soft)`) o grises `slate-*`. Nunca
  `bg-[#…]` ni colores en `style`: lo frena tests/core_kit.test.mjs. Ver docs/specs/core/estilos.md.
- Datos: API en `api.js` con http.js y hooks de TanStack Query en `hooks.js`; nada de fetch en el componente.
  Invalidar lo afectado al guardar. Sin consultas periódicas.
- Siempre los tres estados: cargando, error con reintentar y vacío. Formularios con `Formulario` (React Hook
  Form + Zod): errores del servidor en su campo y un envío a la vez.
- JavaScript/JSX (nunca TypeScript), archivos snake_case, componentes PascalCase, textos en español rioplatense.
- Accesibilidad y celular: labels, foco, tocables de 44 px, sin desborde en 320 px de ancho.

Verificar lint y build. Para comportamiento nuevo, Playwright con API simulada en tests/browser/
(sin Vitest, MSW ni Testing Library). Si cambia algo visual, capturas en escritorio y celular.
