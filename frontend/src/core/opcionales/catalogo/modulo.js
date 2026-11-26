import { FolderTree, Package } from "lucide-react";
import { temasAyudaCatalogo } from "./ayuda.js";

// Datos del módulo, sin pantallas (ver modulo_pantallas.jsx).
const EDITAR = { requiereAuth: true, permisos: ["catalogo.editar"] };

export const moduloCatalogo = {
  codigo: "catalogo",
  icono: Package,
  menu: {
    links: [{ label: "Catálogo", to: "/catalogo", icon: Package }],
    panel: [{ id: "mod_catalogo", titulo: "Catálogo", items: [
      { label: "Productos", to: "/admin/catalogo/productos", ...EDITAR, icon: Package },
      { label: "Categorías", to: "/admin/catalogo/categorias", ...EDITAR, icon: FolderTree },
    ] }],
  },
  ayuda: temasAyudaCatalogo,
  tienda: {
    catalogo: "/catalogo",
    llamado: { titulo: "¿Buscás algo en particular?", texto: "Mirá todo lo que tenemos." },
    linksFooter: [{ label: "Catálogo", to: "/catalogo", icon: Package }],
  },
};
