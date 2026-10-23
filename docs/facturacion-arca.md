# Facturación electrónica con ARCA (preparación)

DistribuCG **todavía no emite facturas**. Hoy el equipo factura desde el sistema de
gestión del cliente, y la web le indica qué comprobante corresponde a cada pedido.
Este documento reúne lo que ya está listo, lo que falta y cómo encararlo cuando se
decida facturar desde acá. Los datos de ARCA (normas, códigos y servicios) hay que
**confirmarlos con el contador y con la documentación vigente de ARCA** antes de
programar: cambian con el tiempo.

## Lo que ya está listo

| Dato | Dónde | Notas |
| --- | --- | --- |
| Condición frente al IVA del cliente | `perfil_cliente_distribuidora.condicion_iva`, copiada en `nota_pedido` | Obligatoria desde la etapa 6. Valores en `fiscal_config.js` |
| CUIT o DNI del cliente | `perfil_cliente_distribuidora.cuit` (y copia en `nota_pedido.cuit`) | CUIT validado con dígito verificador y guardado como `20-12345678-6`; DNI (solo consumidor final) guardado como números |
| Razón social | `razon_social` en perfil y pedido | Vacía = factura a nombre y apellido de la persona |
| Precio de cada línea | `nota_pedido_item.precio_unitario` y `subtotal` | **Precio final, con IVA incluido** |
| Alícuota de IVA de cada línea | `nota_pedido_item.iva_porcentaje` | Se guarda desde la etapa 6; los pedidos anteriores la tienen en `null` |
| Tipo de factura que corresponde | `tipoFacturaSugerida()` en `fiscal_config.js` | A, B o C según la condición de la distribuidora y la del cliente |
| Código de condición IVA para ARCA | `codigoArca` en `fiscalConfig.condicionesIva` | Responsable Inscripto 1, Exento 4, Consumidor Final 5, Monotributo 6. Confirmar con `FEParamGetCondicionIvaReceptor` |

**Falta completar ya** (sin programar): `fiscalConfig.emisor.condicion_iva` con la condición
de la distribuidora. Mientras esté en `null`, la gestión no muestra "Factura A/B/C".

## Qué hace falta en ARCA (lo hace el cliente o su contador)

1. **Clave fiscal nivel 3** del titular de la CUIT de la distribuidora.
2. **Certificado digital** para los servicios web: generar una clave privada y un pedido
   de certificado (CSR), y darlo de alta en "Administración de Certificados Digitales".
   Hay uno para **homologación** (pruebas) y otro para **producción**.
3. Autorizar ese certificado para el servicio **wsfe** (factura electrónica) en el
   "Administrador de Relaciones de Clave Fiscal".
4. Crear un **punto de venta** del tipo "Factura electrónica - Web Services". Tiene que
   ser distinto del que use el sistema de gestión actual: la numeración es por punto de venta.

## Cómo funciona el servicio (resumen técnico)

- **WSAA** (autenticación): con el certificado se firma un pedido y ARCA devuelve un
  ticket de acceso (token y firma) que dura unas horas. Conviene guardarlo en memoria y
  renovarlo al vencer, no pedir uno por factura.
- **WSFEv1** (factura electrónica, mercado interno):
  - `FECompUltimoAutorizado`: último número emitido para ese punto de venta y tipo.
  - `FECAESolicitar`: pide la autorización. Devuelve el **CAE** y su fecha de vencimiento.
  - `FEParamGet...`: tablas de códigos (tipos de comprobante, documentos, alícuotas y condiciones de IVA).
- Códigos que se van a usar (confirmar con las tablas `FEParamGet...`):
  - Tipo de comprobante: Factura A = 1, Factura B = 6, Factura C = 11
    (notas de crédito: A = 3, B = 8, C = 13).
  - Tipo de documento: CUIT = 80, DNI = 96, sin identificar = 99.
  - Alícuotas de IVA: 0 % = 3, 10,5 % = 4, 21 % = 5, 27 % = 6.
  - Concepto: 1 = productos.
- La condición frente al IVA del receptor se informa en cada comprobante
  (`CondicionIVAReceptorId`). Verificar en la norma vigente desde cuándo es obligatoria.
- El PDF de la factura tiene que llevar el **código QR** que define ARCA.

## Cálculo de importes

Los precios guardados son **finales**. Para cada alícuota de un pedido:

```
neto  = redondeo(subtotal / (1 + iva_porcentaje / 100), 2)
iva   = subtotal - neto
```

- **Factura A y B**: se informan neto e IVA por alícuota (en la B el IVA no se muestra
  separado en el papel, pero sí viaja en el servicio).
- **Factura C** (emisor monotributista o exento): sin discriminar IVA; el neto es el total.
- La suma de netos más IVA tiene que coincidir **al centavo** con el total; ajustar el
  redondeo en la última alícuota.
- La web ya tiene esta cuenta en `frontend/src/modules/eccomerce_distribuidora/utils/precio_iva.js`
  (`precioSinIva`). Para facturar conviene llevarla a un archivo compartido de la raíz,
  como `fiscal_config.js`, y probarla con casos de redondeo.

## Lo que falta programar

1. **Variables de entorno** (nombres propuestos; los valores nunca van al repositorio):
   - `ARCA_CUIT_EMISOR`: CUIT de la distribuidora.
   - `ARCA_PUNTO_VENTA`: número del punto de venta para Web Services.
   - `ARCA_CERTIFICADO_PEM` y `ARCA_CLAVE_PRIVADA_PEM`: certificado y clave, en base64.
   - `ARCA_PRODUCCION`: `false` usa homologación.
2. **Tabla de facturas** (una fila por comprobante, nunca se borra):

   | Columna | Contenido |
   | --- | --- |
   | `nota_pedido_id` | Pedido facturado |
   | `tipo`, `punto_venta`, `numero` | Ej. 6, 3, 152 → Factura B 0003-00000152 (único) |
   | `cae`, `cae_vencimiento` | Lo que devuelve ARCA |
   | `doc_tipo`, `doc_numero`, `condicion_iva_receptor` | Copia del cliente al facturar |
   | `neto`, `iva`, `total`, `detalle_iva` (JSON por alícuota) | Importes informados |
   | `estado` | `emitida`, `rechazada` (con observaciones) |
   | `emitida_por`, `emitida_en`, `respuesta` | Auditoría |

3. **Servicio y pantalla**: botón "Emitir factura" en la tarjeta del pedido, con un permiso
   nuevo en `permisos_config.js` (por ejemplo `facturas.emitir`).
4. **Reintentos seguros**: si la respuesta no llega, antes de pedir otro CAE consultar
   `FECompUltimoAutorizado` y el comprobante, para no emitir dos veces el mismo pedido
   (mismo criterio de idempotencia que los cobros).
5. **Notas de crédito** para pedidos facturados que después se cancelan o se corrigen.
6. **PDF con QR** y envío por mail al cliente (los avisos de la etapa 2 ya mandan correos).

## Decisiones pendientes con el cliente

- ¿Se factura desde DistribuCG o se sigue con el sistema de gestión actual?
- ¿En qué momento se emite: al confirmar, al entregar o al cobrar?
- ¿Qué pasa con los pedidos anteriores a la etapa 6, que no guardaron la alícuota?
- Condición de la distribuidora frente al IVA, para completar `fiscalConfig.emisor`.
