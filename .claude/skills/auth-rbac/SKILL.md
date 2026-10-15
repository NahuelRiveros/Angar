---
name: auth-rbac
description: Modifica login, registro, recuperación de contraseña, sesión y autorización por rol o propietario en DistribuCG.
---

# Autenticación y permisos

Leer servidor/src/middleware/auth_middleware.js, services/usuarios/ y
services/common/auth_tokens.js antes de cambiar el contrato.

El middleware verifica JWT HS256, usuario activo/no eliminado, versión de contraseña
y roles actuales desde la base. No sustituir esta comprobación por confiar solo en roles
embebidos en un token. El usuario autenticado está en req.user.usuario_id/persona_id/roles.

- Validar permiso por rol, propietario y módulo habilitado.
- Pedidos: orderConfig.managementRoles; otras áreas: su router/configuración.
- Recuperación: prueba de posesión mediante token temporal de un solo uso; no aceptar un email
  como autorización para reemplazar la contraseña. Preservar invalidación de sesiones.
- Evitar enumerar cuentas o devolver hashes; respetar rate limits y respuestas públicas.
- Frontend: auth/auth_context.jsx, api/http.js y controls/acceso/protected_route.jsx.
  Conservar auth:expired, retorno interno seguro y carrito invitado al iniciar sesión.
- Registro y catálogo públicos dependen de client_config.js; no habilitarlos por accidente.

Probar éxito/error, token vencido o invalidado, 401, 403, revocación de rol y recurso ajeno
según lo modificado. Usar ux_rules.test.mjs, checkout.integration.mjs y Playwright
según la capa; pruebas con SMTP simulado, sin enviar mensajes reales.
