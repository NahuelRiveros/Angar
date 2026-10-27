---
name: security-audit
description: Audita seguridad de MiPadel cuando se solicita una revisión de permisos, datos, autenticación, dependencias o exposición de información; informa hallazgos sin modificar código.
---

# Auditoría de seguridad

Leer CLAUDE.md y el alcance solicitado. Revisar código y contratos; no hacer pruebas
contra servicios reales ni leer archivos .env. Si se piden correcciones, aplicarlas en ese alcance.

Priorizar:
- SQL parametrizado, allowlists de orden/campos y validación de entradas.
- Roles, propietario del recurso y módulo habilitado, incluso en exportaciones e importaciones.
- JWT, versión de contraseña, revocación de roles, recuperación y rate limits.
- Dueño del torneo, suscripción vigente, transacciones e idempotencia de pagos y resultados.
  La suscripción se cobra con MercadoPago (webhook) o a mano por el super admin; validar ambos caminos.
- Datos sensibles en respuestas/logs, HTML no confiable, URLs y redirects externos.
- CORS, headers y límites/tipos de archivos importados o subidos.
- Seguimiento de archivos sensibles en git sin imprimir sus valores; reportar ruta y tipo,
  redactar cualquier secreto encontrado accidentalmente. VITE_* nunca debe contener secretos.
- Dependencias: npm --prefix frontend audit --omit=dev y npm --prefix servidor audit --omit=dev
  si hay acceso de red; informar cuando no se puedan verificar.

Distinguir fallos demostrables, hipótesis y controles ya existentes.
Para cada hallazgo: gravedad, archivo:línea, condición de explotación y corrección concreta.
Una búsqueda con comodines SQL no equivale por sí sola a inyección.
Cambios necesarios de esquema o de operación deben explicarse por separado.
