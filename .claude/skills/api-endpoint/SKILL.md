---
name: api-endpoint
description: Crea o modifica endpoints REST de DistribuCG con autorización, validación, servicios y pruebas compatibles con el backend Express existente.
---

# Endpoint REST

Leer CLAUDE.md y un router/controller/service cercano.
Para distribuidora usar servidor/src/modulos/eccomerce_distribuidora/{routes,controllers,services}/
y registrar la ruta en `rutas` de su modulo.js. Las rutas del core van en servidor/src/core/routes/index.js.

- Ruta: requireAuth/optionalAuth, requirePermiso (no por rol) y validar({ body, params }) con esquemas Zod en español. Controller delgado sin try/catch; el service lanza ErrorApp (ver servidor/src/core/*/_scaffold y banners).
  Catálogo público depende de clientConfig; gestión de pedidos de orderConfig.managementRoles.
  Poner rutas fijas antes de /:id.
- Validar body, query y params con utilidades existentes, sin asumir Zod ni req.datos.
- Servicio: negocio y acceso a datos; allowlist de campos, atributos explícitos, SQL parametrizado,
  paginación y orden permitido. Evitar N+1.
- Operaciones de dinero, carrito o varias tablas: conservar transacciones, locks e idempotencia.
  Verificar acceso al recurso aunque su id exista.
- Controlador: adaptar HTTP y conservar { ok, data, mensaje, codigo, ... }.
  Mantener el manejo de errores existente; no eliminar try/catch sin revisar app.js.
- Si falta estructura de datos, concretar el cambio necesario antes de salir del alcance autorizado.

Probar caso válido, entradas inválidas y permisos relevantes (401/403/propietario).
Usar node:test y el patrón de servidor HTTP efímero de tests/checkout.integration.mjs;
no asumir Supertest. Integración solo sobre su schema temporal local.
Ejecutar desde la raíz npm --prefix servidor test y, si corresponde y está disponible
PostgreSQL local, npm --prefix servidor run test:integration.
Para nuevos archivos de tests, incluirlos en el script o ejecutarlos explícitamente.
Informar método, ruta, permisos, entrada, respuesta y errores.
