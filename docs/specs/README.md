# Especificaciones de MiPadel (SDD)

Acá vive **qué tiene que hacer** MiPadel, escrito en lenguaje del negocio. Cada regla tiene un código
(`TOR-03`, `JUE-14`…) que también va en el nombre del test que la comprueba: buscando el código en el
proyecto se encuentran juntas la regla, su test y su implementación.

> Estado (2026-11-17): primera versión, escrita a partir del código y los tests que ya existen. Los
> tests todavía no llevan el código de la regla en su nombre; cada regla dice cuál la cubre. Lo que
> está marcado ❓ espera una respuesta del dueño (sección "Preguntas abiertas" de cada spec).

## Dos tipos de spec

| Tipo | Dónde | Cuándo se escribe | Molde |
| --- | --- | --- | --- |
| **De módulo** | `torneos/<tema>.md` (y `core/<modulo>.md` cuando llegue el core) | Una vez; se actualiza cuando cambia una regla | [_plantilla_modulo.md](_plantilla_modulo.md) |
| **De cambio** | `cambios/AAAA-MM-<nombre>.md` | Antes de programar cada trabajo nuevo | [_plantilla_cambio.md](_plantilla_cambio.md) |

## Cómo se trabaja

1. **Spec de cambio.** Qué se quiere (requisitos con código), cómo (API, tablas, pantallas) y en qué
   pasos. Las decisiones de negocio se marcan ❓ y se le preguntan al dueño.
2. **Aprobación.** El dueño lee la spec y la aprueba. Sin esto no se programa.
3. **Tests primero.** Un test por requisito, con su código en el nombre.
4. **Código** hasta que los tests pasan.
5. **Cierre.** Las reglas nuevas o cambiadas pasan a la spec del módulo; la de cambio queda como historia.

Una pregunta ❓ se responde en el chat o escribiendo en la línea **Respuesta:** debajo de ella.

## Estado de cada regla

| Marca | Significa |
| --- | --- |
| ✅ | Cubierta: un test la comprueba (se indica cuál). |
| ⚠️ | El código la cumple pero ningún test la prueba: candidata a test nuevo. |
| ❌ | El código **no** la cumple: es un error a corregir. |
| ❓ | Decisión de negocio sin confirmar. |
| 🚧 | Escrita y aprobada, todavía no programada. |

## Códigos

Prefijo de tres letras por módulo y número correlativo. Un código **nunca se reutiliza**: si una regla
se elimina, queda tachada con su motivo.

| Prefijo | Spec | Qué cubre |
| --- | --- | --- |
| `TOR` | [torneos/torneos.md](torneos/torneos.md) | Torneo, estados, categorías, premios, reglamento, duplicar, exportar e imprimir |
| `INS` | [torneos/inscripciones.md](torneos/inscripciones.md) | Anotarse, invitar, confirmar, cupo, baja y pago de la inscripción |
| `JUE` | [torneos/zonas_y_llave.md](torneos/zonas_y_llave.md) | Formatos, zonas, tabla, desempates, llave y cronograma |
| `PUB` | [torneos/publico.md](torneos/publico.md) | Lista de torneos, ficha, resultados y participantes sin cuenta |
| `JUG` | [torneos/jugadores.md](torneos/jugadores.md) | Código de jugador, perfil, historial, campanita y correos |
| `SUS` | [torneos/suscripcion.md](torneos/suscripcion.md) | Plan del organizador, transferencias, MercadoPago y panel |

Ingreso, registro, usuarios, roles y permisos, panel y despliegue son del **core**: sus specs
(`core/usuarios.md`, `core/permisos.md`, `core/panel.md`, `core/sistema.md`) llegan con la migración
al core ([cambios/](cambios/)).

## Resumen de la primera versión

| Spec | Reglas | ✅ con test | ⚠️ sin test | ❓ a decidir | 🚧 pendiente |
| --- | --- | --- | --- | --- | --- |
| TOR | 22 | 21 | 0 | 1 | 0 |
| INS | 19 | 16 | 2 | 1 | 0 |
| JUE | 24 | 23 | 1 | 0 | 0 |
| PUB | 10 | 8 | 1 | 1 | 0 |
| JUG | 10 | 9 | 0 | 0 | 1 |
| SUS | 14 | 13 | 1 | 0 | 0 |
