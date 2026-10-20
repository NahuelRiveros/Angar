import { orderConfig } from "../order_config.js";
import { storefrontConfig } from "../storefront_config.js";
import {
  ShoppingBag,
  LayoutGrid,
  Package,
  ClipboardList,
  Upload,
  Boxes,
  FolderTree,
  Tag,
  Tags,
  Truck,
} from "lucide-react";

// Un link de primer nivel + dos dropdowns para el mismo módulo — mismas
// reglas que adminDropdown y los demás dropdowns en sus archivos hermanos,
// todos dueños de su propio árbol acá adentro. El gate maestro
// (projectModules.eccomerce_distribuidora, de gate_config.js) se aplica en
// main.js, no acá.
//
// Separados por audiencia y función (antes vivían los tres juntos en un
// solo dropdown "Tienda", más un grupo "Administrar" adentro):
//   - eccomerceDistribuidoraCatalogoLink ("Productos"): link directo, un
//     solo destino no amerita un dropdown de un ítem.
//   - eccomerceDistribuidoraDropdown ("Pedidos"): el pedido en curso del
//     cliente y su historial.
//   - eccomerceDistribuidoraAdminDropdown ("Distribuidora · Gestión"):
//     equipo gestionando catálogo y pedidos recibidos.

// "Productos" — link directo al catálogo (mismo filtro roles/modulo que
// un ítem de dropdown, ver navbar_permissions.js: aplica igual a `links`).
export const eccomerceDistribuidoraCatalogoLink = {
  label: "Productos",
  to: "/distribuidora/catalogo",
  requiereAuth: !storefrontConfig.publicCatalog,
  modulo: "eccomerce_distribuidora",
  roles: storefrontConfig.publicCatalog ? [] : ["cliente", "admin", "staff"],
  icon: LayoutGrid,
};

// "Pedidos" — el pedido en curso del cliente y su historial.
export const eccomerceDistribuidoraDropdown = {
  id: "eccomerce_distribuidora",
  labelNoAuth: "Pedidos",
  labelAuth: "Pedidos",
  icon: ShoppingBag,
  items: [
    {
      label: "Carrito",
      to: "/distribuidora/carrito",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: ["cliente", "admin", "staff"],
      icon: ShoppingBag,
    },
    {
      label: "Mis pedidos",
      to: "/distribuidora/mis-pedidos",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: ["cliente", "admin", "staff"],
      icon: ClipboardList,
    },
  ],
};

// "Distribuidora · Gestión" — administración de categorías/productos
// (admin/staff) y de los pedidos recibidos (admin/vendedor, rol acotado
// aparte). El roles de acá arriba es la UNIÓN de ambos, para que el
// dropdown se muestre si el usuario puede ver AL MENOS un ítem — cada ítem
// filtra el suyo.
export const eccomerceDistribuidoraAdminDropdown = {
  id: "eccomerce_distribuidora_admin",
  labelNoAuth: "Distribuidora · Gestión",
  labelAuth: "Distribuidora · Gestión",
  icon: Boxes,
  items: [
    {
      label: "Artículos",
      to: "/distribuidora/admin/productos",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: ["admin", "staff"],
      icon: Package,
    },
    {
      label: "Familias y categorías",
      to: "/distribuidora/admin/categorias",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: ["admin", "staff"],
      icon: FolderTree,
    },
    {
      label: "Marcas",
      to: "/distribuidora/admin/marcas",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: ["admin", "staff"],
      icon: Tag,
    },
    {
      label: "Listas de precios",
      to: "/distribuidora/admin/listas-precio",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: ["admin"],
      icon: Tags,
    },
    {
      label: "Importar productos",
      to: "/distribuidora/admin/importar",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: ["admin", "staff"],
      icon: Upload,
    },
    {
      label: "Notas de pedido",
      to: "/distribuidora/admin/notas-pedido",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: orderConfig.managementRoles,
      icon: ClipboardList,
    },
    {
      // "Artículos a cargar": varios pedidos juntos, por familia, en bultos y sueltos.
      label: "Lista de carga",
      to: "/distribuidora/admin/lista-carga",
      requiereAuth: true,
      modulo: "eccomerce_distribuidora",
      roles: orderConfig.managementRoles,
      icon: Truck,
    },
  ],
};
