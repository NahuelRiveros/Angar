import { ReceiptText } from "lucide-react";
import { temasAyudaPedidos } from "./ayuda.js";

// Datos del módulo, sin pantallas (ver modulo_pantallas.jsx).
export const moduloPedidos = {
  codigo: "pedidos",
  icono: ReceiptText,
  menu: {
    panel: [{ id: "mod_pedidos", titulo: "Pedidos", items: [
      { label: "Pedidos", to: "/admin/pedidos", requiereAuth: true, permisos: ["pedidos.ver", "pedidos.gestionar"], icon: ReceiptText },
    ] }],
    cuenta: [{ label: "Mis pedidos", to: "/mis-pedidos", icon: ReceiptText }],
  },
  ayuda: temasAyudaPedidos,
};
