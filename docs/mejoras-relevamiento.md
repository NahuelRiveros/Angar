# Relevamiento de mejoras (octubre 2026)

Respuestas del cliente a las preguntas sobre cómo mejorar el sistema, punto por punto,
qué ya está hecho y qué falta. Los montos y datos marcados como **provisorio**,
**EJEMPLO** o **[COMPLETAR]** hay que confirmarlos con el cliente antes de publicar.

Última actualización: 23/10/2026.

## Decisiones y estado

| # | Tema | Qué se decidió | Estado |
|---|---|---|---|
| 1 | Avisos de pedidos | Mail al personal que puede ver pedidos por cada pedido nuevo, además de verlo en el panel. | ✅ Hecho (falta configurar Brevo) |
| 2 | Confirmación al comprador | Mail al hacer el pedido (con el detalle) y en cada cambio de estado. El de cancelación incluye el motivo. | ✅ Hecho (falta configurar Brevo) |
| 3 | Cómo se confirma una compra | Nuevo estado **Confirmado**: Recibido → Confirmado → En preparación → Entregado. Cancelado desde cualquiera de los anteriores. | ✅ Hecho |
| 4 | Precios y clientes | Precios visibles sin cuenta, aprobación de cuentas y listas de precios por cliente. | ⏸️ **Espera respuesta del cliente** |
| 5 | Condiciones de compra | Mínimo de compra general de **$50.000 (provisorio)**, calculado con los precios de la lista del cliente. En los productos con bulto, el cliente elige pedir **por caja o por unidad**. | ⏳ Falta programar (etapa 4) |
| 6 | Pagos | Único medio: **transferencia**. El cliente adjunta el comprobante (opcional) y el personal lo acepta (registra el cobro) o lo rechaza con motivo. | ✅ Hecho (faltan los datos bancarios reales) |
| 7 | Entregas | El cliente elige **reparto** o **retiro en el local**. El costo de envío se configura por localidad desde el panel; si la localidad no tiene monto, se muestra "a convenir" y el personal lo carga al confirmar. Sin días de reparto por zona. | ⏳ Falta programar (etapa 4) |
| 8 | Stock | Se descuenta al pasar el pedido a **Confirmado** y se devuelve si sale de los estados con stock. Solo afecta a productos con "controla stock". No se puede pedir más de lo disponible. | ✅ Hecho |
| 9 | Gestión interna | **Panel de roles y permisos** (crear roles, tildar permisos). staff pasa a llamarse **Supervisor**. Solo Supervisor y Admin registran cobros. El vendedor solo gestiona pedidos. | ✅ Hecho |
| 10 | Cambios en pedidos | El comprador puede **cancelar mientras el pedido esté en Recibido**, indicando un motivo. No puede editarlo: "Cancelar y volver a armar" devuelve los productos al carrito. | ✅ Hecho |
| — | Datos fiscales y ARCA | Condición de IVA obligatoria; CUIT válido (Consumidor Final acepta DNI). Factura sugerida A/B/C en la gestión. La facturación electrónica queda documentada para más adelante. | ✅ Hecho (falta la condición de IVA de la distribuidora) |

## Etapas

| Etapa | Qué incluye | Estado | Commit |
|---|---|---|---|
| 1. Flujo del pedido | Estado Confirmado, descuento y devolución de stock, cancelación por el comprador y "volver a armar" | ✅ Hecha | `b0cbc0f` |
| 2. Mails | Avisos al personal y al comprador por la API de Brevo (Render gratis bloquea el SMTP) | ✅ Hecha en código | `9e39b18` |
| 3. Pago por transferencia | Datos de la cuenta, comprobantes privados en Cloudinary, aceptar o rechazar, filtros | ✅ Hecha | `628a0d6` |
| 4. Compra | Monto mínimo, selector caja/unidad, reparto o retiro y costo de envío por localidad | ⏳ **Pendiente** | — |
| 5. Permisos por rol | Panel `/admin/permisos`, roles nuevos, staff → Supervisor, precio protegido en la ficha | ✅ Hecha | `ddd0e82` |
| 6. Datos fiscales | Condición de IVA y CUIT/DNI validados, IVA guardado por línea, `docs/facturacion-arca.md` | ✅ Hecha | (este commit) |

Decisiones técnicas tomadas en el camino (se pueden cambiar):

- **Ventas y saldos del panel**: se agregó el permiso "Ver ventas y saldos" (`ventas.ver`) para que esos
  montos sigan siendo solo del admin, como antes. Se le puede tildar a otro rol.
- **Dependencias de permisos**: "Cambiar estados" y "Registrar cobros" traen "Ver pedidos", porque sin él no
  hay pantalla donde usarlos.
- **Importar productos** pide "Editar artículos" y "Cambiar precios", porque también escribe precios.

## Qué queda

### Para programar

1. **Etapa 4 (compra)**: monto mínimo, selector caja/unidad, reparto o retiro, costo de envío por
   localidad con "a convenir" y un permiso nuevo para configurar envíos y mínimo.
2. **Punto 4**, cuando responda el cliente: precios sin cuenta, aprobación de cuentas y listas por cliente.
3. **Facturación electrónica con ARCA**, si se decide facturar desde DistribuCG (guía en
   `docs/facturacion-arca.md`). La configuración ya está preparada en `servidor/src/configuracion_servidor/arca.js`
   con las variables `ARCA_*` (vacías); falta el servicio que pide el CAE, la tabla de facturas y la pantalla.
4. Opcional: abrir los permisos en acciones más finas (ver, crear, editar, eliminar) si el cliente lo pide.

### Datos para completar (no se inventan)

| Dato | Dónde |
|---|---|
| Cuenta para transferencias: titular, banco, CBU, alias y CUIT | `client_config.js` → `transferencia` (hoy dice `[COMPLETAR …]`) |
| Condición de la distribuidora frente al IVA | `fiscal_config.js` → `emisor.condicion_iva` |
| Cuenta de Brevo y correo remitente verificado | Variables de Render: `CLAVE_API_BREVO`, `CORREO_REMITENTE`, `NOMBRE_REMITENTE` |
| Monto mínimo de compra ($50.000 provisorio) | Etapa 4 |
| Dirección y horario del local para retiros | Etapa 4 |
| Costos de envío por localidad | Etapa 4 (se cargan desde el panel) |

### Para revisar al publicar

- Al arrancar, el servidor **cambia la base** sin borrar datos: agrega `nota_pedido.stock_descontado`,
  `nota_pedido_item.iva_porcentaje` y la tabla `nota_pedido_comprobante`, crea los permisos y renombra
  el rol `staff` a `supervisor`. Conviene probarlo antes contra una copia de la base.
- Mientras `client_config.js` diga `[COMPLETAR …]`, los compradores ven ese texto en los datos para transferir.
- Los clientes que ya tenían cuenta tienen que completar su condición de IVA en el próximo pedido.
- El vendedor ya no puede registrar cobros (antes podía).
- Probar con las cuentas reales lo que en los tests está simulado: subir un comprobante a Cloudinary
  y abrirlo con "Ver", y recibir los mails de Brevo.

### Mantenimiento

- El test de navegador "familias y categorías" falla a veces en celular chico. Ya fallaba antes de estas etapas.
- El lint completo del frontend tiene 9 errores en archivos que estas etapas no tocaron
  (indumentaria, carrito, toast, home y tarjetas del panel).
