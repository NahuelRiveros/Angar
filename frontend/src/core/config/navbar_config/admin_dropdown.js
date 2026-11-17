import {
  LayoutDashboard,
  Users,
  Megaphone,
  Settings,
  Receipt,
  ShieldCheck,
} from "lucide-react";

// Dropdown de primer nivel con 2 ítems que además tienen `children` (un
// nivel más de anidamiento, ya soportado por navbar_permissions.js). Todo
// en este único archivo, sin importar ítems de otros archivos de navbar_config.
export const adminDropdown = {
  id: "admin",
  labelNoAuth: "Gestión",
  labelAuth: "Gestión",
  icon: LayoutDashboard,
  items: [
    {
      label: "Gestión",
      icon: Users,
      requiereAuth: true,
      permisos: ["usuarios.gestionar", "permisos.gestionar"],
      children: [
        {
          label: "Personal",
          to: "/admin/staffManager",
          requiereAuth: true,
          permisos: ["usuarios.gestionar"],
          icon: Users,
        },
        {
          label: "Roles y permisos",
          to: "/admin/permisos",
          requiereAuth: true,
          permisos: ["permisos.gestionar"],
          icon: ShieldCheck,
        },
      ],
    },
    {
      label: "Configuración",
      icon: Settings,
      requiereAuth: true,
      permisos: ["contenido.editar"],
      children: [
        {
          label: "Banners y promociones",
          to: "/admin/banners",
          requiereAuth: true,
          permisos: ["contenido.editar"],
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
