# Specs del rubro torneos (`torneos`)

Las reglas del negocio de MiPadel. Las del core (ingreso, usuarios, permisos, panel, sistema) están en
[../core/](../core/) y su índice en [../README.md](../README.md).

En las secciones "Dónde está el código", las rutas son relativas a la carpeta del rubro: `servidor/src/modulos/torneos/`,
`frontend/src/modules/torneos/` y `rubros/torneos/`.

## Códigos del rubro

Prefijo de tres letras por módulo y número correlativo. Un código **nunca se reutiliza**: si una regla
se elimina, queda tachada con su motivo.

| Prefijo | Spec | Qué cubre |
| --- | --- | --- |
| `TOR` | [torneos.md](torneos.md) | Torneo, estados, categorías, premios, reglamento, duplicar, exportar e imprimir |
| `INS` | [inscripciones.md](inscripciones.md) | Anotarse, invitar, confirmar, cupo, baja y pago de la inscripción |
| `JUE` | [zonas_y_llave.md](zonas_y_llave.md) | Formatos, zonas, tabla, desempates, llave y cronograma |
| `PUB` | [publico.md](publico.md) | Lista de torneos, ficha, resultados y participantes sin cuenta |
| `JUG` | [jugadores.md](jugadores.md) | Código de jugador, perfil, historial, campanita y correos |
| `SUS` | [suscripcion.md](suscripcion.md) | Plan del organizador, transferencias, MercadoPago y panel |

Ingreso, registro, usuarios, roles y permisos, panel y despliegue son del **core** (`../core/`). Cómo se conectó
MiPadel al core: [../cambios/2026-11-conectar-al-core.md](../cambios/2026-11-conectar-al-core.md).

## Resumen de la primera versión

| Spec | Reglas | ✅ con test | ⚠️ sin test | ❓ a decidir | 🚧 pendiente |
| --- | --- | --- | --- | --- | --- |
| TOR | 22 | 21 | 0 | 1 | 0 |
| INS | 19 | 16 | 2 | 1 | 0 |
| JUE | 24 | 23 | 1 | 0 | 0 |
| PUB | 10 | 8 | 1 | 1 | 0 |
| JUG | 10 | 9 | 0 | 0 | 1 |
| SUS | 14 | 13 | 1 | 0 | 0 |