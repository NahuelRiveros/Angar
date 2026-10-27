---
name: feature
description: Implementa una funcionalidad de MiPadel que cruza API y frontend, desde el análisis del contrato hasta la verificación del flujo.
---

# Funcionalidad completa

Leer CLAUDE.md, docs/ del área y el código del flujo afectado.

Presentar objetivo, contrato de API, pantallas y archivos previstos. Identificar decisiones
de negocio pendientes y posibles cambios de esquema. Continuar con el alcance autorizado;
no exigir otra confirmación rutinaria del plan. Pedir una decisión únicamente si falta
información imprescindible o el cambio excede la autorización.

Implementar por dependencias:
- API: aplicar api-endpoint y ejecutar las pruebas pertinentes.
- Interfaz: aplicar react-component o crud-admin; reutilizar controls y config.
- Flujo crítico: aplicar e2e-test y comprobar las reglas de servidor afectadas.
- Cierre: aplicar pre-pr; informar resultado y cómo reproducir el flujo.

No importar infraestructura de tests del gimnasio ni iniciar el backend para validar documentos.
Si una prueba falla, determinar si el cambio la causó antes de extender el alcance.
