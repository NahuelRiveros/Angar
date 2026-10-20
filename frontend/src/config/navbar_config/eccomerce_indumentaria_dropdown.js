import { Tags, PackageSearch } from "lucide-react";

// Dropdown de primer nivel (igual forma que adminDropdown
// en sus archivos hermanos) — el gate maestro (catalogConfig.enabled, de
// catalog_config.js) se aplica en main.js, no acá.
export const eccomerceIndumentariaDropdown = {
  id: "eccomerce_indumentaria",
  labelNoAuth: "Catálogo",
  labelAuth: "Catálogo",
  icon: Tags,
  items: [
    {
      label: "Catálogos",
      to: "/admin/catalogos",
      requiereAuth: true,
      modulo: "eccomerce_indumentaria",
      roles: ["admin"],
      icon: Tags,
    },
    {
      label: "Alertas de stock",
      to: "/admin/productos/stock-bajo",
      requiereAuth: true,
      modulo: "eccomerce_indumentaria",
      roles: ["admin"],
      icon: PackageSearch,
    },
  ],
};
