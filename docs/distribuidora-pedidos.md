# Catálogo, carrito y notas de pedido

## Flujo de negocio

1. Un visitante puede ver y buscar productos, elegir presentación y cantidad y armar su carrito.
2. El carrito invitado se conserva en ese navegador. Al ingresar o registrarse se combina con el carrito de la cuenta.
3. Antes de enviar se completan los datos de entrega y se revisan productos, cantidades y total.
4. El servidor vuelve a validar disponibilidad, precios y cantidades. Crea una nota con un snapshot y vacía el carrito en la misma transacción.
5. El equipo encuentra la nota en **Distribuidora · Gestión → Notas de pedido**, revisa disponibilidad, precios y entrega y la pasa a **Confirmado**. Después coordina la entrega y registra los cobros recibidos.
6. El cliente consulta el estado y saldo en **Mi cuenta → Mis pedidos**. Mientras la nota siga en **Recibido** puede cancelarla indicando un motivo, o elegir **Cancelar y volver a armar**: sus productos vuelven al carrito al precio de hoy, ajustados a lo disponible, y se le informa lo que no entró. No puede editar una nota enviada.

No hay pasarela de pago. Registrar un cobro declara dinero ya recibido por efectivo, transferencia u otro medio; anular ese registro no devuelve dinero. Los registros se conservan para auditoría.

Enviar la nota **no reserva stock**: la disponibilidad se comprueba al agregar y enviar. El stock de las presentaciones con “controla stock” **se descuenta al pasar a Confirmado** y se devuelve si la nota sale de los estados con stock (`stockStates`: Confirmado, En preparación, Entregado) volviendo a Recibido o cancelándose. Si no alcanza, la confirmación se rechaza indicando qué falta. `nota_pedido.stock_descontado` registra si la nota tiene stock restado; las notas anteriores a este cambio quedan en `false`, así que cancelarlas no devuelve stock que nunca se descontó. Los importes y datos de entrega de una nota enviada permanecen iguales aunque se edite después el producto o el perfil.

## Estados y cobros

El recorrido habitual es **Recibido → Confirmado → En preparación → Entregado**. Un pedido recibido, confirmado o en preparación puede cancelarse. Se permite volver un paso atrás (Confirmado → Recibido, En preparación → Confirmado, Entregado → En preparación) y reabrir una cancelación volviendo a recibido. El comprador solo cancela en los estados de `buyerCancelableStates` (Recibido); su motivo queda en el historial como “Cancelado por el cliente: …”.

Retroceder, cancelar o reabrir requiere motivo. Se guarda estado anterior/nuevo, fecha y usuario. Si dos operadores actúan a la vez, se verifica el estado que vio cada uno antes de modificarlo.

El cobro es un eje separado: **Sin cobros / Cobro parcial / Cobrado**. Por defecto se puede preparar o entregar a cuenta. No se admite registrar un importe mayor al saldo, ni un cobro nuevo sobre una nota cancelada.

Las notas anteriores a este cambio no tienen historial retrospectivo inventado. Los cobros antiguos sin método se muestran como “Medio no informado”. Una nota cancelada con cobros necesita resolución comercial externa; su dinero no desaparece al cambiar el estado.

## Dónde personalizar para otro cliente

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `gate_config.js` (raíz) | Habilitar módulos por instalación |
| `client_config.js` (raíz) | Cliente activo, registro público y políticas compartidas de carrito |
| `order_config.js` (raíz) | Roles de gestión, etiquetas, transiciones, motivos y medios de cobro |
| `frontend/src/config/brand_config.js` | Logo, nombre, fuentes e identidad por cliente |
| `frontend/src/config/theme_config.js` | Colores mediante tokens; CSS mantiene valores de base |
| `frontend/src/config/home_config.js` | Contenido comercial de cada cliente |
| `frontend/src/config/navbar_config/` | Enlaces y grupos según sesión, rol y módulo |
| `frontend/src/config/storefront_config.js` | Rutas y textos comerciales del pedido |
| `frontend/src/config/auth_config.js` | Textos y destinos de acceso |
| `frontend/src/controls/ui/` | Campos, cantidades, búsqueda, paginación, botones y modales |
| `frontend/src/controls/carrito/` | Persistencia invitada y sincronización mediante adapter |
| `frontend/src/controls/pedidos/` | Resumen de importes y formulario de cobro manual |

Para un nuevo cliente se agrega su identidad/contenido/tema y se selecciona su id en `client_config.js`. Mantener nombres internos de estados existentes evita dejar notas antiguas sin interpretar; se pueden cambiar las etiquetas sin migrar datos.

`paymentRequiredStates: []` permite entrega a cuenta. Por ejemplo, `["entregado"]` exige **algún cobro** antes de entregar; no significa pago total.

Los controles aceptan datos y callbacks; no llaman a endpoints de distribuidora. El adapter del carrito proporciona `get, add, update, remove, clear, merge, product`. Un módulo nuevo debe adaptar sus entidades a ese contrato y mantener su almacenamiento separado.

Esta base permite compartir interfaz entre rubros; turnos de kinesiología, membresías de gimnasio e inventario tienen reglas distintas y conservan sus módulos. Cambiar config no convierte automáticamente una tienda en un sistema de turnos. Copiar el repositorio tampoco sincroniza futuras mejoras: conviene mantener un repositorio base y versiones revisadas del núcleo, o extraer después controles/config a paquetes versionados. Aplicar una actualización exige ejecutar las pruebas del cliente receptor.

