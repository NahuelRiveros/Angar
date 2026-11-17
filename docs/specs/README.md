# Especificaciones (SDD)

Acá vive **qué tiene que hacer** el sistema, escrito antes que el código. Cada regla tiene un
código (`USU-03`, `PED-12`…) que también aparece en el test que la comprueba: buscando el código
en el proyecto se encuentran juntas la regla, su test y su implementación.

## Dos tipos de spec

| Tipo | Dónde | Cuándo se escribe | Molde |
| --- | --- | --- | --- |
| **De módulo** | `core/<modulo>.md` o `<rubro>/<tema>.md` | Una vez; se actualiza cuando cambia una regla | [_plantilla_modulo.md](_plantilla_modulo.md) |
| **De cambio** | `cambios/AAAA-MM-<nombre>.md` | Antes de programar cada trabajo nuevo | [_plantilla_cambio.md](_plantilla_cambio.md) |

`core/` vale para cualquier proyecto que use esta base (login, usuarios, permisos, panel). Cada
rubro tiene su carpeta (`eccomerce_distribuidora/`): al copiar la base para otro rubro, se borra.

## Cómo se trabaja

1. **Spec de cambio.** Se escribe qué se quiere (requisitos con código), cómo (API, tablas,
   pantallas) y en qué pasos. Las decisiones de negocio se marcan ❓ y se le preguntan al dueño.
2. **Aprobación.** El dueño del proyecto lee la spec y la aprueba. Sin esto no se programa.
3. **Tests primero.** Un test por requisito, con su código en el nombre. Al principio fallan.
4. **Código** hasta que los tests pasan (`node scripts/verificar.mjs`).
5. **Cierre.** Las reglas nuevas o cambiadas pasan a la spec del módulo y la de cambio queda
   como historia (estado: hecha).

## Cómo se responde una pregunta ❓

En el chat, o escribiendo en la línea **Respuesta:** debajo de la pregunta, en la sección
"Preguntas abiertas" de la spec (sirve para que la conteste el cliente). Después la respuesta pasa
a la tabla "Decisiones" con su fecha, la regla se actualiza y, si cambia código, se escribe su
spec de cambio.

## Estado de cada regla

| Marca | Significa |
| --- | --- |
| ✅ | Cubierta: un test la comprueba (se indica cuál). |
| ⚠️ | El código la cumple pero ningún test la prueba: candidata a test nuevo. |
| ❌ | El código **no** la cumple: es un error a corregir (se indica dónde). |
| ❓ | Decisión de negocio sin confirmar: la tiene que validar el dueño o el cliente. |
| 🚧 | Escrita y aprobada, todavía no programada. |

## Códigos

Prefijo de tres letras por módulo y número correlativo de dos cifras. Un código **nunca se
reutiliza**: si una regla se elimina, queda tachada con su motivo. En el test va al principio:

```js
test("USU-02: login con email o nombre de usuario, sin distinguir mayúsculas", async () => { … });
```

| Prefijo | Spec |
| --- | --- |
| `USU` | [core/usuarios.md](core/usuarios.md) |
| `PER` | [core/permisos.md](core/permisos.md) |
| `PAN` | [core/panel.md](core/panel.md) |
| `SIS` | [core/sistema.md](core/sistema.md) |
| `PED` | [eccomerce_distribuidora/pedidos.md](eccomerce_distribuidora/pedidos.md) |
| `COB` | [eccomerce_distribuidora/cobros.md](eccomerce_distribuidora/cobros.md) |
| `CAR` | [eccomerce_distribuidora/carrito.md](eccomerce_distribuidora/carrito.md) |
| `PRE` | [eccomerce_distribuidora/precios.md](eccomerce_distribuidora/precios.md) |
| `CAT` | [eccomerce_distribuidora/catalogo.md](eccomerce_distribuidora/catalogo.md) |
| `CLI` | [eccomerce_distribuidora/clientes.md](eccomerce_distribuidora/clientes.md) |
