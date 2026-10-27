# Frontend de MiPadel

Leer primero `../CLAUDE.md`. Este archivo complementa la guía raíz.

## Comandos (desde frontend)

`npm run dev`, `npm run lint`, `npm run build`, `npm run preview`,
`npm run test:e2e`. No hay runner de tests unitarios frontend configurado.
Playwright usa `tests/browser/`, API simulada y Vite en el puerto 4178;
ver `playwright.config.js`. No requiere el backend ni una base de datos.

## Arquitectura real

- `src/app/router.jsx` reúne las rutas de `src/app/routes/`: el sitio (`AppLayout`)
  y el panel de gestión (`PanelLayout`).
- Pantallas del rubro en `src/modules/` (torneos va en `modules/torneos/`, con su `api/`).
- `src/controls/ui/` contiene primitivas reutilizables; no acoplarlas a endpoints.
- `src/hooks/` es para hooks compartidos. Buscar también los del módulo antes de duplicar.
- `src/api/http.js` adjunta el token salvo `publicAccess`; ante 401 elimina el token
  y emite `auth:expired` excepto para login. Preservar el retorno interno seguro
  de `controls/acceso/return_to.js`.
- `src/auth/auth_context.jsx` maneja sesión; `controls/acceso/protected_route.jsx`
  controla acceso visual. El backend debe verificar permisos y dueño por separado.

## Configuración y diseño

Los archivos raíz `client_config.js` y `permisos_config.js` se comparten con el backend.
No duplicar sus valores en pantallas.
Identidad, colores y contenidos en `src/config/brand_config.js`, `theme_config.js`,
`home_config.js` y `footer_config.js`; navegación en `config/navbar_config/`.
El logo hoy es de texto (`controls/brand/logo_marca.jsx`) hasta tener uno propio.
Reutilizar tokens CSS y controles antes de agregar estilos o componentes.
El skill de diseño está en `.agents/skills/frontend-design/` y también en
`../.claude/skills/frontend-design/` para Claude. Aplicarlo respetando la marca existente.

## Datos

Usar React Hook Form y Zod para formularios y TanStack Query para datos.
Cubrir carga, error con reintentar, vacío, teclado y anchos de 320, 390 y 1440 px.

`VITE_API_URL` controla la API. Las direcciones públicas de respaldo viven en
`../deployment_config.js` (hoy de EJEMPLO, a completar con las reales).
`src/api/api_url.js` valida la URL durante el build y al crear el cliente HTTP.
Revisar las variables de Vercel, que tienen prioridad sobre el respaldo. No asumir mismo origen.
