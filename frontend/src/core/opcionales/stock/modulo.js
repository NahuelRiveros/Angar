import { Boxes } from "lucide-react";
import { temasAyudaStock } from "./ayuda.js";

// Datos del módulo, sin pantallas (ver modulo_pantallas.jsx).
export const moduloStock = {
  codigo: "stock",
  icono: Boxes,
  menu: {
    panel: [{ id: "mod_stock", titulo: "Stock", items: [
      { label: "Stock", to: "/admin/stock", requiereAuth: true, permisos: ["stock.mover"], icon: Boxes },
    ] }],
  },
  ayuda: temasAyudaStock,
};