## Integridad y reintentos

- Cantidades enteras con límites y stock verificados en servidor.
- Cambios de cantidad agrupados durante 400 ms, con vista inmediata y restauración si falla el guardado. Se serializan escrituras y se espera su confirmación antes de revisar el pedido.
- Locks en PostgreSQL serializan el carrito y el envío, incluso con varios procesos.
- Fusión, envío y registro de cobro incluyen una clave UUID. `operacion_carrito` conserva solicitud/resultado para responder a reintentos sin duplicar operaciones.
- Un pedido con respuesta incierta se recupera desde el mismo navegador/pestaña usando “Consultar o reintentar envío”.
- Un cobro con respuesta incierta conserva importe y referencia: “Verificar registro pendiente” consulta la misma operación.
- No borrar registros de idempotencia como mantenimiento rutinario: permitiría reproducir solicitudes antiguas. Una política futura de retención debe definir también cuánto tiempo acepta reintentos la API.
- El carrito de invitado se guarda por navegador; no sincroniza dispositivos. Evitar editar el mismo borrador invitado desde varias pestañas simultáneamente.

La gestión consulta páginas de hasta 50 notas, permite buscar por número, nombre, apellido o email y filtrar estado comercial/cobro. Se actualiza cada 30 segundos y al terminar una acción. Los detalles de productos, cobros e historial se cargan en lote para no multiplicar las filas del resultado.

## Puesta en marcha

El backend incorpora `nota_pedido_estado_log`, `operacion_carrito` y las columnas `metodo` y `anulacion_motivo` de `nota_pedido_pago`, además de la presentación y los datos de entrega usados por el snapshot. El bootstrap existente sincroniza los modelos al detectar cambios. Reiniciar el backend y publicar frontend/backend de la misma versión después de verificar la actualización contra una copia de la base. No se ejecutó bootstrap sobre la base de negocio durante estas pruebas.

El backend también incorpora `nota_pedido.stock_descontado` (booleano, `false` por defecto), que el bootstrap agrega al detectar el cambio del modelo.

Los permisos de gestión predeterminados son `admin`, `staff` y `vendedor`, aplicados tanto en rutas como en API. `POST /distribuidora/notas-pedido/:id/cancelar` no exige rol: solo encuentra notas del usuario de la sesión. El catálogo público puede deshabilitarse en config; agregar, enviar y gestionar requieren las autorizaciones correspondientes.

Recuperar una contraseña usa un enlace temporal y de un solo uso, no un email como autorización para reemplazarla. Sin correo configurado el formulario informa indisponibilidad. El envío real de email necesita validarse con el proveedor de la instalación. Cambiar contraseña invalida sesiones anteriores; los tokens antiguos sin versión de contraseña requieren iniciar sesión nuevamente.

## Avisos por correo

`services/distribuidora/avisos_pedido_service.js` envía, siempre después de confirmar la transacción:

| Evento | Destinatarios | Contenido |
| --- | --- | --- |
| Pedido nuevo | Equipo: usuarios activos con un rol de `orderConfig.managementRoles` y email, sin repetir | Cliente, contacto, detalle, total y enlace a la gestión |
| Pedido nuevo | Comprador | Detalle, total, entrega y enlace a "Mis pedidos" |
| Cambio de estado (gestión) | Comprador | Nuevo estado; el motivo solo si es una cancelación (los demás son internos) |
| Cancelación del comprador | Equipo | Motivo y enlace al pedido |

Un mail que falla no deshace ni frena el pedido: queda en el log del servidor. El reintento de un envío con la misma clave de idempotencia no repite avisos, y un cambio al mismo estado tampoco. Los textos están en `avisos_pedido_plantillas.js` y escapan todo lo que escribe el cliente.

Proveedor: con `CLAVE_API_BREVO` se usa la API HTTPS de Brevo (**obligatorio en Render gratis, que bloquea los puertos SMTP**); `CORREO_REMITENTE` debe estar verificado en Brevo y `NOMBRE_REMITENTE` es el nombre visible. Sin Brevo se usa el SMTP de `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`, útil en desarrollo local. `VERCEL_FRONTEND_URL` arma los enlaces. Sin ninguno de los dos, no se envía nada y se registra un aviso en el log. Las pruebas vacían estas variables y simulan Brevo: nunca envían correos reales.

## Verificación

Desde `servidor`:

```powershell
npm test
npm run test:integration
```

La integración usa exclusivamente PostgreSQL local y crea un schema temporal `codex_ux_test_<uuid>`. No utiliza Neon, no ejecuta bootstrap y elimina únicamente ese schema al terminar. Necesita la conexión local configurada y permiso de crear schemas.

Desde `frontend`:

```powershell
npm run build
npm run test:e2e
```

Las pruebas Playwright usan Chromium y API simulada para validar navegación, registro con carrito, cantidades concurrentes, fallas de catálogo y gestión manual en 1440, 390 y 320 px. Instalar el navegador con `npx playwright install chromium` si no está disponible.

Las pruebas PostgreSQL verifican reglas reales, concurrencia, snapshots, idempotencia, estados, cobros y recuperación. Las pruebas de pantalla y de datos son complementarias: no sustituyen una prueba de despliegue con las credenciales y servicios del cliente.
