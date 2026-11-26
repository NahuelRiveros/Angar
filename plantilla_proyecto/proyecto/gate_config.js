// Qué tiene este proyecto. true prende el módulo entero (tablas, rutas, menús y permisos); false lo
// oculta sin borrar datos. Los módulos opcionales vienen con el core (core/modulos_opcionales.js).
// Los rubros propios se suman al final con el código de su carpeta. Ejemplo: mi_rubro: true.
export const projectModules = {
  catalogo:      false, // Categorías, marcas, productos, variantes y fotos.
  stock:         false, // Cantidades, mínimos y movimientos. Necesita: catalogo.
  pedidos:       false, // Carrito, pedidos, estados y seguimiento. Necesita: catalogo.
  cobros:        false, // Pagos parciales, transferencias y comprobantes. Necesita: pedidos. Todavía no disponible.
  turnos:        false, // Horarios, cupos, agenda y seguimiento. Todavía no disponible.
  suscripciones: false, // Planes, vencimientos y pagos de socios. Todavía no disponible.
};
