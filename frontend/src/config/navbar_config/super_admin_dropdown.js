import { Shield, KeyRound, ToggleLeft } from "lucide-react";

// Sin ítems de un rubro acá adentro. Sin `modulo:` en ninguno
// de los dos — tienen que seguir accesibles aunque todo lo demás esté
// apagado, para poder volver a prenderlo desde /super-admin/modulos.
export const superAdminDropdown = {
  id: "super_admin",
  labelNoAuth: "Sistema",
  labelAuth: "Sistema",
  icon: Shield,
  items: [
    {
      label: "Suscripción del sistema",
      to: "/super-admin/suscripcion",
      requiereAuth: true,
      roles: ["super_admin"],
      icon: KeyRound,
    },
    {
      // Togglea en vivo (tabla modulo_negocio) los módulos que ya están
      // habilitados en gate_config.js — ver comentario en main.js.
      label: "Módulos habilitados",
      to: "/super-admin/modulos",
      requiereAuth: true,
      roles: ["super_admin"],
      icon: ToggleLeft,
    },
  ],
};
