// Formato y reglas de acceso: core/modules/ayuda/ayuda_temas.js.
export const temasAyudaStock = [
  {
    id: "mod-stock", grupo: "Stock", titulo: "Controlar el stock",
    resumen: "Cantidades, mínimos, movimientos y pedidos.",
    palabras: ["cantidad", "minimo", "entrada", "salida", "ajuste", "conteo", "agotado", "reponer"], reglas: ["MST-01", "MST-02", "MST-03", "MST-04", "MST-05", "MST-06"], pantalla: "/admin/stock",
    secciones: [
      { titulo: "Cómo funciona", pasos: [
        "Elegí qué opciones controlan stock con «Controlar» y cargá cuántas hay hoy. Las demás siguen con la casilla «Hay stock» del producto.",
        "La cantidad solo cambia con movimientos: Entrada (llegó mercadería), Salida (rotura, venta en el local) o Ajuste (contaste y dejás el número real).",
        "Salidas y ajustes piden motivo. Ningún movimiento se borra: queda quién lo hizo y cuándo.",
        "Al confirmar un pedido se descuenta; si lo cancelás o lo volvés a Recibido, se devuelve.",
        "Con 0 unidades, la web muestra «Sin stock». Nunca muestra la cantidad.",
      ] },
      { titulo: "Errores comunes", problemas: [
        { problema: "No me deja confirmar un pedido.", solucion: "Falta stock de alguna opción: el aviso dice cuál y cuánto hay. Cargá la entrada o hablá con el cliente." },
        { problema: "No puedo tildar «Hay stock» en el producto.", solucion: "Esa opción controla stock: se calcula con la cantidad. Cargá una entrada o dejá de controlarla." },
      ] },
    ],
  },
];
