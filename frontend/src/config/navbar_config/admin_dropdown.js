import {
  LayoutDashboard,
  Users,
  Megaphone,
  Settings,
  LayoutTemplate,
  Receipt,
} from "lucide-react";

// Dropdown de primer nivel con 2 ítems que además tienen `children` (un
// nivel más de anidamiento, ya soportado por navbar_permissions.js). Todo
// en este único archivo, sin importar ítems de otros archivos de navbar_config.
export const adminDropdown = {
  id: "admin",
  labelNoAuth: "Admin",
  labelAuth: "Admin",
  icon: LayoutDashboard,
  items: [
    {
      label: "Gestión",
      icon: Users,
      requiereAuth: true,
      roles: ["admin"],
      children: [
        {
          label: "Personal",
          to: "/admin/staffManager",
          requiereAuth: true,
          roles: ["admin"],
          icon: Users,
        },
      ],
    },
    {
      label: "Configuración",
      icon: Settings,
      requiereAuth: true,
      roles: ["admin"],
      children: [
        {
          label: "Contenido del home",
          to: "/admin/home-config",
          requiereAuth: true,
          roles: ["admin"],
          icon: LayoutTemplate,
        },
        {
          label: "Cinta de anuncios",
          to: "/admin/anuncios",
          requiereAuth: true,
          roles: ["admin"],
          icon: Megaphone,
        },
        // {
        //   label: "Mi suscripción",
        //   to: "/admin/suscripcion",
        //   requiereAuth: true,
        //   roles: ["admin"],
        //   icon: Receipt,
        // },
      ],
    },
  ],
};
