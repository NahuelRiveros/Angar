// Formato y reglas de acceso: core/modules/ayuda/ayuda_temas.js.
export const temasAyudaPedidos = [
  {
    id: "mod-pedidos-estados", grupo: "Pedidos", titulo: "Atender un pedido",
    resumen: "Qué significa cada estado y cómo se avanza.",
    palabras: ["confirmar", "cancelar", "entregado", "listo", "reabrir", "whatsapp"], reglas: ["MPE-07", "MPE-08", "MPE-10"], pantalla: "/admin/pedidos",
    secciones: [
      { titulo: "Los pasos", pasos: [
        "Recibido: llegó de la web. Escribile al cliente para confirmar.",
        "Confirmado: ya lo acordaron. Preparalo.",
        "Listo: preparado para retirar o enviar.",
        "Entregado: el cliente ya lo tiene.",
      ] },
      { titulo: "Lo importante", pasos: [
        "Volver atrás, cancelar o reabrir pide un motivo. Queda en el historial con tu nombre.",
        "El pedido guarda el precio del momento en que se hizo: cambiar el producto después no lo modifica.",
      ] },
      { titulo: "Errores comunes", problemas: [
        { problema: "Dice que otra persona cambió el pedido.", solucion: "Alguien lo movió mientras lo tenías abierto. Tocá «Actualizar» y fijate en qué estado quedó antes de seguir." },
        { problema: "No veo los botones para cambiar el estado.", solucion: "Hace falta el permiso «Gestionar pedidos». Pedíselo a quien administra los permisos." },
      ] },
    ],
  },
];
