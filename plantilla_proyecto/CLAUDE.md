# [COMPLETAR nombre del proyecto]

[COMPLETAR: qué es el negocio y qué resuelve el sistema, en dos líneas.] Hecho sobre **CoreSistem**: el core
(usuarios, permisos, panel, módulos opcionales, kit de componentes) viene de ahí y este proyecto suma su
**rubro** (`frontend/src/modules/<rubro>/`, `servidor/src/modulos/<rubro>/`, `rubros/<rubro>/`).

## Reglas

- **JavaScript ESM, nunca TypeScript.** Archivos `snake_case`, componentes `PascalCase`, dominio en español.
- Trabajo por specs: `docs/specs/README.md`. Cada regla tiene código y aparece en su test. Decisiones de negocio
  (precios, estados, permisos, pagos) → preguntar y anotarlas en la spec.
- **El core no se edita acá sin subirlo**: lo que se mejore en archivos del core (`core_lista.txt`) se sube con
  `node scripts/core_subir.mjs`; lo nuevo del core se trae con `node scripts/core_traer.mjs --traer`.
  `node scripts/core_estado.mjs` muestra si está al día. Los `package.json` son de este proyecto.
- Lo del cliente vive en `proyecto/` y `frontend/src/proyecto/` (marca, colores, estilo, textos, URLs, módulos).

## Cómo se arma

- **Web:** con el kit del core (`docs/specs/core/componentes.md`): `Formulario`, `FilaLista`, `Pestanas`,
  `SelectorOpciones`, `Etiqueta`, `Precio`, `SegunConsulta`… Colores solo del tema (`--kt-*`, `slate-*`), nunca
  `bg-[#…]`. Datos con TanStack Query (hooks), nada de fetch en componentes. Los tres estados (cargando, error con
  reintentar, vacío) y pensado para el celular.
- **Aspecto:** `estilo` y `themeConfig` en `frontend/src/proyecto/config/theme_config.js` (`docs/specs/core/estilos.md`).
- **Servidor:** capas `rutas → controllers → services` (`docs/specs/core/servidor.md`): rutas con `requirePermiso`
  y `validar` (Zod); controllers con `datos`/`hecho`, sin try/catch; services con `ErrorApp` y las consultas de
  `services/common/consultas.js`. SQL siempre con `replacements`. Plata y stock dentro de transacciones.
- **Módulos del core** (catálogo, stock, pedidos…): se prenden en `proyecto/gate_config.js`
  (`docs/specs/core/modulos.md`). Datos propios del rubro en tablas con su prefijo, unidas por id.
- [COMPLETAR: reglas propias del rubro, o "ver el skill del rubro en .claude/skills/".]

## Verificar

- `node scripts/verificar.mjs --rapido` → tests y lint (lo corre el hook pre-commit).
- `node scripts/verificar.mjs` → además build. `--completo` suma integración (PostgreSQL local) y Playwright.
- No leer `.env*`. No commitear ni pushear sin confirmación.
