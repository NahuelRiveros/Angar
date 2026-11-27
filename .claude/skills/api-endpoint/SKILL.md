---
name: api-endpoint
description: Crea o modifica endpoints REST (rutas, controllers y services) con permisos, validación Zod, consultas reutilizables del core y pruebas, siguiendo la ficha del servidor.
---

# Endpoint REST

Leer CLAUDE.md y la ficha docs/specs/core/servidor.md. Ejemplo completo: servidor/src/core/opcionales/pedidos/.
Rutas del rubro en servidor/src/modulos/<rubro>/ (registradas en `rutas` de su modulo.js); las del core, en
servidor/src/core/routes/index.js.

- Ruta: `requireAuth` / `optionalAuth`, `requirePermiso("x.y")` (por permiso, no por rol) y
  `validar({ body, params, query })` con esquemas Zod y mensajes en español. Rutas fijas antes de `/:id`.
- Controller: una línea por ruta con `datos(...)` o `hecho(codigo, mensaje, ...)` de
  controllers/common/responder.js. **Sin try/catch** ni `res.status(500)`: el manejador central responde.
  Lo validado llega en `req.datos` (nunca leer `req.body` crudo).
- Service: reglas y datos. Errores esperados con `ErrorApp`. Reutilizar services/common/consultas.js:
  `obtenerOFallar` (con `bloquear` dentro de una transacción), `exigirVersion`, `buscarTexto` / `contiene`
  (sin acentos y sin comodines), `paginar` / `paginarSql`, `quienLoHizo`, `sinRepetir`.
- SQL escrito a mano: los datos van siempre en `replacements` (`:nombre`); en el texto, solo nombres fijos.
- Plata, stock o varias tablas: transacción, bloqueo de fila y, si se reintenta, clave de idempotencia.
  Verificar que el recurso sea de quien lo pide aunque el id exista.
- Tablas nuevas del rubro con su propio prefijo (nunca cat_, ped_, stk_…), unidas por id a las del módulo.

Probar caso válido, entradas inválidas y permisos (401 / 403 / de otro dueño) con node:test y un servidor
HTTP efímero (`.use(manejarErrores)` de core/app.js); integración en un schema temporal de PostgreSQL local.
Correr npm --prefix servidor test y, si cambia la base, npm --prefix servidor run test:integration.
Informar método, ruta, permiso, entrada, respuesta y errores.
