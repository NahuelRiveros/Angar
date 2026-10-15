---
name: perf-audit
description: Analiza lentitud o consumo de recursos en DistribuCG, desde consultas PostgreSQL y polling hasta renders y tamaño del frontend.
---

# Auditoría de rendimiento

Leer CLAUDE.md y el flujo solicitado. Medir con datos sintéticos y base local aislada;
no ejecutar EXPLAIN ANALYZE ni activar logs detallados sobre producción como exploración.

- Consultas repetidas/N+1, asociaciones que multiplican filas, paginación, atributos y filtros.
- Pedidos: conservar carga de detalles en lote, transacciones, locks e idempotencia.
- Pool en servidor/src/database/sequelize.js y tareas periódicas: comprobar uso real.
  El listado de pedidos ya actualiza cada 30 segundos; medir antes de ajustar esa frecuencia.
- TanStack Query, invalidaciones y caché: evitar pedidos duplicados sin mostrar saldos obsoletos.
- Frontend: npm --prefix frontend run build, chunks, carga por ruta y renders del flujo.

Preferir consultas y cargas eficientes antes de cambios de estructura.
Si un índice o esquema nuevo fuera necesario, presentar evidencia y alcance concreto;
no aplicarlo sin que esté autorizado. No sacrificar exactitud de precio/stock/saldo por caché.

Informar hallazgos por impacto con medición antes/después si se implementó una mejora.
Si solo se inspeccionó código, distinguir oportunidades estimadas de problemas medidos.
