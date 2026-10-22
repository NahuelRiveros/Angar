# Relevamiento de mejoras (octubre 2026)

Respuestas del cliente a las preguntas sobre cómo mejorar el sistema, punto por punto,
y el orden en que se van a implementar. Los montos y datos marcados como **provisorio**
o **EJEMPLO** hay que confirmarlos con el cliente antes de publicar.

## Decisiones

| # | Tema | Qué se decidió | Estado |
|---|---|---|---|
| 1 | Avisos de pedidos | Mail a todo el personal con rol de gestión por cada pedido nuevo, además de verlo en el panel. | Decidido |
| 2 | Confirmación al comprador | Mail al hacer el pedido (con el detalle) y en cada cambio de estado. El de cancelación incluye el motivo. | Decidido |
| 3 | Cómo se confirma una compra | Nuevo estado **Confirmado**: Recibido → Confirmado → En preparación → Entregado. Cancelado desde cualquiera de los anteriores. | Decidido |
| 4 | Precios y clientes | Precios visibles sin cuenta, aprobación de cuentas y listas de precios por cliente. | **Pendiente** |
| 5 | Condiciones de compra | Mínimo de compra general de **$50.000 (provisorio)**, calculado con los precios de la lista del cliente. En los productos con bulto, el cliente elige pedir **por caja o por unidad**. | Decidido |
| 6 | Pagos | Único medio: **transferencia**. El cliente puede adjuntar el comprobante (opcional). Staff o admin lo revisan. El pago tiene su propio estado: sin comprobante, comprobante enviado o pagado. | Decidido |
| 7 | Entregas | El cliente elige **reparto** o **retiro en el local**. El costo de envío se configura por localidad desde el panel; si la localidad no tiene monto, se muestra "a convenir" y el personal lo carga al confirmar. Sin días de reparto por zona. | Decidido |
| 8 | Stock | Se descuenta al pasar el pedido a **Confirmado** y se devuelve si se cancela un pedido confirmado. Solo afecta a productos con "controla stock". No se puede pedir más de lo disponible. | Decidido |
| 9 | Gestión interna | **Panel de permisos por rol**. El rol staff pasa a llamarse **Supervisor**. Solo Supervisor y Admin marcan un pago como pagado. El vendedor solo gestiona pedidos (sin stock ni precios). Envíos y mínimo: solo Admin al inicio. | Decidido |
| 10 | Cambios en pedidos | El comprador puede **cancelar mientras el pedido esté en Recibido**, indicando un motivo. No puede editarlo: el botón "Cancelar y volver a armar" devuelve los productos al carrito. | Decidido |

### Facturación con ARCA

Queda para más adelante. Por ahora:

- Se piden y validan los datos fiscales del cliente (CUIT, razón social y condición frente al IVA),
  que el perfil ya tiene.
- Se documenta en `docs/facturacion-arca.md` lo que hará falta para emitir factura electrónica.

## Etapas

Cada etapa se prueba y se revisa antes de pasar a la siguiente.

1. **Flujo del pedido**: estado Confirmado, descuento y devolución de stock, cancelación por el
   comprador y "volver a armar".
2. **Mails**: aviso al personal y al comprador (por la API de Brevo, porque Render gratis bloquea el SMTP).
3. **Pago por transferencia**: datos de la cuenta (EJEMPLO a reemplazar), carga del comprobante,
   estado de pago y revisión por el personal.
4. **Compra**: monto mínimo, selector caja/unidad, reparto o retiro y costos de envío por localidad.
5. **Permisos por rol**: panel de permisos, staff → Supervisor.
6. **Datos fiscales** y documento de ARCA.

Avance: etapas 1 y 3 terminadas; etapa 2 terminada en código, falta cargar las variables de Brevo en Render.

## Pendientes con el cliente

- Punto 4 completo.
- Confirmar el monto mínimo de $50.000.
- Datos reales de la cuenta para transferencias (`client_config.js` → `transferencia`) y dirección y horario del local para retiros.
- Costos de envío por localidad.
- Cuenta de Brevo y correo remitente para los avisos (variables `CLAVE_API_BREVO`, `CORREO_REMITENTE` y `NOMBRE_REMITENTE`).
