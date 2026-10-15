---
name: pre-pr
description: Revisa cambios de DistribuCG antes de un commit o PR y selecciona verificaciones pertinentes, sin publicar ni commitear automáticamente.
---

# Preparar cambios para revisión

Leer CLAUDE.md. Examinar git status, git diff y git diff --cached, incluyendo archivos nuevos.
No incorporar ni revertir cambios ajenos.

Seleccionar comprobaciones según el diff:
- Frontend JS/JSX: npm --prefix frontend run lint y npm --prefix frontend run build.
- Reglas compartidas/backend: npm --prefix servidor test.
- Persistencia/concurrencia: npm --prefix servidor run test:integration solo en PostgreSQL local.
- Flujo de interfaz crítico: npm --prefix frontend run test:e2e con los archivos afectados.
- Solo instrucciones/configuración del agente: validar Markdown, frontmatter, JSON y rutas;
  no levantar servidores ni ejecutar toda la aplicación sin necesidad.

Revisar permisos, contratos HTTP, reglas comerciales, secretos, depuración accidental,
artefactos de build/tests y cambios de esquema fuera del alcance.
Distinguir la sincronización del schema temporal de tests del bootstrap de la base real.
Actualizar CLAUDE.md si cambiaron comandos o estructura.

Comunicar qué pasó y qué no pudo ejecutarse; no ocultar fallos previos ni ampliar el alcance
para arreglarlos automáticamente. Si se solicita revisión independiente, usar code-reviewer.
Preparar mensaje de commit/PR en español. Commit, push y publicación requieren instrucción
del usuario; una autorización explícita existente no necesita repetirse.
