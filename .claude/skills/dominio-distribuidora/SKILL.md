---
name: dominio-distribuidora
description: Aplica las reglas de catálogo, presentaciones, carrito, notas de pedido, estados y cobros manuales de DistribuCG.
---

# Dominio de distribuidora

Leer docs/distribuidora-pedidos.md, client_config.js, order_config.js y los servicios afectados.
Estos son los contratos del negocio; no trasladar reglas de membresías o kiosco del gimnasio.

- Catálogo público según clientConfig; productos con presentaciones/variedades.
  Verificar precios, IVA, disponibilidad y cantidades en servidor, sin confiar en el total del cliente.
- Carrito invitado en navegador; al iniciar sesión se fusiona con el de cuenta.
  Mantener adapters, escrituras serializadas y límites de cantidad.
- Enviar crea una nota con snapshot de productos, importes y entrega y vacía el carrito
  en la misma transacción. Cambios posteriores del producto/perfil no alteran ese snapshot.
- Una nota no reserva ni descuenta stock. No introducir ese efecto como refactor.
- Fusión, envío y cobro usan clave de idempotencia; reintentar la misma operación no duplica datos.
  No borrar registros de operacion_carrito como mantenimiento rutinario.
- Estados internos: pendiente, en_curso, entregado, cancelada; etiquetas/transiciones en orderConfig.
  Retrocesos, cancelación y reapertura requieren motivo según esa configuración.
  Preservar auditoría y expectedState para detectar acciones concurrentes.
- Cobro separado del estado comercial: permite entrega a cuenta por defecto.
  paymentRequiredStates exige algún cobro, no necesariamente pago total.
- Cobros manuales registran dinero ya recibido. No hay pasarela en este flujo.
  No exceder saldo ni agregar cobros a una nota cancelada; anular requiere motivo
  y no devuelve dinero. Conservar los registros de auditoría.
- Gestión por roles configurados; cada cliente solo accede a sus recursos.

Resolver ambigüedades con código y documentación. Si falta una decisión comercial, preguntar
solo por esa decisión y avanzar en lo independiente. Verificar cambios de reglas con casos
válidos, rechazo y reintentos/concurrencia cuando afecten dinero o pedidos.
