# Frontend de DistribuCG

Leer primero `../CLAUDE.md`. Este archivo complementa la guía raíz.

## Comandos (desde frontend)

`npm run dev`, `npm run lint`, `npm run build`, `npm run preview`,
`npm run test:e2e`. No hay runner de tests unitarios frontend configurado.
Playwright usa `tests/browser/`, API simulada y Vite en el puerto 4178;
ver `playwright.config.js`. No requiere el backend ni una base de datos.

## Arquitectura real

- `src/app/router.jsx` reúne las rutas de `src/app/routes/`.
- `src/modules/eccomerce_distribuidora/` contiene catálogo, administración, perfil,
  carrito, pedidos y sus APIs. Mantener el identificador `eccomerce_distribuidora` tal como está.
- `src/controls/ui/` contiene primitivas reutilizables. `controls/carrito/` y
  `controls/pedidos/` reciben datos/adapters; no acoplarlos a endpoints del rubro.
- `src/hooks/` es para hooks compartidos. Buscar también los del módulo antes de duplicar.
- `src/api/http.js` adjunta el token salvo `publicAccess`; ante 401 elimina el token
  y emite `auth:expired` excepto para login. Preservar el retorno interno seguro
  de `controls/acceso/return_to.js`.
- `src/auth/auth_context.jsx` maneja sesión; `controls/acceso/protected_route.jsx`
  controla acceso visual. El backend debe verificar los permisos por separado.

## Configuración y diseño

Los archivos raíz `client_config.js`, `gate_config.js` y `order_config.js` se comparten
con el backend. No duplicar sus valores en pantallas.
Identidad, colores y contenidos en `src/config/brand_config.js`, `theme_config.js`,
`home_config.js` y `storefront_config.js`; navegación en `config/navbar_config/`.
Reutilizar tokens CSS y controles antes de agregar estilos o componentes.
El skill de diseño está en `.agents/skills/frontend-design/` y también en
`../.claude/skills/frontend-design/` para Claude. Aplicarlo respetando la marca existente.

## Datos y reglas de negocio

Leer `../docs/distribuidora-pedidos.md` para carrito, snapshots, estados y cobros.
El catálogo puede ser público según configuración; enviar y gestionar tienen permisos propios.
Los pedidos no descuentan stock y los cobros son registros manuales de dinero recibido.
Conservar reintentos idempotentes y errores dentro del flujo de la acción.
Usar React Hook Form y Zod para formularios, TanStack Query donde corresponda,
y el adapter existente para persistencia del carrito.
Cubrir carga, error, vacío, teclado y anchos de 320, 390 y 1440 px.

`VITE_API_URL` controla la API. El fallback actual de producción en `src/api/http.js`
todavía apunta a dynamic-gym; verificar la configuración efectiva antes de un despliegue.
No asumir mismo origen ni modificar ese destino durante tareas de documentación.
