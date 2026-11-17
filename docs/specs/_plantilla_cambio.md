# Cambio: [nombre corto]

> Copiar a `cambios/AAAA-MM-<nombre>.md`. Se escribe ANTES de programar y se aprueba antes
> de pasar a los tests. Borrar esta nota.

| Estado | Pedido por | Fecha | Spec del módulo |
| --- | --- | --- | --- |
| Borrador / Aprobada / En curso / Hecha | [quién] | [AAAA-MM-DD] | [enlace] |

## Por qué

[El problema del negocio que resuelve, contado como lo contaría el cliente.]

## Requisitos

Códigos nuevos del módulo (seguir la numeración de su spec). Cada uno verificable con un test.

| Código | Requisito | Estado |
| --- | --- | --- |
| XXX-10 | [Cuando … entonces …] | 🚧 |
| XXX-11 | [ … ] | ❓ [decisión pendiente: opciones y recomendación] |

**Fuera de alcance:** [lo que se decidió no hacer ahora].

## Diseño

- **API:** [método y ruta, quién puede llamarla (permiso), qué recibe y qué devuelve].
- **Base de datos:** [tablas o columnas nuevas; si no hay cambios, decirlo].
- **Pantallas:** [qué se agrega o cambia; estados de carga, error con reintentar y vacío; celular].
- **Configuración:** [parámetros nuevos y su valor inicial, marcados `[COMPLETAR]` si falta el dato].

## Tareas

1. [ ] Tests de los requisitos (fallan al principio).
2. [ ] [Servidor: …]
3. [ ] [Frontend: …]
4. [ ] `node scripts/verificar.mjs --completo` en verde.
5. [ ] Pasar las reglas a la spec del módulo y marcar este cambio como hecho.

## Riesgos

- [Qué podría salir mal: datos existentes, concurrencia, permisos, costo en Neon/Render.]
