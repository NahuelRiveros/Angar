---
name: react-component
description: Crea o modifica componentes y pantallas React de DistribuCG respetando controles compartidos, configuración de marca, datos y accesibilidad.
---

# Componente o pantalla

Leer CLAUDE.md y frontend/CLAUDE.md. Buscar primero en frontend/src/controls/.
- Primitiva reusable sin negocio: controls/ui/.
- Pantalla o componente del rubro: modules/eccomerce_distribuidora/ y su subárea.
- API de distribuidora: modules/eccomerce_distribuidora/api/ usando api/http.js.
- Hooks compartidos: hooks/; respetar hooks y adapters existentes del módulo/carrito.

Usar JavaScript/JSX, archivos snake_case y componentes PascalCase.
Para consultas/mutaciones usar TanStack Query cuando encaje con el patrón existente,
invalidando los datos afectados. No duplicar la persistencia del carrito.
Hooks antes de returns; estados cargando, vacío, error recuperable y guardado pendiente.
Formularios con React Hook Form/Zod cuando corresponda; errores visibles junto a la acción.
Reutilizar modal, confirm_dialog, campos y data_grid. Mantener tokens y configuración de marca.
Comprobar labels, teclado, foco y comportamiento móvil.

Verificar lint/build del frontend según el cambio. Para comportamiento significativo,
extender tests/browser/ con Playwright y API simulada; no inventar renderizar(), MSW o Vitest.
No agregar pruebas que solo reproduzcan texto o estructura de una edición menor.
